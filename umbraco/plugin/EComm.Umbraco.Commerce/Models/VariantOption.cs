namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// A product's variant axis (a "product attribute" assignment). Either global — linked to a
/// market <see cref="ProductAttribute"/> via <see cref="AttributeId"/> with a selected subset of
/// its values — or local, defined inline on the product (<see cref="AttributeId"/> null).
/// </summary>
public class VariantOption
{
    public string Name { get; set; } = string.Empty;
    public string? Alias { get; set; }
    public string? AttributeId { get; set; }  // set => global (references market ProductAttribute.Id)
    public List<ProductAttributeValue> Values { get; set; } = new();
}
