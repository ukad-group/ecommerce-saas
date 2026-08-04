namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// A country the store sells to, with its checkout defaults. Distinct from <see cref="Country"/>,
/// which is the static ISO 3166 reference pair these are created from.
/// </summary>
public class MarketCountry
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>2-letter ISO 3166-1 alpha-2 code, e.g. "SE".</summary>
    public string Code { get; set; } = string.Empty;

    public string? DefaultCurrencyId { get; set; }
    public string? DefaultShippingMethodId { get; set; }
    public string? DefaultPaymentProviderAlias { get; set; }
}

public class MarketCountriesResponse
{
    public List<MarketCountry> Countries { get; set; } = new();
}
