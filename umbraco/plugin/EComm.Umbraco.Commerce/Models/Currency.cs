namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Currency DTO from the eCommerce API — a currency the store offers. The store's *active* currency
/// is still its market currency code (<see cref="CurrenciesResponse.ActiveCode"/>).
/// </summary>
public class Currency
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>3-letter ISO 4217 code, e.g. "SEK".</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Culture monetary values are formatted with, e.g. "sv-SE".</summary>
    public string? Culture { get; set; }

    /// <summary>.NET format template, e.g. "{0:n0} kr" — for storefront-side formatting.</summary>
    public string? FormatTemplate { get; set; }

    /// <summary>ISO country codes this currency is available in. Null/empty = all countries.</summary>
    public List<string>? CountryCodes { get; set; }
}

public class CurrenciesResponse
{
    public List<Currency> Currencies { get; set; } = new();

    /// <summary>The store's active currency code, from the market itself.</summary>
    public string? ActiveCode { get; set; }
}

/// <summary>Reference data for the currency editor, generated from .NET culture data.</summary>
public class CurrencyPresetsResponse
{
    public List<CurrencyPreset> Currencies { get; set; } = new();
    public List<CulturePreset> Cultures { get; set; } = new();
}

/// <summary>Code + name only — the formatting culture is the admin's choice, see the API's
/// CurrencyPreset for why nothing sensible can be guessed per currency.</summary>
public class CurrencyPreset
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class CulturePreset
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
