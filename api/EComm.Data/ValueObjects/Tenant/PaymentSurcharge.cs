namespace EComm.Data.ValueObjects.Tenant;

/// <summary>
/// An optional flat fee added to the order total when this market's active payment provider
/// (keyed by alias in MarketSettings.PaymentSurcharges) is used. Parallel to
/// MarketSettings.PaymentProviders (same key), not merged into a provider's own opaque settings —
/// see docs/PAYMENT-PROVIDERS.md.
/// </summary>
public class PaymentSurcharge
{
    /// <summary>Free-text label, admin-facing only — not sent to the payment gateway.</summary>
    public string? Sku { get; set; }

    /// <summary>References MarketSettings.TaxClasses[].Id.</summary>
    public string? TaxClassId { get; set; }

    /// <summary>Flat amount in the market's currency, pre-tax.</summary>
    public decimal Amount { get; set; }
}
