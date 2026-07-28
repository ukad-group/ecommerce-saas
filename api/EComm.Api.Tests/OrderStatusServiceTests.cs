using EComm.Api.Controllers;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Tenant;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// PUT /orders/{id}/status went through a refactor (its body moved to OrderStatusService so the
/// payment webhook could share it). These pin the side effects that move: stock validation, the
/// decrement on payment, the restore on cancellation, and the tracking number.
/// </summary>
[Collection("DataStore")]
public class OrderStatusServiceTests
{
    [Fact]
    public void UpdateOrderStatus_ToPaid_DecrementsStockAndIssuesTracking()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = Seed(stock: 10, quantity: 3);

        var result = new OrdersController().UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "paid" });

        Assert.IsType<OkObjectResult>(result.Result);
        var updated = DataStore.Instance.GetOrder(order.Id)!;
        Assert.Equal("paid", updated.Status);
        Assert.NotNull(updated.TrackingNumber);
        Assert.Equal(7, Stock());
    }

    [Fact]
    public void UpdateOrderStatus_ToPaidTwice_DecrementsStockOnlyOnce()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = Seed(stock: 10, quantity: 3);
        var controller = new OrdersController();

        controller.UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "paid" });
        controller.UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "paid" });

        Assert.Equal(7, Stock());
    }

    [Fact]
    public void UpdateOrderStatus_InsufficientStock_IsRefused()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = Seed(stock: 2, quantity: 3);

        var result = new OrdersController().UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "paid" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal(2, Stock());                                        // untouched
        Assert.Equal("new", DataStore.Instance.GetOrder(order.Id)!.Status); // and not advanced
    }

    [Fact]
    public void UpdateOrderStatus_PaidThenCancelled_RestoresStock()
    {
        using var connection = InitializeInMemoryDataStore();
        var order = Seed(stock: 10, quantity: 3);
        var controller = new OrdersController();

        controller.UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "paid" });
        controller.UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "cancelled" });

        Assert.Equal(10, Stock());
    }

    [Fact]
    public void UpdateOrderStatus_CustomAfterPaymentStatus_CountsAsSettled()
    {
        // A market whose paid state is called something else still reserves stock — the previous
        // hardcoded "paid" comparison silently skipped these.
        using var connection = InitializeInMemoryDataStore();
        var order = Seed(stock: 10, quantity: 3, orderStatusAfterPayment: "processing");

        new OrdersController().UpdateOrderStatus(order.Id, new UpdateOrderStatusRequest { Status = "processing" });

        Assert.Equal(7, Stock());
        Assert.NotNull(DataStore.Instance.GetOrder(order.Id)!.TrackingNumber);
    }

    private static int? Stock()
        => DataStore.Instance.GetProducts().First(p => p.Id == "p1" && p.IsCurrentVersion).StockQuantity;

    private static Order Seed(int stock, int quantity, string? orderStatusAfterPayment = null)
    {
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
            StockQuantity = stock,
            Version = 1,
            IsCurrentVersion = true
        });

        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = "tenant-a",
            MarketId = "market-1",
            OrderNumber = "ORD-STOCK",
            Status = "new",
            Items = [new OrderItem { ProductId = "p1", Sku = "sku-1", ProductName = "Widget", Quantity = quantity, UnitPrice = 10m, Subtotal = 10m * quantity }],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        DataStore.Instance.AddOrder(order);
        return order;
    }

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
        return connection; // keep alive — closing it drops the in-memory db
    }
}
