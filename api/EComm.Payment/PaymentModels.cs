using System.Text.Json;
using EComm.Data.Entities;
using Microsoft.AspNetCore.Http;

namespace EComm.Payment;

/// <summary>Everything a provider needs to start a payment. Gateway-agnostic.</summary>
public class PaymentCreationContext
{
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
    /// Absolute, publicly reachable URL this provider's gateway should POST status updates to
    /// (<c>{Payments:PublicBaseUrl}/api/v1/payments/webhook/{alias}</c>). Built by the pipeline, so no
    /// provider hardcodes a host. Empty when no public base URL could be determined — a provider that
    /// registers webhooks with its gateway per payment should then skip registering them.
    /// </summary>
    public string WebhookUrl { get; init; } = string.Empty;

    /// <summary>
    /// Deserializes this provider's settings into its own strongly-typed model. Returns a fresh
    /// <typeparamref name="T"/> when the market has no settings for the provider.
    /// </summary>
    public T GetSettings<T>() where T : new() => PaymentSettings.Read<T>(ProviderSettingsJson);
}

/// <summary>Outcome of starting a payment: the provider payment id and where to send the customer.</summary>
public class PaymentCreationResult
{
    public string PaymentId { get; init; } = string.Empty;
    public string? RedirectUrl { get; init; }

    /// <summary>
    /// Per-payment secret this provider registered with its gateway, if it uses one. The pipeline
    /// stores it on the order and hands it back through <see cref="WebhookSettings.PaymentWebhookSecret"/>
    /// when a webhook arrives; it is opaque here. Null when the provider doesn't verify webhooks with
    /// a per-payment secret — verification is then skipped for this payment.
    /// </summary>
    public string? WebhookSecret { get; init; }
}

/// <summary>
/// The payment lifecycle vocabulary every provider maps its own events onto. Values are ordered on
/// purpose: gateways deliver webhooks out of order, so the pipeline only lets a state advance
/// (see <see cref="PaymentStates.Advances"/>). Persisted on <c>Order.PaymentStatus</c> by name.
/// </summary>
public enum PaymentState
{
    Initialized = 1,
    Authorized = 2,
    Captured = 3,
    Cancelled = 4,
    Failed = 5,
    Refunded = 6
}

public static class PaymentStates
{
    /// <summary>Parses a persisted <c>Order.PaymentStatus</c>; unknown/legacy values parse to null.</summary>
    public static PaymentState? Parse(string? status)
        => Enum.TryParse<PaymentState>(status, ignoreCase: true, out var state) ? state : null;

    /// <summary>
    /// True when <paramref name="incoming"/> may overwrite the currently stored status. A late
    /// redelivery of an earlier event must never downgrade a payment that has already moved on
    /// (e.g. a replayed "authorized" arriving after "captured"). An unparseable current value never
    /// blocks an update.
    /// </summary>
    public static bool Advances(string? current, PaymentState incoming)
        => Parse(current) is not { } state || incoming >= state;
}

/// <summary>A failure reported by the gateway. Providers fold their own richer shapes into this.</summary>
public class PaymentError
{
    public string Code { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
}

/// <summary>
/// One payment event extracted from a webhook request. A single request can yield several of these —
/// some gateways batch events for different payments into one POST.
/// </summary>
public class WebhookResult
{
    /// <summary>The gateway's payment id, matched against <c>Order.PaymentReference</c>.</summary>
    public string PaymentReference { get; init; } = string.Empty;

    /// <summary>
    /// Stable key identifying this event, used to discard redeliveries. Providers whose gateway sends
    /// a unique event id use that; those whose gateway doesn't compose one from whatever is stable
    /// (e.g. transaction reference + event name + outcome). Empty ⇒ the pipeline falls back to
    /// hashing the raw request body.
    /// </summary>
    public string IdempotencyKey { get; init; } = string.Empty;

    /// <summary>The gateway's own event name — logging and audit only.</summary>
    public string EventName { get; init; } = string.Empty;

    /// <summary>The state this event moves the payment to, or null when it changes no state.</summary>
    public PaymentState? NewState { get; init; }

    /// <summary>Set when the event reports a failure, whether or not it also changes the state.</summary>
    public PaymentError? Error { get; init; }
}

/// <summary>
/// Everything a provider may need while handling a webhook. Settings are resolved lazily through
/// <see cref="ResolveSettings"/> because the market is only discoverable *from* the request body —
/// the provider parses a payment reference out of it, then asks for that payment's configuration.
/// Providers whose body is self-describing and self-verifying never call it.
/// </summary>
public class WebhookContext
{
    public required HttpRequest Request { get; init; }

    /// <summary>
    /// Given a gateway payment reference, returns that payment's provider settings and stored webhook
    /// secret, or null when no such payment is known.
    /// </summary>
    public required Func<string, WebhookSettings?> ResolveSettings { get; init; }
}

/// <summary>What <see cref="WebhookContext.ResolveSettings"/> hands back for one payment.</summary>
public class WebhookSettings
{
    /// <summary>The market's settings entry for this provider (the same JSON as at create time).</summary>
    public JsonElement? ProviderSettingsJson { get; init; }

    /// <summary>
    /// The <see cref="PaymentCreationResult.WebhookSecret"/> stored when this payment was created.
    /// Null for payments created before the provider issued one — verification should pass in that
    /// case rather than reject a payment that is already in flight.
    /// </summary>
    public string? PaymentWebhookSecret { get; init; }

    /// <summary>Deserializes the provider's settings into its own strongly-typed model.</summary>
    public T GetSettings<T>() where T : new() => PaymentSettings.Read<T>(ProviderSettingsJson);
}
