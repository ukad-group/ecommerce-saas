namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Tax class DTO from the eCommerce API — a named tax rate feeding the payment-surcharge-fee's
/// tax calculation. Market-scoped; does not affect general product/cart/order tax.
/// </summary>
public class TaxClass
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal DefaultRate { get; set; }
    public List<CountryTaxRate>? CountryRates { get; set; }
}

public class CountryTaxRate
{
    public string CountryCode { get; set; } = string.Empty;
    public decimal Rate { get; set; }
}
