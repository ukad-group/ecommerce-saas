namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Variant option definition (e.g., Size, Color)
/// </summary>
public class VariantOption
{
    public string Name { get; set; } = string.Empty;
    public List<string> Values { get; set; } = new();
}
