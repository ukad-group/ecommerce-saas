namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Product DTO from the eCommerce API
/// </summary>
public class Product
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? CategoryId { get; set; }
    public int StockQuantity { get; set; }
    public List<ProductImage> Images { get; set; } = new();
    public Dictionary<string, string> CustomProperties { get; set; } = new();
}

public class ProductImage
{
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public int DisplayOrder { get; set; }
}
