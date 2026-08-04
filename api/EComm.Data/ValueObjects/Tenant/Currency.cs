namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// A currency the market offers. Market.Currency still names the market's active currency by ISO
/// code — this adds the display name, the culture money is formatted with, and which countries the
/// currency may be used in.
/// </summary>
public class Currency
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>3-letter ISO 4217 code, e.g. "SEK".</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Culture used to format monetary values, e.g. "sv-SE".</summary>
    public string? Culture { get; set; }

    /// <summary>.NET format template for values with a symbol, e.g. "{0:n0} kr". Stored for
    /// storefront-side formatting; a browser can't apply .NET format specifiers.</summary>
    public string? FormatTemplate { get; set; }

    /// <summary>ISO country codes this currency is available in. Null/empty = all countries —
    /// the same convention as <see cref="ShippingMethod.CountryCodes"/>.</summary>
    public List<string>? CountryCodes { get; set; }
}
