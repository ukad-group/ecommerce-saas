namespace EComm.Data.ValueObjects.Tenant;

public class ShippingMethod
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }

    /// <summary>ISO country codes this method is available for. Null/empty = all countries.</summary>
    public List<string>? CountryCodes { get; set; }
}
