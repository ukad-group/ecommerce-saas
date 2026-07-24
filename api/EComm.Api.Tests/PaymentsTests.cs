using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using EComm.Api.Controllers;
using EComm.Payment;
using EComm.Payment.Providers.NetsEasy;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Tenant;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EComm.Api.Tests;

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;
    public HttpRequestMessage? LastRequest { get; private set; }

    public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) => _responder = responder;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        LastRequest = request;
        return Task.FromResult(_responder(request));
    }
}

public class NetsEasyClientTests
{
    [Fact]
    public async Task CreatePaymentAsync_ReturnsPaymentIdAndRedirectUrl()
    {
        var handler = new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = JsonContent.Create(new { paymentId = "pay_123", hostedPaymentPageUrl = "https://test.checkout.dibspayment.eu/pay_123" })
        });
        var client = new NetsEasyClient(new HttpClient(handler), NullLogger<NetsEasyClient>.Instance);

        var result = await client.CreatePaymentAsync("secret-key", true, new NetsCreatePaymentRequest
        {
            Order = new NetsOrder
            {
                Amount = 1000,
                Currency = "USD",
                Items = { new NetsOrderItem { Reference = "sku-1", Name = "Widget", Quantity = 1, UnitPrice = 1000, NetTotalAmount = 1000, GrossTotalAmount = 1000 } }
            },
            Checkout = new NetsCheckout { ReturnUrl = "https://shop/success", CancelUrl = "https://shop/cancel", TermsUrl = "https://shop/terms" }
        });

        Assert.NotNull(result);
        Assert.Equal("pay_123", result!.PaymentId);
        Assert.Equal("https://test.checkout.dibspayment.eu/pay_123", result.HostedPaymentPageUrl);
        Assert.Equal("secret-key", handler.LastRequest!.Headers.GetValues("Authorization").Single());
        Assert.Equal("/v1/payments", handler.LastRequest.RequestUri!.AbsolutePath);
        Assert.Equal("test.api.dibspayment.eu", handler.LastRequest.RequestUri.Host);
    }
}

/// <summary>Records the request it was handed so tests can assert the order→Nets mapping.</summary>
internal class RecordingNetsEasyClient : INetsEasyClient
{
    public NetsCreatePaymentRequest? LastRequest { get; private set; }
    private readonly NetsCreatePaymentResult? _result;
    public RecordingNetsEasyClient(NetsCreatePaymentResult? result) => _result = result;

    public Task<NetsCreatePaymentResult?> CreatePaymentAsync(string secretApiKey, bool testMode, NetsCreatePaymentRequest request)
    {
        LastRequest = request;
        return Task.FromResult(_result);
    }

    public Task<NetsPaymentStatusResponse?> GetPaymentAsync(string secretApiKey, bool testMode, string paymentId)
        => Task.FromResult<NetsPaymentStatusResponse?>(null);
    public Task<NetsChargeResult?> ChargePaymentAsync(string secretApiKey, bool testMode, string paymentId, int amountMinorUnits)
        => Task.FromResult<NetsChargeResult?>(null);
}

public class NetsEasyPaymentProviderTests
{
    private static PaymentCreationContext ContextWith(string? secretKey, CustomerInfo? customer = null, Address? shipping = null)
    {
        var order = new Order
        {
            Id = "o1",
            OrderNumber = "ORD-1",
            MarketId = "m1",
            Tax = 2.00m,
            ShippingCost = 5.00m,
            Total = 17.00m,
            Items = { new OrderItem { ProductId = "p1", Sku = "sku-1", ProductName = "Widget", Quantity = 1, UnitPrice = 10.00m, Subtotal = 10.00m } },
            Customer = customer ?? new CustomerInfo(),
            ShippingAddress = shipping ?? new Address()
        };
        var market = new Market { Id = "m1", Currency = "USD", Settings = new MarketSettings() };
        var settingsJson = secretKey == null
            ? JsonSerializer.SerializeToElement(new { testMode = true })
            : JsonSerializer.SerializeToElement(new { testSecretKey = secretKey, testMode = true });
        return new PaymentCreationContext { Order = order, Market = market, ProviderSettingsJson = settingsJson, ReturnUrl = "r", CancelUrl = "c", TermsUrl = "t" };
    }

    [Fact]
    public async Task CreatePaymentAsync_MapsOrderWithTaxAndShippingLines()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "pay_1", HostedPaymentPageUrl = "https://pay" });
        var provider = new NetsEasyPaymentProvider(nets);

        var result = await provider.CreatePaymentAsync(ContextWith("secret"));

        Assert.NotNull(result);
        Assert.Equal("pay_1", result!.PaymentId);
        Assert.Equal("https://pay", result.RedirectUrl);

        var req = nets.LastRequest!;
        Assert.Equal("HostedPaymentPage", req.Checkout.IntegrationType);
        Assert.Equal(1700, req.Order.Amount);                       // 17.00 → minor units
        Assert.Equal(3, req.Order.Items.Count);                     // widget + tax + shipping
        Assert.Contains(req.Order.Items, i => i.Reference == "tax" && i.GrossTotalAmount == 200);
        Assert.Contains(req.Order.Items, i => i.Reference == "shipping" && i.GrossTotalAmount == 500);
        // Nets contract: order.amount must equal the sum of item gross totals.
        Assert.Equal(req.Order.Amount, req.Order.Items.Sum(i => i.GrossTotalAmount));
    }

    [Fact]
    public async Task CreatePaymentAsync_NoSecretKey_ReturnsNull()
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        Assert.Null(await provider.CreatePaymentAsync(ContextWith(null)));
    }

    [Fact]
    public async Task CreatePaymentAsync_PrefillsConsumerFromOrder()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret",
            new CustomerInfo { FullName = "John Doe", Email = "john@example.com" },
            new Address { Street = "Main 1", City = "Stockholm", PostalCode = "111 22", Country = "SE" });

        await provider.CreatePaymentAsync(ctx);

        var consumer = nets.LastRequest!.Checkout.Consumer!;
        Assert.Equal("john@example.com", consumer.Email);
        Assert.Equal("John", consumer.PrivatePerson!.FirstName);
        Assert.Equal("Doe", consumer.PrivatePerson!.LastName);
        Assert.Equal("Main 1", consumer.ShippingAddress!.AddressLine1);
        Assert.Equal("SWE", consumer.ShippingAddress!.Country);   // alpha-2 SE → alpha-3 SWE
    }

    [Fact]
    public void SuccessOrderStatus_DefaultsToPaid_OrUsesConfigured()
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        using var empty = JsonDocument.Parse("{}");
        Assert.Equal("paid", provider.SuccessOrderStatus(empty.RootElement));
        var cfg = JsonSerializer.SerializeToElement(new { orderStatusAfterPayment = "processing" });
        Assert.Equal("processing", provider.SuccessOrderStatus(cfg));
    }

    [Theory]
    [InlineData("payment.checkout.completed", "Authorized")]
    [InlineData("payment.charge.created.v2", "Captured")]
    [InlineData("payment.some.other.event", null)]
    public async Task HandleWebhookAsync_MapsEventToStatus(string eventName, string? expectedStatus)
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        var body = "{\"event\":\"" + eventName + "\",\"data\":{\"paymentId\":\"pay_abc\"}}";
        var request = new DefaultHttpContext().Request;
        request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));

        var result = await provider.HandleWebhookAsync(request);

        Assert.NotNull(result);
        Assert.Equal("pay_abc", result!.PaymentReference);
        Assert.Equal(expectedStatus, result.NewStatus);
    }
}

internal class StubProvider : IPaymentProvider
{
    public StubProvider(string alias) => Alias = alias;
    public string Alias { get; }
    public PaymentProviderDescriptor Descriptor => new() { Alias = Alias, DisplayName = Alias };
    public Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context) => Task.FromResult<PaymentCreationResult?>(null);
    public Task<WebhookResult?> HandleWebhookAsync(HttpRequest request) => Task.FromResult<WebhookResult?>(null);
    public string? SuccessOrderStatus(JsonElement providerSettings) => null;
}

public class PaymentProviderResolverTests
{
    private static IConfiguration Config(string? defaultProvider = null)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(defaultProvider == null
                ? new Dictionary<string, string?>()
                : new Dictionary<string, string?> { ["Payments:DefaultProvider"] = defaultProvider })
            .Build();

    [Fact]
    public void Resolve_ByAlias_ReturnsMatch()
    {
        var resolver = new PaymentProviderResolver(new[] { new StubProvider("nets-easy"), new StubProvider("other") }, Config());
        Assert.Equal("other", resolver.Resolve("other")!.Alias);
    }

    [Fact]
    public void Resolve_UnknownAlias_ReturnsNull()
    {
        var resolver = new PaymentProviderResolver(new[] { new StubProvider("nets-easy") }, Config());
        Assert.Null(resolver.Resolve("does-not-exist"));
    }

    [Fact]
    public void Resolve_NoAlias_UsesConfiguredDefault()
    {
        var resolver = new PaymentProviderResolver(new[] { new StubProvider("a"), new StubProvider("b") }, Config("b"));
        Assert.Equal("b", resolver.Resolve(null)!.Alias);
    }

    [Fact]
    public void Resolve_NoAlias_FallsBackToSoleProvider()
    {
        var resolver = new PaymentProviderResolver(new[] { new StubProvider("only") }, Config());
        Assert.Equal("only", resolver.Resolve(null)!.Alias);
    }

    [Fact]
    public void Resolve_NoAlias_MultipleProvidersNoDefault_ReturnsNull()
    {
        var resolver = new PaymentProviderResolver(new[] { new StubProvider("a"), new StubProvider("b") }, Config());
        Assert.Null(resolver.Resolve(null));
    }

    [Fact]
    public void ResolveForMarket_UsesMarketSetting()
    {
        var resolver = new PaymentProviderResolver(new[] { new StubProvider("nets-easy"), new StubProvider("acme") }, Config());
        var market = new Market { Id = "m1", Settings = new MarketSettings { PaymentProvider = "acme" } };
        Assert.Equal("acme", resolver.ResolveForMarket(market)!.Alias);
    }
}

public class PaymentSettingsTests
{
    private static readonly PaymentProviderDescriptor Descriptor = new()
    {
        Alias = "nets-easy",
        Fields =
        [
            new() { Key = "secretApiKey", Type = PaymentFieldType.Secret },
            new() { Key = "testMode", Type = PaymentFieldType.Bool }
        ]
    };

    [Fact]
    public void Mask_HidesSecretFieldsButKeepsOthers()
    {
        var stored = JsonSerializer.SerializeToElement(new { secretApiKey = "live-123", testMode = true });
        var masked = PaymentSettings.Mask(Descriptor, stored);

        Assert.Equal(PaymentSettings.SecretMask, masked["secretApiKey"]!.ToString());
        Assert.True(masked["testMode"]!.GetValue<bool>());
    }

    [Fact]
    public void Merge_KeepsExistingSecretWhenIncomingIsMaskOrBlank()
    {
        var existing = JsonSerializer.SerializeToElement(new { secretApiKey = "live-123", testMode = true });
        var incoming = (JsonObject)JsonNode.Parse("""{"secretApiKey":"********","testMode":false}""")!;

        var merged = PaymentSettings.Merge(Descriptor, existing, incoming);

        Assert.Equal("live-123", merged["secretApiKey"]!.ToString());  // secret preserved
        Assert.False(merged["testMode"]!.GetValue<bool>());            // non-secret updated
    }

    [Fact]
    public void Merge_OverwritesSecretWhenNewValueProvided()
    {
        var existing = JsonSerializer.SerializeToElement(new { secretApiKey = "old" });
        var incoming = (JsonObject)JsonNode.Parse("""{"secretApiKey":"new"}""")!;

        var merged = PaymentSettings.Merge(Descriptor, existing, incoming);

        Assert.Equal("new", merged["secretApiKey"]!.ToString());
    }
}

public class PaymentsControllerWebhookTests
{
    private static SqliteConnection InitializeInMemoryDataStore()
    {
        var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options;
        using (var context = new ECommDbContext(options))
        {
            context.Database.EnsureCreated();
        }
        DataStore.Instance.InitializeDatabase(options);
        return connection; // keep alive for the duration of the test — closing it drops the in-memory db
    }

    private static PaymentsController ControllerWithBody(string body)
    {
        var resolver = new PaymentProviderResolver(
            new[] { new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null)) },
            new ConfigurationBuilder().Build());
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        return new PaymentsController(resolver) { ControllerContext = new ControllerContext { HttpContext = httpContext } };
    }

    [Fact]
    public async Task HandleWebhook_CheckoutCompleted_FlipsOrderToAuthorized()
    {
        using var connection = InitializeInMemoryDataStore();

        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = "tenant-a",
            MarketId = "market-1",
            OrderNumber = "ORD-TEST-1",
            PaymentReference = "pay_abc",
            PaymentStatus = "Initialized",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        DataStore.Instance.AddOrder(order);

        // No {provider} segment → default/sole provider (nets-easy) parses the body.
        var controller = ControllerWithBody("""{"event":"payment.checkout.completed","data":{"paymentId":"pay_abc"}}""");
        await controller.HandleWebhook(null);

        var updated = DataStore.Instance.GetOrder(order.Id);
        Assert.Equal("Authorized", updated!.PaymentStatus);
    }

    [Fact]
    public async Task HandleWebhook_UnknownPayment_DoesNotThrow()
    {
        using var connection = InitializeInMemoryDataStore();

        var controller = ControllerWithBody("""{"event":"payment.checkout.completed","data":{"paymentId":"pay_does_not_exist"}}""");
        var result = await controller.HandleWebhook(null);

        Assert.IsType<OkResult>(result);
    }
}
