using ECommShowcase.Web.Models.DTOs;

namespace ECommShowcase.Web.Models.ViewModels;

public class ProductDetailViewModel
{
    public ProductDto Product { get; set; } = new();
    public CategoryDto? Category { get; set; }
    public string CurrencySymbol { get; set; } = "$";
    public bool IsInStock => Product.StockQuantity > 0;

    /// <summary>Store-global option presets, keyed by id, for resolving option blocks.</summary>
    public Dictionary<string, OptionPresetDto> OptionPresets { get; set; } = new();
}
