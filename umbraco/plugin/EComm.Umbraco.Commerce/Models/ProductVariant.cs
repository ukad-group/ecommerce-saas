namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Product variant DTO from the eCommerce API
/// </summary>
public class ProductVariant
{
    public string Id { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? SalePrice { get; set; }
    public int StockQuantity { get; set; }
    public int LowStockThreshold { get; set; }
    public List<string>? Images { get; set; }
    public Dictionary<string, string> Options { get; set; } = new();
    public string Status { get; set; } = "active";
    public bool IsDefault { get; set; } = false;
}
