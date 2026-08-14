using System.ComponentModel.DataAnnotations;
using EComm.Api.DTOs.Requests.Products;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Product;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>Negative stock is rejected on the models every write path binds to — the product body
/// (POST/PUT), its variants, and the stock PATCH — so no caller can store it, not just the admin UI
/// that happens to validate client-side.</summary>
public class StockValidationTests
{
    private static List<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, true)]
    [InlineData(25, true)]
    public void ProductStockQuantity_RejectsNegative(int stock, bool expectedValid)
    {
        var results = Validate(new Product { Id = "p1", Name = "Widget", StockQuantity = stock });
        Assert.Equal(expectedValid, !results.Any(r => r.MemberNames.Contains(nameof(Product.StockQuantity))));
    }

    [Fact]
    public void ProductVariantStockQuantity_RejectsNegative()
    {
        Assert.Contains(Validate(new ProductVariant { StockQuantity = -1 }),
            r => r.MemberNames.Contains(nameof(ProductVariant.StockQuantity)));
        Assert.Empty(Validate(new ProductVariant { StockQuantity = 0 }));
    }

    [Fact]
    public void UpdateStockRequest_RejectsNegative()
    {
        Assert.NotEmpty(Validate(new UpdateStockRequest { StockQuantity = -1 }));
        Assert.Empty(Validate(new UpdateStockRequest { StockQuantity = 0 }));
    }
}
