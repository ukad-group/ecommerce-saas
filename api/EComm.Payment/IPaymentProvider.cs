using EComm.Data.Entities;

namespace EComm.Payment;

/// <summary>
/// A pluggable payment gateway. Register one implementation per gateway (each with a unique
/// <see cref="Alias"/>); markets pick which one to use via <c>MarketSettings.PaymentProvider</c>.
/// The generic pipeline knows nothing about any concrete gateway — see the docs at
/// docs/PAYMENT-PROVIDERS.md for how to add one.
/// </summary>
public interface IPaymentProvider
{
    /// <summary>Stable identifier a market stores to select this provider (e.g. "nets-easy").</summary>
    string Alias { get; }

    /// <summary>Self-description (display name + settings fields) so UIs can list and configure it.</summary>
    PaymentProviderDescriptor Descriptor { get; }

    /// <summary>
    /// Starts a payment for an order. Returns the redirect URL (and provider payment id) the
    /// customer should be sent to, or <c>null</c> if the provider is not configured for the
    /// market or the gateway rejected the request.
    /// </summary>
    Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context);

    /// <summary>
    /// True when the request genuinely came from this gateway. Implementations are free to use the
    /// raw body, headers, merchant credentials or the per-payment secret — schemes differ wildly
    /// (shared token in a header, HMAC over the body, HMAC over selected fields, a verification API
    /// call), so the pipeline only asks for a verdict.
    /// <para>
    /// Default: no verification. The pipeline only enforces this for payments where the provider
    /// returned a <see cref="PaymentCreationResult.WebhookSecret"/>, so a provider that issues no
    /// secret is unaffected; one that does should override this.
    /// </para>
    /// </summary>
    Task<bool> VerifyWebhookAsync(WebhookContext context) => Task.FromResult(true);

    /// <summary>
    /// Parses this provider's webhook request into zero or more payment events. A list because some
    /// gateways batch events for several payments into one POST; empty when the body carries nothing
    /// actionable. Implementations may call their gateway's API (using credentials from
    /// <see cref="WebhookContext.ResolveSettings"/>) when the body alone doesn't carry the state.
    /// </summary>
    Task<IReadOnlyList<WebhookResult>> HandleWebhookAsync(WebhookContext context);
}
