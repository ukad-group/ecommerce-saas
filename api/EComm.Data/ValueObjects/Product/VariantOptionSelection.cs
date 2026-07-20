namespace EComm.Data.ValueObjects.Product;

/// <summary>
/// A variant's chosen value for one axis. Identity is the stable <see cref="Alias"/> +
/// <see cref="ValueAlias"/> (and <see cref="AttributeId"/> when global), so renaming an attribute
/// or a value never breaks the variant. <see cref="Name"/>/<see cref="ValueName"/> are display
/// snapshots, refreshed from the product's <c>VariantOptions</c> axes on save.
/// </summary>
public class VariantOptionSelection
{
    public string? AttributeId { get; set; }  // set => global (references market ProductAttribute.Id)
    public string Alias { get; set; } = string.Empty;       // attribute alias (stable match key)
    public string Name { get; set; } = string.Empty;        // attribute display name (snapshot)
    public string ValueAlias { get; set; } = string.Empty;  // chosen value alias (stable match key)
    public string ValueName { get; set; } = string.Empty;   // chosen value display name (snapshot)
}
