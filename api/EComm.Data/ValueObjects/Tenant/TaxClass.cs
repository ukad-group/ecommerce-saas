namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// A named tax rate, market-scoped, feeding the payment-surcharge-fee's tax calculation (see
/// docs/TAX-CLASSES.md). Does not touch the general product/cart/order tax flow, which still uses
/// the flat MarketSettings.TaxRate.
/// </summary>
public class TaxClass
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>Fraction, e.g. 0.25 = 25% (matches MarketSettings.TaxRate's convention).</summary>
    public decimal DefaultRate { get; set; }

    public List<CountryTaxRate>? CountryRates { get; set; }

    /// <summary>Exact country match (case-insensitive) wins; else DefaultRate; else 0 when
    /// taxClassId is unset or unknown.</summary>
    public static decimal ResolveRate(List<TaxClass>? classes, string? taxClassId, string? countryCode)
    {
        if (string.IsNullOrEmpty(taxClassId)) return 0m;

        var taxClass = classes?.FirstOrDefault(c => c.Id == taxClassId);
        if (taxClass == null) return 0m;

        if (!string.IsNullOrEmpty(countryCode))
        {
            var match = taxClass.CountryRates?
                .FirstOrDefault(r => string.Equals(r.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase));
            if (match != null) return match.Rate;
        }

        return taxClass.DefaultRate;
    }
}

public class CountryTaxRate
{
    /// <summary>ISO 3166-1 alpha-2, e.g. "SE".</summary>
    public string CountryCode { get; set; } = string.Empty;
    public decimal Rate { get; set; }
}
