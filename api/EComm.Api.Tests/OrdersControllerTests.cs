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
                    ["nets-easy"] = new PaymentSurcharge { Sku = "CARD-FEE", TaxClassId = "tc1", Amount = 5m }
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
            ShippingAddress = new Address { Street = "Main 1", City = "City", PostalCode = "00000", Country = country }
        };

        var result = controller.CreateOrder(request, "tenant-a", marketId);
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
}
