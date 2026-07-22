namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// A variant's chosen value for one axis. Identity is the stable Alias(es), not the display name,
/// so renaming an attribute/value never breaks the variant. Name/ValueName are display snapshots.
/// </summary>
public class VariantOptionSelection
{
    public string? AttributeId { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ValueAlias { get; set; } = string.Empty;
    public string ValueName { get; set; } = string.Empty;
}

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
    public List<VariantOptionSelection> Options { get; set; } = new();
    public string Status { get; set; } = "active";
    public bool IsDefault { get; set; } = false;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
}
