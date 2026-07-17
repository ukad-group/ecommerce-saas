using EComm.Data.ValueObjects.Product;

namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// A market-scoped (per-store) product attribute definition — the reusable "variant axis"
/// (e.g. Size, Color) picked onto products. Stored in <see cref="MarketSettings.Attributes"/>.
/// </summary>
public class ProductAttribute
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Alias { get; set; } = string.Empty;
    public List<ProductAttributeValue> Values { get; set; } = new();
}
