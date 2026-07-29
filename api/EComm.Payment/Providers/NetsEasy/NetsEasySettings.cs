namespace EComm.Payment.Providers.NetsEasy;

/// <summary>
/// Strongly-typed per-market settings for the Nets Easy provider, deserialized from the market's
/// <c>PaymentProviders["nets-easy"]</c> JSON entry.
/// </summary>
public class NetsEasySettings
{
    public string? LiveSecretKey { get; set; }
    public string? TestSecretKey { get; set; }

    // ponytail: the checkout keys are only consumed by Nets' browser-side Checkout JS, so nothing
    // reads them until an embedded-checkout integration type exists. Kept because that's planned.
    public string? LiveCheckoutKey { get; set; }
    public string? TestCheckoutKey { get; set; }

    public bool TestMode { get; set; } = true;

    /// <summary>The secret key for the active environment.</summary>
    public string? ActiveSecretKey => TestMode ? TestSecretKey : LiveSecretKey;

    /// <summary>The URL to the privacy and cookie settings of your webshop (sent as checkout.merchantTermsUrl).</summary>
    public string? MerchantTermsUrl { get; set; }

    /// <summary>
    /// Only for Nets partners initiating checkout with partner keys instead of the webshop's own
    /// integration keys (sent as the request's merchantNumber). Leave blank otherwise.
    /// </summary>
    public string? MerchantNumber { get; set; }

    /// <summary>
    /// False (default): Nets renders the customer fields on its page, prefilled from the order and
    /// still editable. True: our own checkout owns that data and Nets asks only for payment details.
    /// Maps to checkout.merchantHandlesConsumerData.
    /// </summary>
    public bool MerchantHandlesConsumerData { get; set; }
}
