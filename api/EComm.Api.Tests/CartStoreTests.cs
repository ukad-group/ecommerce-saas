using EComm.Api.Controllers;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Cart;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// Carts moved from an in-memory dictionary into SQLite so the backoffice Carts list survives an API
/// restart. The two guarantees that matters buys: an existing ecomm.db gains the table without losing
/// data (repo policy forbids resetting it), and a cart round-trips through a fresh context.
/// </summary>
public class CartSchemaUpgraderTests
{
    [Fact]
    public void EnsureCartSchema_AddsCartsToAPreExistingDatabaseInPlace()
    {
        using var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();

        // An "old" database: Orders exists with a row, Carts does not exist at all.
        Execute(connection, "CREATE TABLE Orders (Id TEXT NOT NULL PRIMARY KEY)");
        Execute(connection, "INSERT INTO Orders (Id) VALUES ('o1')");

        using var context = ContextOver(connection);
        SchemaUpgrader.EnsureCartSchema(context);

        Assert.Equal(0L, Scalar(connection, "SELECT COUNT(*) FROM Carts"));
        Assert.Equal(1L, Scalar(connection, "SELECT COUNT(*) FROM Orders"));   // data preserved
        Assert.Equal(1L, Scalar(connection,
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='IX_Carts_SessionId'"));

        // Runs on every startup, so it has to be repeatable.
        SchemaUpgrader.EnsureCartSchema(context);
        Assert.Equal(1L, Scalar(connection, "SELECT COUNT(*) FROM Orders"));
    }

    [Fact]
    public void EnsureCartSchema_MatchesTheColumnsEfExpects()
    {
        // The hand-written CREATE TABLE and the EF model must not drift apart: a column EF maps but
        // the upgrader forgets would only fail at runtime, on an upgraded database.
        using var upgraded = new SqliteConnection("Filename=:memory:");
        upgraded.Open();
        using (var context = ContextOver(upgraded))
            SchemaUpgrader.EnsureCartSchema(context);

        using var created = new SqliteConnection("Filename=:memory:");
        created.Open();
        using (var context = ContextOver(created))
            context.Database.EnsureCreated();

        Assert.Equal(Columns(created, "Carts"), Columns(upgraded, "Carts"));
    }

    private static ECommDbContext ContextOver(SqliteConnection connection)
        => new(new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options);

    private static void Execute(SqliteConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }

    private static long Scalar(SqliteConnection connection, string sql)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        return (long)cmd.ExecuteScalar()!;
    }

    private static List<string> Columns(SqliteConnection connection, string table)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info({table})";
        using var reader = cmd.ExecuteReader();
        var names = new List<string>();
        while (reader.Read()) names.Add(reader.GetString(1));
        names.Sort(StringComparer.Ordinal);
        return names;
    }
}

[Collection("DataStore")]
public class CartStoreTests
{
    [Fact]
    public void Cart_PersistsAcrossContextsAndIsNotDuplicatedPerSession()
    {
        using var connection = InitializeInMemoryDataStore();

        var cart = DataStore.Instance.GetOrCreateCart("sess-1", "tenant-a", "market-1");
        cart.Items.Add(new CartItem
        {
            Id = "i1", ProductId = "p1", ProductName = "Trailer", UnitPrice = 100m, Quantity = 2, Subtotal = 200m
        });
        DataStore.Instance.UpdateCart(cart);

        // Fresh context (this is the restart the in-memory dictionary could never survive).
        var reloaded = DataStore.Instance.GetOrCreateCart("sess-1", "tenant-a", "market-1");
        Assert.Equal(cart.Id, reloaded.Id);                    // same cart, not a second one
        Assert.Equal(200m, reloaded.Subtotal);
        Assert.Equal("Trailer", Assert.Single(reloaded.Items).ProductName);
        Assert.Single(DataStore.Instance.GetCarts());

        DataStore.Instance.ClearCart("sess-1");
        Assert.Empty(DataStore.Instance.GetCarts());
    }

    [Fact]
    public void GetCarts_ScopesToTheMarketAndPutsRecentActivityFirst()
    {
        using var connection = InitializeInMemoryDataStore();

        DataStore.Instance.GetOrCreateCart("sess-old", "tenant-a", "market-1");
        DataStore.Instance.GetOrCreateCart("sess-new", "tenant-a", "market-1");
        DataStore.Instance.GetOrCreateCart("sess-other", "tenant-a", "market-2");

        // Stamped explicitly rather than relying on wall-clock gaps between the calls above.
        Stamp(connection, "sess-old", "2026-01-01T00:00:00.000");
        Stamp(connection, "sess-new", "2026-08-01T00:00:00.000");

        var carts = DataStore.Instance.GetCarts("tenant-a", "market-1");
        Assert.Equal(new[] { "sess-new", "sess-old" }, carts.Select(c => c.SessionId));
        Assert.Equal("sess-other", Assert.Single(DataStore.Instance.GetCarts("tenant-a", "market-2")).SessionId);
        Assert.Equal(3, DataStore.Instance.GetCarts("tenant-a").Count);
    }

    private static void Stamp(SqliteConnection connection, string sessionId, string updatedAt)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE Carts SET UpdatedAt = $updatedAt WHERE SessionId = $sessionId";
        cmd.Parameters.AddWithValue("$updatedAt", updatedAt);
        cmd.Parameters.AddWithValue("$sessionId", sessionId);
        cmd.ExecuteNonQuery();
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

[Collection("DataStore")]
public class CartsControllerTests
{
    [Fact]
    public void GetCarts_PagesWithinTheSelectedMarket()
    {
        using var connection = InitializeInMemoryDataStore();
        foreach (var i in new[] { 1, 2, 3 })
            DataStore.Instance.GetOrCreateCart($"sess-{i}", "tenant-a", "market-1");
        DataStore.Instance.GetOrCreateCart("sess-elsewhere", "tenant-a", "market-2");

        var first = Envelope(new CartsController().GetCarts("tenant-a", "market-1", page: 1, pageSize: 2));
        Assert.Equal(3, first.TotalCount);            // the unfiltered count, so the pager is honest
        Assert.Equal(2, first.Carts.Count);

        var second = Envelope(new CartsController().GetCarts("tenant-a", "market-1", page: 2, pageSize: 2));
        Assert.Single(second.Carts);
        Assert.DoesNotContain("sess-elsewhere", second.Carts.Select(c => c.SessionId));
    }

    [Fact]
    public void GetCarts_SearchesSessionIdAndProductName()
    {
        using var connection = InitializeInMemoryDataStore();
        var withTrailer = DataStore.Instance.GetOrCreateCart("sess-aaa", "tenant-a", "market-1");
        withTrailer.Items.Add(new CartItem { Id = "i1", ProductId = "p1", ProductName = "Box Trailer", Quantity = 1 });
        DataStore.Instance.UpdateCart(withTrailer);
        DataStore.Instance.GetOrCreateCart("sess-bbb", "tenant-a", "market-1");

        Assert.Equal("sess-aaa", Assert.Single(Search("trailer").Carts).SessionId);   // by product
        Assert.Equal("sess-bbb", Assert.Single(Search("bbb").Carts).SessionId);       // by session
        Assert.Empty(Search("nothing-matches").Carts);

        static (List<Cart> Carts, int TotalCount) Search(string term)
            => Envelope(new CartsController().GetCarts("tenant-a", "market-1", search: term));
    }

    /// <summary>The controller returns an anonymous object, which is internal to its assembly — so it
    /// has to be read reflectively rather than via <c>dynamic</c>.</summary>
    private static (List<Cart> Carts, int TotalCount) Envelope(ActionResult result)
    {
        var value = Assert.IsType<OkObjectResult>(result).Value!;
        return (
            (List<Cart>)value.GetType().GetProperty("carts")!.GetValue(value)!,
            (int)value.GetType().GetProperty("totalCount")!.GetValue(value)!);
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
        return connection;
    }
}
