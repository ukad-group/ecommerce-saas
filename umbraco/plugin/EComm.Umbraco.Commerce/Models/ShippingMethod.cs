namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Shipping method DTO from the eCommerce API
/// </summary>
public class ShippingMethod
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public List<string>? CountryCodes { get; set; }
}
