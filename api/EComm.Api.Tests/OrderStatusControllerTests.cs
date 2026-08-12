using EComm.Api.Controllers;
using EComm.Data;
using EComm.Data.Common;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Tenant;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// Deleting a status is guarded by what still points at its *code*, not by whether it was seeded:
/// system defaults are deletable (a tenant that never puts an order "On Hold" shouldn't be stuck with
/// the status), but an order or a market's checkout settings referencing the code blocks it — the
/// payment path writes OrderStatusAfterPayment on every settled order, so a dangling reference there
/// means orders in a status nothing defines. "Reset defaults" is the way back.
/// </summary>
[Collection("DataStore")]
public class OrderStatusControllerTests
{
    [Fact]
    public async Task Delete_SystemDefaultNothingReferences_IsDeleted()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, "on-hold", isSystemDefault: true);

        Assert.IsType<NoContentResult>(await Controller(context).DeleteOrderStatus("status-on-hold", "tenant-a"));
        Assert.Empty(new ECommDbContext(options).OrderStatuses.Where(s => s.Code == "on-hold"));
    }

    [Fact]
    public async Task Delete_StatusUsedByAnOrder_IsRefused()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, "processing", isSystemDefault: true);
        context.Orders.Add(new Order { Id = "order-1", TenantId = "tenant-a", MarketId = "market-1", Status = "processing" });
        context.SaveChanges();

        var result = await Controller(context).DeleteOrderStatus("status-processing", "tenant-a");

        Assert.Contains("in use by orders", Error(result));
        Assert.Single(new ECommDbContext(options).OrderStatuses.Where(s => s.Code == "processing"));
    }

    [Fact]
    public async Task Delete_StatusAMarketSettlesPaymentsInto_IsRefusedAndNamesTheMarket()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, "paid", isSystemDefault: true);
        context.Markets.Add(new Market
        {
            Id = "market-1", TenantId = "tenant-a", Name = "Westbay Trailers", Currency = "SEK",
            Settings = new MarketSettings { OrderStatusAfterPayment = "paid" }
        });
        context.SaveChanges();

        var result = await Controller(context).DeleteOrderStatus("status-paid", "tenant-a");

        Assert.Contains("Westbay Trailers", Error(result));
        Assert.Single(new ECommDbContext(options).OrderStatuses.Where(s => s.Code == "paid"));
    }

    [Fact]
    public async Task ResetDefaults_PutsBackADeletedDefault()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        foreach (var (name, code, color, sort) in DefaultOrderStatuses.GetDefaults())
            AddStatus(context, code, isSystemDefault: true, name: name, color: color, sortOrder: sort);

        await Controller(context).DeleteOrderStatus("status-refunded", "tenant-a");
        await Controller(new ECommDbContext(options)).ResetToDefaults("tenant-a");

        var codes = new ECommDbContext(options).OrderStatuses.Where(s => s.TenantId == "tenant-a").Select(s => s.Code).ToList();
        Assert.Equal(DefaultOrderStatuses.GetDefaults().Count, codes.Count);
        Assert.Contains("refunded", codes);
    }

    private static OrderStatusController Controller(ECommDbContext context) => new(context);

    private static void AddStatus(ECommDbContext context, string code, bool isSystemDefault,
        string? name = null, string color = "#6B7280", int sortOrder = 1)
    {
        context.OrderStatuses.Add(new OrderStatus
        {
            Id = $"status-{code}", TenantId = "tenant-a", Name = name ?? code, Code = code,
            Color = color, SortOrder = sortOrder, IsSystemDefault = isSystemDefault, IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        context.SaveChanges();
    }

    /// <summary>The refusals are anonymous objects (internal to their assembly), so read reflectively.</summary>
    private static string Error(IActionResult result)
    {
        var value = Assert.IsType<BadRequestObjectResult>(result).Value!;
        return (string)value.GetType().GetProperty("error")!.GetValue(value)!;
    }

    private static SqliteConnection InMemoryDb(out DbContextOptions<ECommDbContext> options)
    {
        var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();
        options = new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options;
        using (var context = new ECommDbContext(options))
            context.Database.EnsureCreated();
        DataStore.Instance.InitializeDatabase(options);
        return connection; // keep alive — closing it drops the in-memory db
    }
}
