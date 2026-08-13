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
/// Statuses belong to one market. Deleting one is guarded by what still points at its code *in that
/// market*: an order of that store, or that store's checkout settings — not a sibling store's, which
/// has its own copy. System defaults are deletable (a store that never puts an order "On Hold"
/// shouldn't be stuck with the status); "reset defaults" is the way back.
/// </summary>
[Collection("DataStore")]
public class OrderStatusControllerTests
{
    private const string Trailers = "market-trailers";
    private const string Accessories = "market-accessories";

    [Fact]
    public async Task Delete_SystemDefaultNothingReferences_IsDeleted()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, Trailers, "on-hold");

        Assert.IsType<NoContentResult>(await Controller(context).DeleteOrderStatus($"status-{Trailers}-on-hold", "tenant-a", Trailers));
        Assert.Empty(new ECommDbContext(options).OrderStatuses.Where(s => s.Code == "on-hold"));
    }

    /// <summary>The bug that drove the market scoping: an Accessories order must not lock the status
    /// list of Trailers, and deleting in Trailers must leave Accessories alone.</summary>
    [Fact]
    public async Task Delete_OnlyThisMarketsOrdersAndCopiesCount()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, Trailers, "paid");
        AddStatus(context, Accessories, "paid");
        context.Orders.Add(new Order { Id = "order-1", TenantId = "tenant-a", MarketId = Accessories, Status = "paid" });
        context.SaveChanges();

        // Trailers has no paid order of its own, so its copy goes...
        Assert.IsType<NoContentResult>(await Controller(context).DeleteOrderStatus($"status-{Trailers}-paid", "tenant-a", Trailers));
        // ...and Accessories keeps both its copy and its refusal.
        var accessories = Assert.Single(new ECommDbContext(options).OrderStatuses.Where(s => s.Code == "paid"));
        Assert.Equal(Accessories, accessories.MarketId);

        var refused = await Controller(new ECommDbContext(options))
            .DeleteOrderStatus($"status-{Accessories}-paid", "tenant-a", Accessories);
        Assert.Contains("still use this status", Error(refused));
    }

    /// <summary>The way out of that refusal: say where the orders should land, and they move with it.</summary>
    [Fact]
    public async Task Delete_WithReassignTo_MovesTheOrdersAndDeletes()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, Trailers, "on-hold");
        AddStatus(context, Trailers, "processing");
        context.Orders.Add(new Order { Id = "order-1", TenantId = "tenant-a", MarketId = Trailers, Status = "on-hold" });
        context.Orders.Add(new Order { Id = "order-2", TenantId = "tenant-a", MarketId = Accessories, Status = "on-hold" });
        context.SaveChanges();

        // Without a target the caller is told how many orders it has to place first.
        var conflict = Assert.IsType<ConflictObjectResult>(await Controller(context)
            .DeleteOrderStatus($"status-{Trailers}-on-hold", "tenant-a", Trailers));
        Assert.Equal(1, conflict.Value!.GetType().GetProperty("inUseCount")!.GetValue(conflict.Value));

        // A code no status in this store has is a mistake, not a reason to delete anyway.
        Assert.IsType<BadRequestObjectResult>(await Controller(new ECommDbContext(options))
            .DeleteOrderStatus($"status-{Trailers}-on-hold", "tenant-a", Trailers, reassignTo: "nope"));

        Assert.IsType<NoContentResult>(await Controller(new ECommDbContext(options))
            .DeleteOrderStatus($"status-{Trailers}-on-hold", "tenant-a", Trailers, reassignTo: "processing"));

        var reloaded = new ECommDbContext(options);
        Assert.Empty(reloaded.OrderStatuses.Where(s => s.MarketId == Trailers && s.Code == "on-hold"));
        Assert.Equal("processing", reloaded.Orders.Single(o => o.Id == "order-1").Status);
        // The sibling store's order keeps the code it always had — its own copy of the status still exists.
        Assert.Equal("on-hold", reloaded.Orders.Single(o => o.Id == "order-2").Status);
    }

    [Fact]
    public async Task Delete_StatusThisStoreSettlesPaymentsInto_IsRefused()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        AddStatus(context, Trailers, "paid");
        AddStatus(context, Accessories, "paid");
        AddMarket(context, Trailers, new MarketSettings { OrderStatusAfterPayment = "paid" });
        AddMarket(context, Accessories, new MarketSettings { OrderStatusAfterPayment = "completed" });

        var refused = await Controller(context).DeleteOrderStatus($"status-{Trailers}-paid", "tenant-a", Trailers);
        Assert.Contains("after payment", Error(refused));

        // The sibling store settles into something else, so its copy is free to go.
        Assert.IsType<NoContentResult>(await Controller(new ECommDbContext(options))
            .DeleteOrderStatus($"status-{Accessories}-paid", "tenant-a", Accessories));
    }

    [Fact]
    public async Task Create_SameCodeInTwoMarkets_IsAllowed()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);

        var first = await Controller(context).CreateOrderStatus(
            new DTOs.Requests.OrderStatuses.CreateOrderStatusRequest { Name = "Awaiting Pickup", Code = "awaiting-pickup", Color = "#8B5CF6", SortOrder = 9 },
            "tenant-a", Trailers);
        var second = await Controller(new ECommDbContext(options)).CreateOrderStatus(
            new DTOs.Requests.OrderStatuses.CreateOrderStatusRequest { Name = "Awaiting Pickup", Code = "awaiting-pickup", Color = "#8B5CF6", SortOrder = 9 },
            "tenant-a", Accessories);

        Assert.IsType<CreatedAtActionResult>(first.Result);
        Assert.IsType<CreatedAtActionResult>(second.Result);
        // A third in the same store collides.
        var dupe = await Controller(new ECommDbContext(options)).CreateOrderStatus(
            new DTOs.Requests.OrderStatuses.CreateOrderStatusRequest { Name = "Dup", Code = "awaiting-pickup" },
            "tenant-a", Trailers);
        Assert.IsType<ConflictObjectResult>(dupe.Result);
    }

    [Fact]
    public async Task ResetDefaults_PutsBackADeletedDefault_ForThisMarketOnly()
    {
        using var connection = InMemoryDb(out var options);
        var context = new ECommDbContext(options);
        foreach (var (name, code, color, sort) in DefaultOrderStatuses.GetDefaults())
        {
            AddStatus(context, Trailers, code, name, color, sort);
            AddStatus(context, Accessories, code, name, color, sort);
        }

        await Controller(context).DeleteOrderStatus($"status-{Trailers}-refunded", "tenant-a", Trailers);
        await Controller(new ECommDbContext(options)).DeleteOrderStatus($"status-{Accessories}-refunded", "tenant-a", Accessories);
        await Controller(new ECommDbContext(options)).ResetToDefaults("tenant-a", Trailers);

        var reloaded = new ECommDbContext(options);
        Assert.Contains("refunded", reloaded.OrderStatuses.Where(s => s.MarketId == Trailers).Select(s => s.Code).ToList());
        Assert.DoesNotContain("refunded", reloaded.OrderStatuses.Where(s => s.MarketId == Accessories).Select(s => s.Code).ToList());
    }

    [Fact]
    public async Task Requests_WithoutAMarketHeader_AreRejected()
    {
        using var connection = InMemoryDb(out var options);

        var result = await Controller(new ECommDbContext(options)).GetOrderStatuses("tenant-a", marketId: null);
        Assert.Contains("X-Market-ID", Error(result.Result!));
    }

    private static OrderStatusController Controller(ECommDbContext context) => new(context);

    private static void AddStatus(ECommDbContext context, string marketId, string code,
        string? name = null, string color = "#6B7280", int sortOrder = 1)
    {
        context.OrderStatuses.Add(new OrderStatus
        {
            Id = $"status-{marketId}-{code}", TenantId = "tenant-a", MarketId = marketId,
            Name = name ?? code, Code = code, Color = color, SortOrder = sortOrder,
            IsSystemDefault = true, IsActive = true, CreatedAt = DateTime.UtcNow
        });
        context.SaveChanges();
    }

    private static void AddMarket(ECommDbContext context, string marketId, MarketSettings settings)
    {
        context.Markets.Add(new Market
        {
            Id = marketId, TenantId = "tenant-a", Name = marketId, Code = marketId,
            Currency = "SEK", Settings = settings
        });
        context.SaveChanges();
    }

    /// <summary>The refusals are anonymous objects (internal to their assembly), so read reflectively.</summary>
    private static string Error(IActionResult result)
    {
        var value = Assert.IsType<ObjectResult>(result, exactMatch: false).Value!;
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
