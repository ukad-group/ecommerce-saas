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

    /// <summary>
    /// Starts a payment for an order. Returns the redirect URL (and provider payment id) the
    /// customer should be sent to, or <c>null</c> if the provider is not configured for the
    /// market or the gateway rejected the request.
    /// </summary>
    Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context);

    /// <summary>
    /// Parses this provider's webhook request body and returns the affected payment reference and
    /// the new order payment status (or <c>null</c> status when the event needs no change).
    /// Returns <c>null</c> when the body can't be parsed.
    /// </summary>
    Task<WebhookResult?> HandleWebhookAsync(HttpRequest request);
}
