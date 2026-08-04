using EComm.Api.Controllers;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Tenant;
using EComm.Payment;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>DataStore.Instance is a process-wide singleton; any test class that calls
/// InitializeDatabase must share this collection so xunit never runs them concurrently with each
/// other (collections run in parallel with other collections, but tests within one don't).</summary>
public class DataStoreCollectionFixture
{
}

[CollectionDefinition("DataStore")]
public class DataStoreCollection : ICollectionFixture<DataStoreCollectionFixture>
{
}

[Collection("DataStore")]
public class OrdersControllerTests
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

    /// <summary>Seeds a market with an active provider + a configured surcharge + a tax class with
    /// a country override, and a cart with one $100 line item, then creates an order for it. The flat
    /// TaxRate is 0 so that any goods tax seen here provably came from the provider's tax class.
    /// Returns the created order.</summary>
    private static Order CreateOrderWithSurcharge(string country)
    {
        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        return PostOrder(sessionId, marketId, country);
    }

    /// <summary>The seeding half of <see cref="CreateOrderWithSurcharge"/>, split out so the update
    /// tests can post an order and then keep mutating the same cart.</summary>
    private static (string MarketId, string SessionId) SeedMarketWithSurchargeAndCart()
    {
        var marketId = $"market-{Guid.NewGuid()}";
        var sessionId = $"session-{Guid.NewGuid()}";

        DataStore.Instance.AddMarket(new Market
        {
            Id = marketId,
            TenantId = "tenant-a",
            Name = "Test Market",
            Currency = "USD",
            Settings = new MarketSettings
            {
                TaxRate = 0m,
                PaymentProvider = "nets-easy",
                PaymentSurcharges = new Dictionary<string, PaymentSurcharge>
                {
                    ["nets-easy"] = new PaymentSurcharge { TaxClassId = "tc1", Amount = 5m }
                },
                TaxClasses = new List<TaxClass>
                {
                    new()
                    {
                        Id = "tc1",
                        Name = "Standard",
                        DefaultRate = 0.20m,
                        CountryRates = new List<CountryTaxRate> { new() { CountryCode = "SE", Rate = 0.25m } }
                    }
                }
            }
        });

        AddCartLine(sessionId, marketId, 100m);
        return (marketId, sessionId);
    }

    /// <summary>Adds one line of <paramref name="price"/> to the session's cart.</summary>
    private static void AddCartLine(string sessionId, string marketId, decimal price)
    {
        var cart = DataStore.Instance.GetOrCreateCart(sessionId, "tenant-a", marketId);
        cart.Items.Add(new EComm.Data.ValueObjects.Cart.CartItem
        {
            Id = Guid.NewGuid().ToString(),
            ProductId = "prod-1",
            ProductName = "Widget",
            UnitPrice = price,
            Quantity = 1,
            Subtotal = price
        });
        DataStore.Instance.UpdateCart(cart);
    }

    private static CreateOrderRequest OrderRequest(string sessionId, string country) => new()
    {
        SessionId = sessionId,
        Customer = new CustomerInfo { FullName = "Test User", Email = "test@example.com" },
        ShippingAddress = new Address { Street = "Main 1", City = "City", PostalCode = "00000", Country = country }
    };

    private static Order PostOrder(string sessionId, string marketId, string country)
    {
        var result = new OrdersController().CreateOrder(OrderRequest(sessionId, country), "tenant-a", marketId);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<Order>(okResult.Value);
    }

    /// <summary>Saves a surcharge through MarketsController and returns what ended up stored on the
    /// market, so these assert the persisted state rather than the response echo.</summary>
    private static PaymentSurcharge? SaveSurcharge(PaymentSurcharge surcharge)
    {
        var marketId = $"market-{Guid.NewGuid()}";
        DataStore.Instance.AddMarket(new Market
        {
            Id = marketId,
            TenantId = "tenant-a",
            Name = "Test Market",
            Currency = "USD",
            Settings = new MarketSettings()
        });

        var resolver = new PaymentProviderResolver(
            new[] { new StubProvider("nets-easy") },
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build());

        var result = new MarketsController(resolver).SetPaymentSurcharge(marketId, "nets-easy", surcharge);
        Assert.IsType<OkObjectResult>(result);

        var stored = DataStore.Instance.GetMarket(marketId)!.Settings!.PaymentSurcharges;
        return stored != null && stored.TryGetValue("nets-easy", out var s) ? s : null;
    }

    [Fact]
    public void SetPaymentSurcharge_KeepsTaxClassChosenBeforeAnAmountIsEntered()
    {
        using var connection = InitializeInMemoryDataStore();

        // The admin UIs used to only persist a surcharge when amount > 0 and DELETE it otherwise, so
        // picking a tax class and saving silently threw it away and the field reverted to "None".
        var stored = SaveSurcharge(new PaymentSurcharge { TaxClassId = "tc1", Amount = 0m });

        Assert.NotNull(stored);
        Assert.Equal("tc1", stored!.TaxClassId);
        Assert.Equal(0m, stored.Amount);
    }

    [Fact]
    public void SetPaymentSurcharge_StoresNothingWhenEveryFieldIsBlank()
    {
        using var connection = InitializeInMemoryDataStore();

        Assert.Null(SaveSurcharge(new PaymentSurcharge()));
    }

    [Fact]
    public void CreateOrder_AppliesSurchargeFee_UsingCountryOverrideRate()
    {
        using var connection = InitializeInMemoryDataStore();

        var order = CreateOrderWithSurcharge("SE");

        Assert.Equal(5m, order.PaymentFee);
        Assert.Equal(1.25m, order.PaymentFeeTax);
        Assert.Equal(order.Subtotal + order.Tax + order.ShippingCost + order.PaymentFee + order.PaymentFeeTax, order.Total);
    }

    // Goods tax is re-resolved at order time, so the shipping country picks the per-country rate the
    // cart couldn't know about. The market's flat TaxRate is 0 here, so 25% can only be tc1's override.
    [Fact]
    public void CreateOrder_TaxesGoods_UsingActiveProvidersTaxClassAndShippingCountry()
    {
        using var connection = InitializeInMemoryDataStore();

        Assert.Equal(25.00m, CreateOrderWithSurcharge("SE").Tax);
    }

    [Fact]
    public void CreateOrder_GoodsTax_UsesClassDefault_ForCountryWithoutAnOverride()
    {
        using var connection = InitializeInMemoryDataStore();

        Assert.Equal(20.00m, CreateOrderWithSurcharge("US").Tax);
    }

    [Fact]
    public void CreateOrder_FallsBackToDefaultRate_ForNonOverrideCountry()
    {
        using var connection = InitializeInMemoryDataStore();

        var order = CreateOrderWithSurcharge("US");

        Assert.Equal(5m, order.PaymentFee);
        Assert.Equal(1.00m, order.PaymentFeeTax);
    }

    [Fact]
    public void CreateOrder_NoSurchargeConfigured_FeeAndFeeTaxStayZero()
    {
        using var connection = InitializeInMemoryDataStore();

        var marketId = $"market-{Guid.NewGuid()}";
        var sessionId = $"session-{Guid.NewGuid()}";

        DataStore.Instance.AddMarket(new Market
        {
            Id = marketId,
            TenantId = "tenant-a",
            Name = "Test Market",
            Currency = "USD",
            Settings = new MarketSettings { TaxRate = 0m }
        });

        var cart = DataStore.Instance.GetOrCreateCart(sessionId, "tenant-a", marketId);
        cart.Items.Add(new EComm.Data.ValueObjects.Cart.CartItem
        {
            Id = Guid.NewGuid().ToString(),
            ProductId = "prod-1",
            ProductName = "Widget",
            UnitPrice = 100m,
            Quantity = 1,
            Subtotal = 100m
        });
        DataStore.Instance.UpdateCart(cart);

        var controller = new OrdersController();
        var request = new CreateOrderRequest
        {
            SessionId = sessionId,
            Customer = new CustomerInfo { FullName = "Test User", Email = "test@example.com" },
            ShippingAddress = new Address { Street = "Main 1", City = "City", PostalCode = "00000", Country = "US" }
        };

        var result = controller.CreateOrder(request, "tenant-a", marketId);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<Order>(okResult.Value);

        Assert.Equal(0m, order.PaymentFee);
        Assert.Equal(0m, order.PaymentFeeTax);
        Assert.Equal(order.Subtotal + order.Tax + order.ShippingCost, order.Total);
    }

    // ── Update in place (PUT /orders/{id}) ────────────────────────────────────
    // A storefront that re-submits checkout must be able to rebuild the order it already created
    // instead of minting a second one, so these pin the identity/pricing/settled contract.

    private static ActionResult<Order> PutOrder(string orderId, string sessionId, string country)
        => new OrdersController().UpdateOrder(orderId, OrderRequest(sessionId, country));

    private static Order PutOrderOk(string orderId, string sessionId, string country)
    {
        var okResult = Assert.IsType<OkObjectResult>(PutOrder(orderId, sessionId, country).Result);
        return Assert.IsType<Order>(okResult.Value);
    }

    [Fact]
    public void UpdateOrder_KeepsIdOrderNumberAndCreatedAt()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        var created = PostOrder(sessionId, marketId, "SE");

        var updated = PutOrderOk(created.Id, sessionId, "SE");

        Assert.Equal(created.Id, updated.Id);
        Assert.Equal(created.OrderNumber, updated.OrderNumber);
        Assert.Equal(created.CreatedAt, updated.CreatedAt);
        Assert.True(updated.UpdatedAt >= created.UpdatedAt);
        Assert.Equal("pending", updated.Status);

        // And there's still exactly one order — the whole point of updating in place.
        Assert.Single(DataStore.Instance.GetAllOrders(), o => o.MarketId == marketId);
    }

    [Fact]
    public void UpdateOrder_RepricesFromTheCurrentCart()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        var created = PostOrder(sessionId, marketId, "SE");
        Assert.Equal(100m, created.Subtotal);

        // Customer went back and added another item before re-submitting.
        AddCartLine(sessionId, marketId, 50m);
        var updated = PutOrderOk(created.Id, sessionId, "SE");

        Assert.Equal(2, updated.Items.Count);
        Assert.Equal(150m, updated.Subtotal);
        Assert.Equal(37.50m, updated.Tax);          // 150 @ 25% (SE override)
        Assert.Equal(5m, updated.PaymentFee);
        Assert.Equal(1.25m, updated.PaymentFeeTax);
        Assert.Equal(193.75m, updated.Total);
        Assert.Equal(updated.Total, DataStore.Instance.GetOrder(created.Id)!.Total); // persisted
    }

    [Fact]
    public void UpdateOrder_ReResolvesGoodsTax_WhenShippingCountryChanged()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        var created = PostOrder(sessionId, marketId, "US");
        Assert.Equal(20.00m, created.Tax);          // class default

        var updated = PutOrderOk(created.Id, sessionId, "SE");

        Assert.Equal(25.00m, updated.Tax);          // SE country override
        Assert.Equal(1.25m, updated.PaymentFeeTax);
    }

    [Fact]
    public void UpdateOrder_Conflicts_WhenStatusIsSettled()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        var created = PostOrder(sessionId, marketId, "SE");

        var stored = DataStore.Instance.GetOrder(created.Id)!;
        stored.Status = "paid";
        DataStore.Instance.UpdateOrder(stored);

        Assert.IsType<ConflictObjectResult>(PutOrder(created.Id, sessionId, "SE").Result);
    }

    // Money can be reserved before the status catches up, so PaymentStatus alone has to block an update.
    [Fact]
    public void UpdateOrder_Conflicts_WhenPaymentAuthorized_EvenWhileStatusStillPending()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        var created = PostOrder(sessionId, marketId, "SE");

        var stored = DataStore.Instance.GetOrder(created.Id)!;
        stored.PaymentStatus = nameof(PaymentState.Authorized);
        DataStore.Instance.UpdateOrder(stored);
        Assert.Equal("pending", stored.Status);

        Assert.IsType<ConflictObjectResult>(PutOrder(created.Id, sessionId, "SE").Result);
    }

    [Fact]
    public void UpdateOrder_NotFound_ForUnknownId()
    {
        using var connection = InitializeInMemoryDataStore();

        Assert.IsType<NotFoundResult>(PutOrder("does-not-exist", "session-x", "SE").Result);
    }

    [Fact]
    public void UpdateOrder_BadRequest_WhenCartIsEmpty()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        var created = PostOrder(sessionId, marketId, "SE");

        DataStore.Instance.ClearCart(sessionId);

        Assert.IsType<BadRequestObjectResult>(PutOrder(created.Id, sessionId, "SE").Result);
    }

    // An update is not a status change: it must never reserve or release stock (that only happens on a
    // settle transition inside OrderStatusService).
    [Fact]
    public void UpdateOrder_LeavesStockUntouched()
    {
        using var connection = InitializeInMemoryDataStore();

        var (marketId, sessionId) = SeedMarketWithSurchargeAndCart();
        DataStore.Instance.AddProduct(new Product
        {
            Id = "prod-1",
            TenantId = "tenant-a",
            MarketId = marketId,
            Name = "Widget",
            Sku = "sku-1",
            StockQuantity = 7,
            Version = 1,
            IsCurrentVersion = true
        });
        var created = PostOrder(sessionId, marketId, "SE");

        PutOrderOk(created.Id, sessionId, "SE");

        Assert.Equal(7, DataStore.Instance.GetProducts().Single(p => p.Id == "prod-1").StockQuantity);
    }
}
