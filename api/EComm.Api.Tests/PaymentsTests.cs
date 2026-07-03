using System.Net;
using System.Net.Http.Json;
using EComm.Api.Controllers;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Api.Payments;
using EComm.Data;
using EComm.Data.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
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

public class FakeHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;
    public FakeHttpClientFactory(HttpMessageHandler handler) => _handler = handler;
    public HttpClient CreateClient(string name) => new(_handler);
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
        var client = new NetsEasyClient(new FakeHttpClientFactory(handler), NullLogger<NetsEasyClient>.Instance);

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

    [Fact]
    public void HandleWebhook_CheckoutCompleted_FlipsOrderToAuthorized()
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

        var controller = new PaymentsController(new NetsEasyClient(
            new FakeHttpClientFactory(new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK))),
            NullLogger<NetsEasyClient>.Instance));

        controller.HandleWebhook(new NetsWebhookEnvelope
        {
            Event = "payment.checkout.completed",
            Data = new NetsWebhookData { PaymentId = "pay_abc" }
        });

        var updated = DataStore.Instance.GetOrder(order.Id);
        Assert.Equal("Authorized", updated!.PaymentStatus);
    }

    [Fact]
    public void HandleWebhook_UnknownPayment_DoesNotThrow()
    {
        using var connection = InitializeInMemoryDataStore();

        var controller = new PaymentsController(new NetsEasyClient(
            new FakeHttpClientFactory(new FakeHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK))),
            NullLogger<NetsEasyClient>.Instance));

        var result = controller.HandleWebhook(new NetsWebhookEnvelope
        {
            Event = "payment.checkout.completed",
            Data = new NetsWebhookData { PaymentId = "pay_does_not_exist" }
        });

        Assert.IsType<Microsoft.AspNetCore.Mvc.OkResult>(result);
    }
}
