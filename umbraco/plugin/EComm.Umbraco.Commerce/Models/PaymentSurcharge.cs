namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Payment provider surcharge fee DTO from the eCommerce API — an optional flat fee added to the
/// order total when this provider is the market's active one. Parallel to a provider's own
/// (opaque) settings, not part of it.
/// </summary>
public class PaymentSurcharge
{
    public string? Sku { get; set; }
    public string? TaxClassId { get; set; }
    public decimal Amount { get; set; }
}
