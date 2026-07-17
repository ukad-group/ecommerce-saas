namespace EComm.Data.ValueObjects.Tenant;

public class CustomPropertyTemplate
{
    public string Name { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public int SortOrder { get; set; }

    /// <summary>When set, the product value for this property is chosen from the referenced
    /// market <see cref="ProductAttribute"/>'s predefined values (a dropdown) instead of free text.</summary>
    public string? AttributeId { get; set; }
}
