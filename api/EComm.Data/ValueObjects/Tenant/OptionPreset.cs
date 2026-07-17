using EComm.Data.ValueObjects.Product;

namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// A store-global add-on option living in the market settings library and
/// referenced by id from a product's option blocks — a single source of truth
/// shared across products.
///
/// Two kinds, distinguished by <see cref="Kind"/>:
///   • "single" — a buyable add-on with its own Sku/Price/StockQuantity (default).
///   • "group"  — an "option with sub-options": Name/Description/ImageUrl plus
///     <see cref="SubOptionIds"/> referencing single presets. A group has no own
///     price; the price/stock come from whichever sub-option the customer picks.
/// </summary>
public class OptionPreset
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;   // Display name
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }               // Main image (legacy plain URL; fallback)
    public ProductImage? Image { get; set; }            // Rich image picked from Umbraco Media (preferred)
    public int StockQuantity { get; set; }
    public string Status { get; set; } = "active";

    /// <summary>"single" (a buyable add-on) or "group" (bundles single sub-options).</summary>
    public string Kind { get; set; } = "single";

    /// <summary>For groups only: ids of the single presets this group bundles.</summary>
    public List<string>? SubOptionIds { get; set; }
}
