namespace EComm.Payment.Providers.NetsEasy;

/// <summary>
/// Strongly-typed per-market settings for the Nets Easy provider, deserialized from the market's
/// <c>PaymentProviders["nets-easy"]</c> JSON entry.
/// </summary>
public class NetsEasySettings
{
    public string? SecretApiKey { get; set; }
    public string? CheckoutKey { get; set; }
    public bool TestMode { get; set; } = true;
}
