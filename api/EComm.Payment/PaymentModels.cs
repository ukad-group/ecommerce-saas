using System.Text.Json;
using EComm.Data.Entities;

namespace EComm.Payment;

/// <summary>Everything a provider needs to start a payment. Gateway-agnostic.</summary>
public class PaymentCreationContext
{
    private static readonly JsonSerializerOptions SettingsJsonOptions = new() { PropertyNameCaseInsensitive = true };

    public required Order Order { get; init; }
    public required Market Market { get; init; }

    /// <summary>
    /// This provider's raw settings for the market (its entry from <c>MarketSettings.PaymentProviders</c>).
    /// Read it through <see cref="GetSettings{T}"/> rather than directly.
    /// </summary>
    public JsonElement? ProviderSettingsJson { get; init; }

    public string ReturnUrl { get; init; } = string.Empty;
    public string CancelUrl { get; init; } = string.Empty;
    public string TermsUrl { get; init; } = string.Empty;

    /// <summary>
    /// Deserializes this provider's settings into its own strongly-typed model. Returns a fresh
    /// <typeparamref name="T"/> when the market has no settings for the provider.
    /// </summary>
    public T GetSettings<T>() where T : new()
        => ProviderSettingsJson is { ValueKind: JsonValueKind.Object } element
            ? element.Deserialize<T>(SettingsJsonOptions) ?? new T()
            : new T();
}

/// <summary>Outcome of starting a payment: the provider payment id and where to send the customer.</summary>
public class PaymentCreationResult
{
    public string PaymentId { get; init; } = string.Empty;
    public string? RedirectUrl { get; init; }
}

/// <summary>What a provider extracted from a webhook: which payment, and the new order status (if any).</summary>
public class WebhookResult
{
    public string PaymentReference { get; init; } = string.Empty;
    public string? NewStatus { get; init; }
}
