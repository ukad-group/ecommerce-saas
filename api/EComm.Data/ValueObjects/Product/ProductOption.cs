namespace EComm.Data.ValueObjects.Product;

/// <summary>
/// An option block on a product:
/// a titled group that references store-global option presets by id. The
/// referenced presets (the "sub options") are resolved from the market's
/// OptionPresets library at display/cart time.
/// </summary>
public class ProductOption
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> OptionIds { get; set; } = new();   // references OptionPreset.Id
    public bool Disabled { get; set; }
}
