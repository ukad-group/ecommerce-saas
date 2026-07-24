namespace EComm.Payment.Providers.NetsEasy;

/// <summary>
/// Strongly-typed per-market settings for the Nets Easy provider, deserialized from the market's
/// <c>PaymentProviders["nets-easy"]</c> JSON entry.
/// </summary>
public class NetsEasySettings
{
    public string? LiveSecretKey { get; set; }
    public string? LiveCheckoutKey { get; set; }
    public string? TestSecretKey { get; set; }
    public string? TestCheckoutKey { get; set; }

    /// <summary>Order status code to set when a payment succeeds (e.g. "paid"). Blank ⇒ "paid".</summary>
    public string? OrderStatusAfterPayment { get; set; }

    public bool TestMode { get; set; } = true;

    /// <summary>The secret key for the active environment.</summary>
    public string? ActiveSecretKey => TestMode ? TestSecretKey : LiveSecretKey;
}
