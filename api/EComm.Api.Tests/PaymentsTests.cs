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
    /// <summary>
    /// A market taxed the way a real one is: the active provider's surcharge names a tax class, and
    /// that class's rate (25%, or a country override) is what the provider must report per line.
    /// </summary>
    private static MarketSettings TaxedMarketSettings(List<CountryTaxRate>? countryRates = null) =>
        new()
        {
            PaymentProvider = "nets-easy",
            PaymentSurcharges = new() { ["nets-easy"] = new PaymentSurcharge { TaxClassId = "tc-standard" } },
            TaxClasses = [new TaxClass { Id = "tc-standard", Name = "Standard", DefaultRate = 0.25m, CountryRates = countryRates }]
        };

    private static PaymentCreationContext ContextWith(string? secretKey, CustomerInfo? customer = null, Address? shipping = null, JsonElement? settingsJson = null, string webhookUrl = "", MarketSettings? marketSettings = null)
    {
        var order = new Order
        {
            Id = "o1",
            OrderNumber = "ORD-1",
            MarketId = "m1",
            Subtotal = 10.00m,
            Tax = 2.50m,
            ShippingCost = 5.00m,
            Total = 17.50m,
            Items = { new OrderItem { ProductId = "p1", Sku = "sku-1", ProductName = "Widget", Quantity = 1, UnitPrice = 10.00m, Subtotal = 10.00m } },
            Customer = customer ?? new CustomerInfo(),
            ShippingAddress = shipping ?? new Address()
        };
        var market = new Market { Id = "m1", Currency = "USD", Settings = marketSettings ?? TaxedMarketSettings() };
        settingsJson ??= JsonSerializer.SerializeToElement(new
        {
            testSecretKey = secretKey,
            testMode = true,
            continueUrl = "https://shop.example/continue",
            cancelUrl = "https://shop.example/cancel",
            termsUrl = "https://shop.example/terms"
        });
        return new PaymentCreationContext
        {
            Order = order,
            Market = market,
            ProviderSettingsJson = settingsJson,
            // Read out of the same bag the pipeline reads it from, so a settings-shape change can't
            // pass here and fail in production.
            Common = PaymentSettings.Read<PaymentCommonSettings>(settingsJson),
            WebhookUrl = webhookUrl
        };
    }

    [Fact]
    public async Task CreatePaymentAsync_TaxesTheGoodsLines_InsteadOfSendingATaxLine()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "pay_1", HostedPaymentPageUrl = "https://pay" });
        var provider = new NetsEasyPaymentProvider(nets);

        var result = await provider.CreatePaymentAsync(ContextWith("secret"));

        Assert.NotNull(result);
        Assert.Equal("pay_1", result!.PaymentId);
        Assert.Equal("https://pay", result.RedirectUrl);

        var req = nets.LastRequest!;
        Assert.Equal("HostedPaymentPage", req.Checkout.IntegrationType);
        Assert.Equal(1750, req.Order.Amount);                       // 17.50 → minor units
        Assert.Equal(2, req.Order.Items.Count);                     // widget + shipping, no "tax" product
        Assert.DoesNotContain(req.Order.Items, i => i.Reference == "tax");

        var widget = req.Order.Items.Single(i => i.Reference == "sku-1");
        Assert.Equal(1000, widget.NetTotalAmount);
        Assert.Equal(2500, widget.TaxRate);                         // 25% from the provider's tax class
        Assert.Equal(250, widget.TaxAmount);
        Assert.Equal(1250, widget.GrossTotalAmount);

        // Shipping is untaxed in this platform, so its line claims no rate at all.
        var shipping = req.Order.Items.Single(i => i.Reference == "shipping");
        Assert.Equal(500, shipping.GrossTotalAmount);
        Assert.Null(shipping.TaxRate);
        Assert.Null(shipping.TaxAmount);

        // Nets contract: order.amount must equal the sum of item gross totals.
        Assert.Equal(req.Order.Amount, req.Order.Items.Sum(i => i.GrossTotalAmount));
    }

    [Fact]
    public async Task CreatePaymentAsync_TaxRateComesFromTheProvidersTaxClass()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "pay_1", HostedPaymentPageUrl = "https://pay" });
        var provider = new NetsEasyPaymentProvider(nets);
        // The class carries a country override for where the order ships, so that rate must win.
        var settings = TaxedMarketSettings([new CountryTaxRate { CountryCode = "SE", Rate = 0.12m }]);

        await provider.CreatePaymentAsync(ContextWith("secret", shipping: new Address { Country = "SE" }, marketSettings: settings));

        Assert.Equal(1200, nets.LastRequest!.Order.Items.Single(i => i.Reference == "sku-1").TaxRate);
    }

    [Fact]
    public async Task CreatePaymentAsync_MapsPaymentFeeAsOneTaxedLine()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "pay_2", HostedPaymentPageUrl = "https://pay" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret");
        ctx.Order.PaymentFee = 5.00m;
        ctx.Order.PaymentFeeTax = 1.25m;
        ctx.Order.Total += ctx.Order.PaymentFee + ctx.Order.PaymentFeeTax;

        await provider.CreatePaymentAsync(ctx);

        var req = nets.LastRequest!;
        var fee = req.Order.Items.Single(i => i.Reference == "payment-fee");
        Assert.Equal(500, fee.NetTotalAmount);
        Assert.Equal(2500, fee.TaxRate);
        Assert.Equal(125, fee.TaxAmount);
        Assert.Equal(625, fee.GrossTotalAmount);
        Assert.DoesNotContain(req.Order.Items, i => i.Reference == "payment-fee-tax");
        Assert.Equal(req.Order.Amount, req.Order.Items.Sum(i => i.GrossTotalAmount));
    }

    /// <summary>
    /// Per-line rounding of the rate would give 3 + 3 = 6 minor units against an order tax of 5, and
    /// Nets rejects order.amount != sum(grossTotalAmount) — so the order's tax is allocated, not
    /// recomputed.
    /// </summary>
    [Fact]
    public async Task CreatePaymentAsync_AllocatesOrderTaxAcrossLines_WithoutDrift()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "pay_4", HostedPaymentPageUrl = "https://pay" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret");
        ctx.Order.Items =
        [
            new OrderItem { ProductId = "p1", Sku = "sku-1", ProductName = "A", Quantity = 1, UnitPrice = 0.10m, Subtotal = 0.10m },
            new OrderItem { ProductId = "p2", Sku = "sku-2", ProductName = "B", Quantity = 1, UnitPrice = 0.10m, Subtotal = 0.10m }
        ];
        ctx.Order.Subtotal = 0.20m;
        ctx.Order.Tax = 0.05m;      // round(0.20 * 25%) at order level
        ctx.Order.ShippingCost = 0m;
        ctx.Order.Total = 0.25m;

        await provider.CreatePaymentAsync(ctx);

        var req = nets.LastRequest!;
        Assert.Equal(5, req.Order.Items.Sum(i => i.TaxAmount ?? 0));
        Assert.Equal(25, req.Order.Amount);
        Assert.Equal(req.Order.Amount, req.Order.Items.Sum(i => i.GrossTotalAmount));
        // Every line still satisfies Nets' own gross = net + tax rule.
        Assert.All(req.Order.Items, i => Assert.Equal(i.NetTotalAmount + (i.TaxAmount ?? 0), i.GrossTotalAmount));
    }

    [Fact]
    public async Task CreatePaymentAsync_NoPaymentFee_OmitsFeeLines()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "pay_3", HostedPaymentPageUrl = "https://pay" });
        var provider = new NetsEasyPaymentProvider(nets);

        await provider.CreatePaymentAsync(ContextWith("secret"));

        var req = nets.LastRequest!;
        Assert.DoesNotContain(req.Order.Items, i => i.Reference == "payment-fee");
        Assert.DoesNotContain(req.Order.Items, i => i.Reference == "payment-fee-tax");
    }

    [Fact]
    public async Task CreatePaymentAsync_NoSecretKey_ReturnsNull()
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        Assert.Null(await provider.CreatePaymentAsync(ContextWith(null)));
    }

    [Fact]
    public async Task CreatePaymentAsync_OmitsMerchantTermsUrlAndNumber_WhenNotConfigured()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);

        await provider.CreatePaymentAsync(ContextWith("secret"));

        Assert.Null(nets.LastRequest!.Checkout.MerchantTermsUrl);
        Assert.Null(nets.LastRequest.MerchantNumber);
    }

    [Fact]
    public async Task CreatePaymentAsync_SendsTheCommonUrlsToTheCheckout()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);

        await provider.CreatePaymentAsync(ContextWith("secret"));

        var checkout = nets.LastRequest!.Checkout;
        Assert.Equal("https://shop.example/continue", checkout.ReturnUrl);   // Continue URL → Nets' returnUrl
        Assert.Equal("https://shop.example/cancel", checkout.CancelUrl);
        Assert.Equal("https://shop.example/terms", checkout.TermsUrl);
    }

    [Theory]
    // Nets takes the language on the hosted page's URL, not in the create-payment body.
    [InlineData("https://pay.nets/hpp", "sv-SE", "https://pay.nets/hpp?language=sv-SE")]
    [InlineData("https://pay.nets/hpp?id=42", "da-DK", "https://pay.nets/hpp?id=42&language=da-DK")]
    [InlineData("https://pay.nets/hpp", "", "https://pay.nets/hpp")]
    public async Task CreatePaymentAsync_AppendsConfiguredLanguageToTheRedirectUrl(string hostedUrl, string language, string expected)
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = hostedUrl });
        var provider = new NetsEasyPaymentProvider(nets);
        var settingsJson = JsonSerializer.SerializeToElement(new { testSecretKey = "secret", testMode = true, language });

        var result = await provider.CreatePaymentAsync(ContextWith("secret", settingsJson: settingsJson));

        Assert.Equal(expected, result!.RedirectUrl);
    }

    [Fact]
    public async Task CreatePaymentAsync_PassesMerchantTermsUrlAndNumber_WhenConfigured()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var settingsJson = JsonSerializer.SerializeToElement(new
        {
            testSecretKey = "secret",
            testMode = true,
            merchantTermsUrl = "https://shop.example/privacy",
            merchantNumber = "100024852"
        });

        await provider.CreatePaymentAsync(ContextWith("secret", settingsJson: settingsJson));

        Assert.Equal("https://shop.example/privacy", nets.LastRequest!.Checkout.MerchantTermsUrl);
        Assert.Equal("100024852", nets.LastRequest.MerchantNumber);
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
    public async Task CreatePaymentAsync_IncompleteAddress_OmitsAddressButKeepsTheRest()
    {
        // Nets needs addressLine1 + postalCode + city + alpha-3 country; given a partial address it
        // discards the whole consumer block, which is what shows up as an empty checkout.
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret",
            new CustomerInfo { FullName = "John Doe", Email = "john@example.com" },
            new Address { Street = "Main 1", City = "Stockholm" });   // no postal code, no country

        await provider.CreatePaymentAsync(ctx);

        var consumer = nets.LastRequest!.Checkout.Consumer!;
        Assert.Null(consumer.ShippingAddress);
        Assert.Equal("john@example.com", consumer.Email);
        Assert.Equal("John", consumer.PrivatePerson!.FirstName);
    }

    [Theory]
    [InlineData("+46 70 123 45 67", "SE", "+46", "701234567")]
    [InlineData("0046701234567", "SE", "+46", "701234567")]
    [InlineData("070-123 45 67", "SE", "+46", "701234567")]   // local format → country's code
    [InlineData("+358 40 1234567", "FI", "+358", "401234567")] // 3-digit code must not be read as 2
    [InlineData("+999 123 4567", "SE", null, null)]            // unknown code → omitted, not guessed
    [InlineData("070-123 45 67", "ZZ", null, null)]            // unknown country → omitted
    [InlineData("", "SE", null, null)]
    public async Task CreatePaymentAsync_MapsPhoneOrOmitsIt(string phone, string country, string? prefix, string? number)
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret",
            new CustomerInfo { FullName = "John Doe", Email = "john@example.com", Phone = phone },
            new Address { Street = "Main 1", City = "Stockholm", PostalCode = "11122", Country = country });

        await provider.CreatePaymentAsync(ctx);

        var mapped = nets.LastRequest!.Checkout.Consumer!.PhoneNumber;
        Assert.Equal(prefix, mapped?.Prefix);
        Assert.Equal(number, mapped?.Number);
    }

    [Fact]
    public async Task CreatePaymentAsync_StripsCharactersNetsRejects()
    {
        // An apostrophe in a surname otherwise fails the entire create-payment call.
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret", new CustomerInfo { FullName = "Sean O'Brien", Email = "s@example.com" });

        await provider.CreatePaymentAsync(ctx);

        Assert.Equal("OBrien", nets.LastRequest!.Checkout.Consumer!.PrivatePerson!.LastName);
    }

    [Fact]
    public async Task CreatePaymentAsync_SendsConsumerTypeAndCountrySoNetsHasFieldsToPrefill()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret",
            new CustomerInfo { FullName = "John Doe", Email = "john@example.com" },
            new Address { Street = "Main 1", City = "Stockholm", PostalCode = "11122", Country = "SE" });

        await provider.CreatePaymentAsync(ctx);

        var checkout = nets.LastRequest!.Checkout;
        Assert.False(checkout.MerchantHandlesConsumerData);
        Assert.Equal("B2C", checkout.ConsumerType!.Default);
        Assert.Contains("B2C", checkout.ConsumerType.SupportedTypes);
        Assert.Contains("B2B", checkout.ConsumerType.SupportedTypes); // both offered so shoppers can switch
        Assert.Equal("SWE", checkout.CountryCode);
    }

    [Fact]
    public async Task CreatePaymentAsync_CompanyOrder_SendsCompanyConsumerAndB2BDefault()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret",
            new CustomerInfo { FullName = "John Doe", Email = "john@example.com", CompanyName = "Acme AB" },
            new Address { Street = "Main 1", City = "Stockholm", PostalCode = "11122", Country = "SE" });

        await provider.CreatePaymentAsync(ctx);

        var checkout = nets.LastRequest!.Checkout;
        Assert.Equal("B2B", checkout.ConsumerType!.Default);
        var consumer = checkout.Consumer!;
        Assert.Equal("Acme AB", consumer.Company!.Name);
        Assert.Equal("John", consumer.Company.Contact!.FirstName); // FullName becomes the contact person
        Assert.Equal("Doe", consumer.Company.Contact.LastName);
        Assert.Null(consumer.PrivatePerson); // mutually exclusive
    }

    [Fact]
    public async Task CreatePaymentAsync_MerchantHandlesConsumerData_OmitsConsumerType()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var settingsJson = JsonSerializer.SerializeToElement(new { testSecretKey = "secret", testMode = true, merchantHandlesConsumerData = true });

        await provider.CreatePaymentAsync(ContextWith("secret", settingsJson: settingsJson));

        Assert.True(nets.LastRequest!.Checkout.MerchantHandlesConsumerData);
        Assert.Null(nets.LastRequest.Checkout.ConsumerType); // Nets ignores it in this mode
    }

    [Fact]
    public async Task CreatePaymentAsync_RegistersEveryHandledEventOnOurWebhookUrl()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);
        var ctx = ContextWith("secret", webhookUrl: "https://tunnel.example/api/v1/payments/webhook/nets-easy");

        var result = await provider.CreatePaymentAsync(ctx);

        var webhooks = nets.LastRequest!.Notifications!.Webhooks;
        Assert.Contains("payment.checkout.completed", webhooks.Select(w => w.EventName));
        Assert.Contains("payment.charge.failed", webhooks.Select(w => w.EventName));
        Assert.All(webhooks, w => Assert.Equal("https://tunnel.example/api/v1/payments/webhook/nets-easy", w.Url));

        // Nets rejects an authorization value that isn't 8-64 alphanumeric characters.
        var authorization = Assert.Single(webhooks.Select(w => w.Authorization).Distinct());
        Assert.Equal(32, authorization.Length);
        Assert.Matches("^[a-zA-Z0-9]+$", authorization);

        // Handed back so the pipeline can verify the webhooks these subscriptions will produce.
        Assert.Equal(authorization, result!.WebhookSecret);
    }

    [Fact]
    public async Task CreatePaymentAsync_NoPublicWebhookUrl_RegistersNoWebhooks()
    {
        var nets = new RecordingNetsEasyClient(new NetsCreatePaymentResult { PaymentId = "p", HostedPaymentPageUrl = "u" });
        var provider = new NetsEasyPaymentProvider(nets);

        var result = await provider.CreatePaymentAsync(ContextWith("secret"));

        Assert.Null(nets.LastRequest!.Notifications);
        Assert.Null(result!.WebhookSecret); // nothing registered ⇒ nothing to verify against
    }

    [Theory]
    [InlineData("payment.created", PaymentState.Initialized)]
    [InlineData("payment.checkout.completed", PaymentState.Authorized)]
    [InlineData("payment.reservation.created.v2", PaymentState.Authorized)]
    [InlineData("payment.charge.created.v2", PaymentState.Captured)]
    [InlineData("payment.reservation.failed", PaymentState.Failed)]
    [InlineData("payment.charge.failed", PaymentState.Failed)]
    [InlineData("payment.cancel.created", PaymentState.Cancelled)]
    [InlineData("payment.refund.completed", PaymentState.Refunded)]
    [InlineData("payment.refund.failed", null)]   // the refund failed, not the payment
    [InlineData("payment.cancel.failed", null)]
    [InlineData("payment.some.other.event", null)]
    public async Task HandleWebhookAsync_MapsEventToState(string eventName, PaymentState? expected)
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        var body = $$$"""{"id":"evt_1","event":"{{{eventName}}}","data":{"paymentId":"pay_abc"}}""";

        var result = Assert.Single(await provider.HandleWebhookAsync(WebhookContextFor(body)));

        Assert.Equal("pay_abc", result.PaymentReference);
        Assert.Equal("evt_1", result.IdempotencyKey);
        Assert.Equal(eventName, result.EventName);
        Assert.Equal(expected, result.NewState);
    }

    [Fact]
    public async Task HandleWebhookAsync_CarriesTheGatewayErrorOnFailureEvents()
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        var body = """
            {"id":"evt_2","event":"payment.charge.failed","data":{"paymentId":"pay_abc",
             "error":{"code":"911","message":"Insufficient funds","source":"Internal"}}}
            """;

        var result = Assert.Single(await provider.HandleWebhookAsync(WebhookContextFor(body)));

        Assert.Equal(PaymentState.Failed, result.NewState);
        Assert.Equal("911", result.Error!.Code);
        Assert.Equal("Insufficient funds (source: Internal)", result.Error.Message);
    }

    [Fact]
    public async Task HandleWebhookAsync_UnparseableBody_YieldsNothing()
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        Assert.Empty(await provider.HandleWebhookAsync(WebhookContextFor("not json")));
    }

    [Theory]
    [InlineData("the-stored-secret", true)]    // Nets echoes what we registered
    [InlineData("something-else", false)]
    [InlineData("", false)]
    public async Task VerifyWebhookAsync_ComparesTheAuthorizationHeaderToTheStoredSecret(string presented, bool expected)
    {
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        var context = WebhookContextFor(
            """{"id":"evt_1","event":"payment.checkout.completed","data":{"paymentId":"pay_abc"}}""",
            authorization: presented,
            storedSecret: "the-stored-secret");

        Assert.Equal(expected, await provider.VerifyWebhookAsync(context));
    }

    [Fact]
    public async Task VerifyWebhookAsync_PaymentWithNoStoredSecret_Passes()
    {
        // Orders created before webhook verification existed must not start failing.
        var provider = new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null));
        var context = WebhookContextFor(
            """{"id":"evt_1","event":"payment.checkout.completed","data":{"paymentId":"pay_abc"}}""",
            storedSecret: null);

        Assert.True(await provider.VerifyWebhookAsync(context));
    }

    private static WebhookContext WebhookContextFor(string body, string? authorization = null, string? storedSecret = null)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        if (authorization != null) httpContext.Request.Headers.Authorization = authorization;

        return new WebhookContext
        {
            Request = httpContext.Request,
            ResolveSettings = _ => new WebhookSettings { PaymentWebhookSecret = storedSecret }
        };
    }
}

public class PaymentStatesTests
{
    [Theory]
    [InlineData("Initialized", PaymentState.Authorized, true)]
    [InlineData("Authorized", PaymentState.Captured, true)]
    [InlineData("Captured", PaymentState.Authorized, false)]   // replayed authorization must not downgrade
    [InlineData("Captured", PaymentState.Captured, true)]      // same state is a harmless no-op
    [InlineData(null, PaymentState.Authorized, true)]
    [InlineData("something-legacy", PaymentState.Authorized, true)]
    public void Advances_OnlyLetsStateMoveForward(string? current, PaymentState incoming, bool expected)
        => Assert.Equal(expected, PaymentStates.Advances(current, incoming));
}

internal class StubProvider : IPaymentProvider
{
    private readonly IReadOnlyList<WebhookResult> _results;

    public StubProvider(string alias, params WebhookResult[] results)
    {
        Alias = alias;
        _results = results;
    }

    public string Alias { get; }
    public PaymentProviderDescriptor Descriptor => new() { Alias = Alias, DisplayName = Alias };
    public Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context) => Task.FromResult<PaymentCreationResult?>(null);
    public Task<IReadOnlyList<WebhookResult>> HandleWebhookAsync(WebhookContext context) => Task.FromResult(_results);
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

public class PaymentCommonSettingsTests
{
    private static PaymentCommonSettings Configured() =>
        new() { ContinueUrl = "https://shop.example/continue/", TermsUrl = "https://shop.example/terms/" };

    [Fact]
    public void Validate_PassesWhenTheRequiredUrlsAreAbsolute() => Assert.Null(Configured().Validate());

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_RejectsAMissingRequiredUrl(string continueUrl)
    {
        var settings = Configured();
        settings.ContinueUrl = continueUrl;
        Assert.Equal("Continue URL is required for this payment provider", settings.Validate());
    }

    [Fact]
    public void Validate_RejectsARelativeUrl()
    {
        // The gateway redirects a browser here, so "/continue/" would fail at the gateway instead.
        var settings = Configured();
        settings.ContinueUrl = "/continue/";
        Assert.Contains("Continue URL must be an absolute URL", settings.Validate());
    }

    [Fact]
    public void Validate_RejectsARelativeOptionalUrl()
    {
        var settings = Configured();
        settings.CancelUrl = "/cancel/";
        Assert.Contains("Cancel URL must be an absolute URL", settings.Validate());
    }

    [Fact]
    public void Validate_AllowsBlankOptionalUrls()
    {
        var settings = Configured();
        settings.CancelUrl = settings.ErrorUrl = settings.MerchantTermsUrl = "";
        Assert.Null(settings.Validate());
    }

    [Fact]
    public void Fields_AreAppendedToEveryProvidersSchema()
    {
        // The descriptor is the schema for rendering, masking and pruning, so the common fields have
        // to be in Fields or Merge would drop them on the next save.
        var descriptor = new PaymentProviderDescriptor
        {
            Alias = "acme",
            ProviderFields = [new() { Key = "apiKey", Type = PaymentFieldType.Secret }]
        };

        Assert.Equal("apiKey", descriptor.Fields[0].Key);
        foreach (var common in PaymentCommonSettings.Fields)
            Assert.Contains(descriptor.Fields, f => f.Key == common.Key);
    }
}

public class PaymentSettingsTests
{
    private static readonly PaymentProviderDescriptor Descriptor = new()
    {
        Alias = "nets-easy",
        ProviderFields =
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

    [Fact]
    public void Merge_DropsStoredKeysTheDescriptorNoLongerDeclares()
    {
        // A field removed from a provider leaves its value behind in every market that ever saved it;
        // the descriptor is the schema, so the stale key must not survive the next save.
        var existing = JsonSerializer.SerializeToElement(
            new { secretApiKey = "live-123", testMode = true, allowRefundingPayments = true });
        var incoming = (JsonObject)JsonNode.Parse("""{"secretApiKey":"","testMode":true}""")!;

        var merged = PaymentSettings.Merge(Descriptor, existing, incoming);

        Assert.False(merged.ContainsKey("allowRefundingPayments"));     // undeclared ⇒ pruned
        Assert.Equal("live-123", merged["secretApiKey"]!.ToString());   // declared secret still preserved
        Assert.True(merged["testMode"]!.GetValue<bool>());
    }
}

/// <summary>DataStore.Instance is a process-wide singleton; tests that call InitializeDatabase must
/// not run concurrently with each other or they race on its shared connection/options. See
/// DataStoreCollection in OrdersControllerTests.cs.</summary>
[Collection("DataStore")]
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

    private static PaymentsController ControllerWithBody(string body, string? authorization = null, IPaymentProvider? provider = null)
    {
        var config = new ConfigurationBuilder().Build();
        var resolver = new PaymentProviderResolver(
            new[] { provider ?? new NetsEasyPaymentProvider(new RecordingNetsEasyClient(null)) },
            config);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        if (authorization != null) httpContext.Request.Headers.Authorization = authorization;
        return new PaymentsController(resolver, config, NullLogger<PaymentsController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }

    private static Order SeedOrder(string paymentReference, string paymentStatus = "Initialized", string? webhookSecret = null, string status = "new")
    {
        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = "tenant-a",
            MarketId = "market-1",
            OrderNumber = $"ORD-{paymentReference}",
            PaymentReference = paymentReference,
            PaymentStatus = paymentStatus,
            PaymentWebhookSecret = webhookSecret,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        DataStore.Instance.AddOrder(order);
        return order;
    }

    private static string EventBody(string eventName, string paymentId, string eventId = "evt_1")
        => $$$"""{"id":"{{{eventId}}}","event":"{{{eventName}}}","data":{"paymentId":"{{{paymentId}}}"}}""";

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
    public async Task HandleWebhook_ChargeCreated_UsesMarketsConfiguredOrderStatus()
    {
        using var connection = InitializeInMemoryDataStore();

        DataStore.Instance.AddMarket(new Market
        {
            Id = "market-1",
            TenantId = "tenant-a",
            Name = "Market 1",
            Currency = "USD",
            Settings = new MarketSettings { OrderStatusAfterPayment = "processing" }
        });
        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = "tenant-a",
            MarketId = "market-1",
            OrderNumber = "ORD-TEST-2",
            PaymentReference = "pay_xyz",
            PaymentStatus = "Initialized",
            Status = "new",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        DataStore.Instance.AddOrder(order);

        var controller = ControllerWithBody("""{"event":"payment.charge.created.v2","data":{"paymentId":"pay_xyz"}}""");
        await controller.HandleWebhook(null);

        var updated = DataStore.Instance.GetOrder(order.Id);
        Assert.Equal("Captured", updated!.PaymentStatus);
        Assert.Equal("processing", updated.Status);
    }

    [Fact]
    public async Task HandleWebhook_UnknownPayment_DoesNotThrow()
    {
        using var connection = InitializeInMemoryDataStore();

        var controller = ControllerWithBody(EventBody("payment.checkout.completed", "pay_does_not_exist"));
        var result = await controller.HandleWebhook(null);

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task HandleWebhook_RedeliveredEvent_IsAppliedOnce()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = SeedOrder("pay_dup");
        var body = EventBody("payment.checkout.completed", "pay_dup", "evt_dup");

        Assert.IsType<OkResult>(await ControllerWithBody(body).HandleWebhook(null));
        var afterFirst = DataStore.Instance.GetOrder(order.Id)!.UpdatedAt;

        // Nets delivers at-least-once; the same event id must be a no-op the second time.
        Assert.IsType<OkResult>(await ControllerWithBody(body).HandleWebhook(null));

        var updated = DataStore.Instance.GetOrder(order.Id)!;
        Assert.Equal("Authorized", updated.PaymentStatus);
        Assert.Equal(afterFirst, updated.UpdatedAt); // untouched by the redelivery
    }

    [Fact]
    public async Task HandleWebhook_OutOfOrderDelivery_DoesNotDowngradeTheState()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = SeedOrder("pay_ooo");

        await ControllerWithBody(EventBody("payment.charge.created.v2", "pay_ooo", "evt_charge")).HandleWebhook(null);
        // A distinct event, so dedup won't catch it — only the state ranking stops the downgrade.
        await ControllerWithBody(EventBody("payment.checkout.completed", "pay_ooo", "evt_completed")).HandleWebhook(null);

        Assert.Equal("Captured", DataStore.Instance.GetOrder(order.Id)!.PaymentStatus);
    }

    [Fact]
    public async Task HandleWebhook_FailureEvent_RecordsTheErrorAndLeavesOrderStatusAlone()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = SeedOrder("pay_fail", status: "new");

        var body = """
            {"id":"evt_fail","event":"payment.charge.failed","data":{"paymentId":"pay_fail",
             "error":{"code":"911","message":"Insufficient funds","source":"Internal"}}}
            """;
        Assert.IsType<OkResult>(await ControllerWithBody(body).HandleWebhook(null));

        var updated = DataStore.Instance.GetOrder(order.Id)!;
        Assert.Equal("Failed", updated.PaymentStatus);
        Assert.Equal("911: Insufficient funds (source: Internal)", updated.PaymentError);
        Assert.Equal("new", updated.Status); // a failed payment doesn't move the order on
    }

    [Fact]
    public async Task HandleWebhook_WrongAuthorizationHeader_IsRejectedAndNotApplied()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = SeedOrder("pay_secured", webhookSecret: "the-registered-secret");

        var result = await ControllerWithBody(
            EventBody("payment.checkout.completed", "pay_secured"),
            authorization: "not-the-secret").HandleWebhook(null);

        Assert.IsType<UnauthorizedResult>(result);
        Assert.Equal("Initialized", DataStore.Instance.GetOrder(order.Id)!.PaymentStatus);
    }

    [Fact]
    public async Task HandleWebhook_CorrectAuthorizationHeader_IsApplied()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = SeedOrder("pay_secured_ok", webhookSecret: "the-registered-secret");

        var result = await ControllerWithBody(
            EventBody("payment.checkout.completed", "pay_secured_ok"),
            authorization: "the-registered-secret").HandleWebhook(null);

        Assert.IsType<OkResult>(result);
        Assert.Equal("Authorized", DataStore.Instance.GetOrder(order.Id)!.PaymentStatus);
    }

    [Fact]
    public async Task HandleWebhook_BatchedEventsForDifferentPayments_AreAllApplied()
    {
        using var connection = InitializeInMemoryDataStore();
        var first = SeedOrder("pay_batch_1");
        var second = SeedOrder("pay_batch_2");

        // Some gateways (Adyen) put several events for different payments in one POST.
        var provider = new StubProvider("batching",
            new WebhookResult { PaymentReference = "pay_batch_1", IdempotencyKey = "a", NewState = PaymentState.Authorized },
            new WebhookResult { PaymentReference = "pay_batch_2", IdempotencyKey = "b", NewState = PaymentState.Captured });

        Assert.IsType<OkResult>(await ControllerWithBody("{}", provider: provider).HandleWebhook("batching"));

        Assert.Equal("Authorized", DataStore.Instance.GetOrder(first.Id)!.PaymentStatus);
        Assert.Equal("Captured", DataStore.Instance.GetOrder(second.Id)!.PaymentStatus);
    }

    [Theory]
    [InlineData(null, "paid")]           // market hasn't configured one → default
    [InlineData("processing", "processing")]  // custom status must still move stock
    public async Task HandleWebhook_SuccessfulPayment_DecrementsStockAndIssuesTracking(
        string? orderStatusAfterPayment, string expectedStatus)
    {
        using var connection = InitializeInMemoryDataStore();

        DataStore.Instance.AddMarket(new Market
        {
            Id = "market-1",
            TenantId = "tenant-a",
            Name = "Market 1",
            Currency = "USD",
            Settings = new MarketSettings { OrderStatusAfterPayment = orderStatusAfterPayment }
        });
        DataStore.Instance.AddProduct(new Product
        {
            Id = "p1",
            TenantId = "tenant-a",
            MarketId = "market-1",
            Name = "Widget",
            Sku = "sku-1",
            StockQuantity = 10,
            Version = 1,
            IsCurrentVersion = true
        });

        var order = SeedOrder("pay_stock");
        order.Items = [new OrderItem { ProductId = "p1", Sku = "sku-1", ProductName = "Widget", Quantity = 3, UnitPrice = 10m, Subtotal = 30m }];
        DataStore.Instance.UpdateOrder(order);

        await ControllerWithBody(EventBody("payment.checkout.completed", "pay_stock")).HandleWebhook(null);

        var updated = DataStore.Instance.GetOrder(order.Id)!;
        Assert.Equal("Authorized", updated.PaymentStatus);
        Assert.Equal(expectedStatus, updated.Status);
        Assert.NotNull(updated.TrackingNumber);
        Assert.Equal(7, DataStore.Instance.GetProducts().First(p => p.Id == "p1" && p.IsCurrentVersion).StockQuantity);
    }

    [Fact]
    public async Task HandleWebhook_NoIdempotencyKey_DedupesOnTheRawBody()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = SeedOrder("pay_nokey");

        // Gateways like Adyen and Mollie send no event id, so the body hash is the dedup key.
        PaymentsController Controller() => ControllerWithBody("""{"same":"body"}""", provider: new StubProvider("keyless",
            new WebhookResult { PaymentReference = "pay_nokey", NewState = PaymentState.Authorized }));

        Assert.IsType<OkResult>(await Controller().HandleWebhook("keyless"));
        var afterFirst = DataStore.Instance.GetOrder(order.Id)!.UpdatedAt;

        Assert.IsType<OkResult>(await Controller().HandleWebhook("keyless"));

        Assert.Equal(afterFirst, DataStore.Instance.GetOrder(order.Id)!.UpdatedAt);
    }
}
