namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Tax class DTO from the eCommerce API — a named, market-scoped tax rate. The class named by the
/// active payment provider's surcharge sets both the goods rate and that fee's own tax.
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

/// <summary>A market's tax setup: its named classes plus the flat rate used when the active payment
/// provider names none.</summary>
public class TaxClassesResponse
{
    public List<TaxClass> TaxClasses { get; set; } = new();

    /// <summary>Fraction, e.g. 0.25 = 25%.</summary>
    public decimal TaxRate { get; set; }
}
