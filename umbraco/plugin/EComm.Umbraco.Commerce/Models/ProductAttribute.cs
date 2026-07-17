namespace EComm.Umbraco.Commerce.Models;

/// <summary>A single value of a product attribute (e.g. "Small" / "small").</summary>
public class ProductAttributeValue
{
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
}

/// <summary>
/// Market-scoped (per-store) product attribute definition — the reusable variant axis
/// (e.g. Size, Color) picked onto products.
/// </summary>
public class ProductAttribute
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public List<ProductAttributeValue> Values { get; set; } = new();
}

/// <summary>Market-scoped named bundle of attributes, applied to a product all at once.</summary>
public class ProductAttributePreset
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public List<string> AttributeIds { get; set; } = new();  // references ProductAttribute.Id
}
