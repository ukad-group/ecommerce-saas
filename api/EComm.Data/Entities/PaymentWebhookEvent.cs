namespace EComm.Data.Entities;

/// <summary>
/// A gateway webhook we have already processed. The existence of a row *is* the idempotency check:
/// payment gateways deliver at-least-once (and out of order), so the webhook pipeline inserts first
/// and skips anything whose key it has seen before.
/// ponytail: no retention sweep — add one if this table ever grows enough to notice.
/// </summary>
public class PaymentWebhookEvent
{
    /// <summary><c>"{provider alias}:{provider-supplied idempotency key}"</c>.</summary>
    public string Id { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;
    public string EventName { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;
    public string? OrderId { get; set; }
    public DateTime ReceivedAt { get; set; }
}
