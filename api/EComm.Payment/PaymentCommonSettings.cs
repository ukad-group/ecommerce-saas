namespace EComm.Payment;

/// <summary>
/// The settings every provider gets whatever its gateway: where to send the customer when the
/// payment is done, cancelled or broken, the shop's terms, and which language the payment window
/// speaks. Stored in the same per-market bag as a provider's own settings
/// (<c>MarketSettings.PaymentProviders[alias]</c>) and declared once in <see cref="Fields"/>, which
/// <see cref="PaymentProviderDescriptor.Fields"/> appends to every descriptor — so no provider
/// re-declares them and no UI needs to know they're special.
/// </summary>
public class PaymentCommonSettings
{
    public string ContinueUrl { get; set; } = "";
    public string CancelUrl { get; set; } = "";
    public string ErrorUrl { get; set; } = "";
    public string Language { get; set; } = "";
    public string TermsUrl { get; set; } = "";
    public string MerchantTermsUrl { get; set; } = "";

    /// <summary>The schema for the above, in the order a backoffice should render it.</summary>
    public static readonly IReadOnlyList<PaymentSettingField> Fields =
    [
        new()
        {
            Key = "continueUrl",
            Label = "Continue URL",
            Type = PaymentFieldType.Text,
            Required = true,
            HelpText =
                "The URL to continue to after this provider has done processing. Must be absolute, e.g. https://shop.example.com/continue/",
        },
        new()
        {
            Key = "cancelUrl",
            Label = "Cancel URL",
            Type = PaymentFieldType.Text,
            HelpText =
                "The URL to return to if the payment attempt is canceled, e.g. https://shop.example.com/cancel/",
        },
        new()
        {
            Key = "errorUrl",
            Label = "Error URL",
            Type = PaymentFieldType.Text,
            HelpText =
                "The URL to return to if the payment attempt errors, e.g. https://shop.example.com/error/",
        },
        new()
        {
            Key = "language",
            Label = "Language",
            Type = PaymentFieldType.Text,
            HelpText =
                "Language used in the payment window, as a locale code (e.g. sv-SE, da-DK, en-GB). Blank ⇒ the gateway's default.",
        },
        new()
        {
            Key = "termsUrl",
            Label = "Terms URL",
            Type = PaymentFieldType.Text,
            Required = true,
            HelpText = "The URL to the terms and conditions of your webshop.",
        },
        new()
        {
            Key = "merchantTermsUrl",
            Label = "Merchant Terms URL",
            Type = PaymentFieldType.Text,
            HelpText = "The URL to the privacy and cookie settings of your webshop.",
        },
    ];

    /// <summary>
    /// Null when these settings are usable, else why they aren't. Gateways redirect a browser to
    /// these URLs and reject anything that isn't absolute, so a relative path is a misconfiguration
    /// worth naming here rather than sending on and reading the gateway's error back.
    /// </summary>
    public string? Validate() =>
        Problem("Continue URL", ContinueUrl, required: true)
        ?? Problem("Terms URL", TermsUrl, required: true)
        ?? Problem("Cancel URL", CancelUrl)
        ?? Problem("Error URL", ErrorUrl)
        ?? Problem("Merchant Terms URL", MerchantTermsUrl);

    private static string? Problem(string label, string value, bool required = false)
    {
        if (string.IsNullOrWhiteSpace(value))
            return required ? $"{label} is required for this payment provider" : null;

        return IsAbsoluteHttpUrl(value)
            ? null
            : $"{label} must be an absolute URL (e.g. https://shop.example.com/continue/)";
    }

    private static bool IsAbsoluteHttpUrl(string value) =>
        Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);
}
