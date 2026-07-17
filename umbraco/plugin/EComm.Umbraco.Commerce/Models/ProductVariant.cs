namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// An option block on a product:
/// a titled group referencing store-global option presets by id.
/// </summary>
public class ProductOption
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> OptionIds { get; set; } = new();   // references OptionPreset.Id
    public bool Disabled { get; set; }
}

/// <summary>
/// Store-global option preset. Two kinds: "single" (a buyable add-on) and
/// "group" (an option with sub-options — Name/Description/ImageUrl plus
/// SubOptionIds referencing single presets; the group itself isn't buyable).
/// </summary>
public class OptionPreset
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }               // legacy plain URL (fallback)
    public ProductImage? Image { get; set; }            // rich image picked from Umbraco Media (preferred)
    public int StockQuantity { get; set; }
    public string Status { get; set; } = "active";
    public string Kind { get; set; } = "single";
    public List<string>? SubOptionIds { get; set; }
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
    public Dictionary<string, string> Options { get; set; } = new();
    public string Status { get; set; } = "active";
    public bool IsDefault { get; set; } = false;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
}
