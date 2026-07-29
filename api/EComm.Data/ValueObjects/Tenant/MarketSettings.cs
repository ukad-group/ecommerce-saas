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

    /// <summary>Named tax rates, referenced by id from the active provider's surcharge (which sets
    /// both the goods rate and its own fee's rate) — see docs/TAX-CLASSES.md.</summary>
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

    /// <summary>
    /// The rate goods are taxed at: the tax class picked on the <em>active</em> payment provider's
    /// surcharge, falling back to the flat <see cref="TaxRate"/>. One method so carts and orders can
    /// never drift apart — the only difference is that an order passes its shipping country, which
    /// lets a per-country rate override the class default.
    /// <para>
    /// Falls back to <see cref="TaxRate"/> whenever no usable class is named — unset, or pointing at
    /// a class since deleted. TaxClass.ResolveRate would answer 0m there, which silently ships
    /// untaxed orders; the store rate is the safer answer for a dangling reference.
    /// </para>
    /// <para>
    /// Note this couples goods tax to payment configuration: switching the active provider, or
    /// clearing its surcharge, changes what the whole catalogue is taxed at. Give MarketSettings its
    /// own DefaultTaxClassId if that coupling ever bites.
    /// </para>
    /// </summary>
    public decimal ResolveGoodsTaxRate(string? countryCode = null)
    {
        var alias = PaymentProvider;
        string? taxClassId = null;
        if (!string.IsNullOrEmpty(alias) && PaymentSurcharges?.TryGetValue(alias, out var surcharge) == true)
            taxClassId = surcharge.TaxClassId;

        var taxClass = string.IsNullOrEmpty(taxClassId)
            ? null
            : TaxClasses?.FirstOrDefault(c => c.Id == taxClassId);

        return taxClass == null ? TaxRate : TaxClass.ResolveRate(TaxClasses, taxClass.Id, countryCode);
    }
}
