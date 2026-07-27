using System.Text.Json;

namespace EComm.Data.ValueObjects.Tenant;

public class MarketSettings
{
    public string? OrderPrefix { get; set; }
    public decimal TaxRate { get; set; }

    /// <summary>Fallback leasing factor for products that don't set their own — null means
    /// leasing isn't offered for this market (not "0% leasing").</summary>
    public decimal? DefaultLeasingFactor { get; set; }

    public List<string>? ShippingZones { get; set; }
    public List<CustomPropertyTemplate>? CustomPropertyTemplates { get; set; }
    public List<ProductAttribute>? Attributes { get; set; }
    public List<ProductAttributePreset>? AttributePresets { get; set; }
    public List<ShippingMethod>? ShippingMethods { get; set; }
    public List<LeasingPeriod>? LeasingPeriods { get; set; }
    public string CartOrderStatus { get; set; } = "new";

    /// <summary>Named tax rates feeding the payment-surcharge-fee's tax calculation — see
    /// docs/TAX-CLASSES.md. Does not affect the general product/cart/order tax flow.</summary>
    public List<TaxClass>? TaxClasses { get; set; }

    /// <summary>
    /// Alias of the payment provider that handles this market's checkout (e.g. "nets-easy").
    /// Null falls back to the configured default provider (see docs/PAYMENT-PROVIDERS.md).
    /// </summary>
    public string? PaymentProvider { get; set; }

    /// <summary>
    /// Order status code to set when a payment succeeds (e.g. "paid"), regardless of which
    /// provider handled it. Blank/null ⇒ "paid".
    /// </summary>
    public string? OrderStatusAfterPayment { get; set; }

    /// <summary>
    /// Per-provider settings, keyed by provider alias → an opaque JSON object that the provider
    /// deserializes into its own strongly-typed settings model, e.g.
    /// <c>{ "nets-easy": { "secretApiKey": "…", "testMode": true } }</c>. Adding a provider adds a
    /// key here, not new columns. See docs/PAYMENT-PROVIDERS.md.
    /// </summary>
    public Dictionary<string, JsonElement>? PaymentProviders { get; set; }

    /// <summary>
    /// Optional flat surcharge fee per payment provider alias, applied when that provider is this
    /// market's active one. Parallel to <see cref="PaymentProviders"/> (same key), not merged into
    /// its generic schema — see docs/PAYMENT-PROVIDERS.md.
    /// </summary>
    public Dictionary<string, PaymentSurcharge>? PaymentSurcharges { get; set; }
}
