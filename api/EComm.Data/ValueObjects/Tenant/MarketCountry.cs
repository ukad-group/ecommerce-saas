namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// A country the market sells to, with the defaults checkout should offer there. Named
/// MarketCountry rather than Country because <see cref="Common.Country"/> is the static ISO 3166
/// reference pair (code + name) these are created from.
/// </summary>
public class MarketCountry
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>2-letter ISO 3166-1 alpha-2 code, e.g. "SE".</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Id of a <see cref="Currency"/> in the same market's list.</summary>
    public string? DefaultCurrencyId { get; set; }

    /// <summary>Id of a <see cref="ShippingMethod"/> in the same market's list.</summary>
    public string? DefaultShippingMethodId { get; set; }

    /// <summary>Alias of one of the market's configured payment providers.</summary>
    public string? DefaultPaymentProviderAlias { get; set; }
}
