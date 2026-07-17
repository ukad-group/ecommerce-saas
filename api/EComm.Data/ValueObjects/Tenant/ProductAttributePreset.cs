namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// A market-scoped named bundle of product attributes, applied to a product all at once.
/// Stored in <see cref="MarketSettings.AttributePresets"/>.
/// </summary>
public class ProductAttributePreset
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public List<string> AttributeIds { get; set; } = new();  // references ProductAttribute.Id
}
