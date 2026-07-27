using EComm.Api.Controllers;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Tenant;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
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
    /// a country override, and a cart with one $100 line item (no market tax, so totals are easy
    /// to reason about), then creates an order for it. Returns the created order.</summary>
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

    [Fact]
    public void CreateOrder_AppliesSurchargeFee_UsingCountryOverrideRate()
    {
        using var connection = InitializeInMemoryDataStore();

        var order = CreateOrderWithSurcharge("SE");

        Assert.Equal(5m, order.PaymentFee);
        Assert.Equal(1.25m, order.PaymentFeeTax);
        Assert.Equal(order.Subtotal + order.Tax + order.ShippingCost + order.PaymentFee + order.PaymentFeeTax, order.Total);
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
