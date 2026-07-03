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
    public List<OptionPreset>? OptionPresets { get; set; }
    public List<ShippingMethod>? ShippingMethods { get; set; }
    public List<LeasingPeriod>? LeasingPeriods { get; set; }
    public string CartOrderStatus { get; set; } = "new";

    // Nets Easy payment gateway credentials for this market's checkout
    public string? NetsSecretApiKey { get; set; }
    public string? NetsCheckoutKey { get; set; }
    public bool NetsTestMode { get; set; } = true;
}
