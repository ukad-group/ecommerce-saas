namespace ECommShowcase.Web.Models.DTOs;

/// <summary>
/// An option block on a product: a titled group that references store-global
/// option presets by id (resolved against the market's presets library).
/// </summary>
public class ProductOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> OptionIds { get; set; } = new();
    public bool Disabled { get; set; }
}

/// <summary>
/// A store-global option preset. Two kinds: "single" (a purchasable add-on)
/// and "group" (an option with sub-options — Name/Description/ImageUrl plus
/// SubOptionIds referencing single presets; the group itself isn't buyable).
/// </summary>
public class OptionPresetDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int StockQuantity { get; set; }
    public string Status { get; set; } = "active";
    public string Kind { get; set; } = "single";
    public List<string>? SubOptionIds { get; set; }
}
