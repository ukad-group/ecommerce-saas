using System.ComponentModel.DataAnnotations;

namespace EComm.Data.ValueObjects.Product;

public class ProductVariant
{
    public string Id { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? SalePrice { get; set; }
    [Range(0, int.MaxValue, ErrorMessage = "Stock quantity cannot be negative.")]
    public int StockQuantity { get; set; }
    public int LowStockThreshold { get; set; }
    public List<string>? Images { get; set; }
    public List<VariantOptionSelection> Options { get; set; } = new();
    public string Status { get; set; } = "active";
    public bool IsDefault { get; set; } = false;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
}
