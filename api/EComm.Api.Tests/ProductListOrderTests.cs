using EComm.Api.Controllers;
using EComm.Data;
using EComm.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// The list's order is the API's job, not the caller's — a caller that sorts the page it was handed
/// only sorts that page. `sort=newest` is what the backoffice table asks for so a just-created
/// product is the first row; every other caller keeps the by-name default.
/// </summary>
[Collection("DataStore")]
public class ProductListOrderTests
{
    [Fact]
    public void Newest_PutsTheMostRecentlyCreatedFirst()
    {
        using var connection = SeededDb();

        var names = ProductNames(sort: "newest");

        Assert.Equal(new[] { "Zebra crossing", "Middle", "Alpha" }, names);
    }

    [Fact]
    public void NoSort_StaysAlphabetical()
    {
        using var connection = SeededDb();

        Assert.Equal(new[] { "Alpha", "Middle", "Zebra crossing" }, ProductNames(sort: null));
        // An unknown value falls back to the default rather than erroring.
        Assert.Equal(new[] { "Alpha", "Middle", "Zebra crossing" }, ProductNames(sort: "sideways"));
    }

    private static List<string> ProductNames(string? sort)
    {
        var result = new ProductsController().GetProducts(
            status: "all", marketId: "market-1", sort: sort);
        var products = Assert.IsType<List<Product>>(Assert.IsType<OkObjectResult>(result).Value);
        return products.Select(p => p.Name).ToList();
    }

    /// <summary>Three products created out of alphabetical order, so the two orderings differ.</summary>
    private static SqliteConnection SeededDb()
    {
        var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options;
        using (var context = new ECommDbContext(options))
        {
            context.Database.EnsureCreated();
            context.Products.AddRange(
                Product("prod-1", "Alpha", new DateTime(2026, 1, 1)),
                Product("prod-2", "Zebra crossing", new DateTime(2026, 3, 1)),
                Product("prod-3", "Middle", new DateTime(2026, 2, 1)));
            context.SaveChanges();
        }
        DataStore.Instance.InitializeDatabase(options);
        return connection; // keep alive — closing it drops the in-memory db
    }

    private static Product Product(string id, string name, DateTime createdAt) => new()
    {
        Id = id,
        TenantId = "tenant-a",
        MarketId = "market-1",
        Name = name,
        Sku = id,
        Price = 10m,
        Status = "active",
        Version = 1,
        IsCurrentVersion = true,
        CreatedAt = createdAt,
        UpdatedAt = createdAt,
    };
}
