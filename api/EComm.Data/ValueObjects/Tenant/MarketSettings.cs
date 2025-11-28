namespace EComm.Data.ValueObjects.Tenant;

public class MarketSettings
{
    public string? OrderPrefix { get; set; }
    public decimal TaxRate { get; set; }
    public List<string>? ShippingZones { get; set; }
    public List<CustomPropertyTemplate>? CustomPropertyTemplates { get; set; }
}
