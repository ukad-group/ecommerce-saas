using System.Text.Json.Serialization;

namespace EComm.Payment.Providers.NetsEasy;

// Wire DTOs for the subset of the Nets Easy Payment API we call directly over HTTP
// (https://api.dibspayment.eu/v1/payments) — see NetsEasyClient. No SDK dependency;
// amounts are integer minor units (e.g. cents/øre) per Nets's contract.

public class NetsOrderItem
{
    public string Reference { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public double Quantity { get; set; } = 1;
    public string Unit { get; set; } = "pcs";
    /// <summary>Price per unit, excluding VAT.</summary>
    public int UnitPrice { get; set; }

    /// <summary>VAT rate as percentage × 100 (2500 = 25%). Null ⇒ omitted.</summary>
    public int? TaxRate { get; set; }

    /// <summary>This line's VAT. <see cref="GrossTotalAmount"/> must equal
    /// <see cref="NetTotalAmount"/> + this. Null ⇒ omitted.</summary>
    public int? TaxAmount { get; set; }

    /// <summary>Line total excluding VAT (unitPrice × quantity).</summary>
    public int NetTotalAmount { get; set; }

    /// <summary>Line total including VAT.</summary>
    public int GrossTotalAmount { get; set; }
}

public class NetsOrder
{
    public List<NetsOrderItem> Items { get; set; } = new();
    public int Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? Reference { get; set; }
}

public class NetsCheckout
{
    public string IntegrationType { get; set; } = "HostedPaymentPage";
    public string ReturnUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
    public string TermsUrl { get; set; } = string.Empty;

    /// <summary>The URL to the privacy and cookie settings of your webshop. Null ⇒ omitted.</summary>
    public string? MerchantTermsUrl { get; set; }

    /// <summary>Pre-fills (but does not lock) the hosted-page consumer fields. Null ⇒ omitted.</summary>
    public NetsConsumer? Consumer { get; set; }

    /// <summary>
    /// True ⇒ we collected the customer data ourselves, so the checkout only asks for payment
    /// details. False ⇒ the checkout renders the consumer fields, prefilled from <see cref="Consumer"/>.
    /// </summary>
    public bool MerchantHandlesConsumerData { get; set; }

    /// <summary>
    /// Which customer categories the checkout offers, and which one loads first. Nets ignores this
    /// when <see cref="MerchantHandlesConsumerData"/> is true, so we omit it then.
    /// </summary>
    public NetsConsumerType? ConsumerType { get; set; }

    /// <summary>Checkout country, ISO 3166-1 alpha-3. Mandatory for Klarna. Null ⇒ omitted.</summary>
    public string? CountryCode { get; set; }
}

public class NetsConsumerType
{
    public string Default { get; set; } = "B2C";
    public List<string> SupportedTypes { get; set; } = ["B2C"];
}

// Optional consumer prefill — Nets shows these on the hosted page, still editable by the shopper.
// Null members are omitted from the request (client uses WhenWritingNull), so partial data is fine.
public class NetsConsumer
{
    public string? Email { get; set; }
    public NetsAddress? ShippingAddress { get; set; }
    public NetsPhone? PhoneNumber { get; set; }
    public NetsPrivatePerson? PrivatePerson { get; set; }
}

public class NetsAddress
{
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? PostalCode { get; set; }
    public string? City { get; set; }
    /// <summary>ISO 3166-1 alpha-3 (e.g. "SWE"). Null ⇒ omitted (Nets rejects a bad country).</summary>
    public string? Country { get; set; }
}

public class NetsPhone
{
    public string? Prefix { get; set; }  // e.g. "+46"
    public string? Number { get; set; }
}

public class NetsPrivatePerson
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class NetsCreatePaymentRequest
{
    public NetsOrder Order { get; set; } = new();
    public NetsCheckout Checkout { get; set; } = new();
    
    public NetsNotifications? Notifications { get; set; }

    /// <summary>
    /// Only for Nets partners initiating checkout with partner keys instead of the webshop's own
    /// integration keys. Null ⇒ omitted (the common case).
    /// </summary>
    public string? MerchantNumber { get; set; }
}

public class NetsNotifications
{
    /// <summary>Max 32 per payment. Serialized as "webHooks" to match the Nets API reference exactly.</summary>
    [JsonPropertyName("webHooks")]
    public List<NetsWebhookSubscription> Webhooks { get; set; } = new();
}

public class NetsWebhookSubscription
{
    public string EventName { get; set; } = string.Empty;

    /// <summary>Must be HTTPS, max 256 characters.</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Nets sends this back verbatim in the webhook's HTTP Authorization header. Nets requires
    /// 8–64 alphanumeric characters — anything else (an order number with dashes, say) is rejected.
    /// </summary>
    public string Authorization { get; set; } = string.Empty;
}

public class NetsCreatePaymentResult
{
    public string PaymentId { get; set; } = string.Empty;
    public string? HostedPaymentPageUrl { get; set; }
}

public class NetsChargeRequest
{
    public int Amount { get; set; }
}

public class NetsChargeResult
{
    public string ChargeId { get; set; } = string.Empty;
}

public class NetsPaymentStatusResponse
{
    public NetsPayment Payment { get; set; } = new();
}

public class NetsPayment
{
    public string PaymentId { get; set; } = string.Empty;
    public NetsSummary? Summary { get; set; }
}

public class NetsSummary
{
    public int? ReservedAmount { get; set; }
    public int? ChargedAmount { get; set; }
}

/// <summary>Envelope Nets POSTs to our webhook URL: { id, merchantId, timestamp, event, data: { paymentId } }.</summary>
public class NetsWebhookEnvelope
{
    public string Id { get; set; } = string.Empty;
    public string Event { get; set; } = string.Empty;
    public NetsWebhookData Data { get; set; } = new();
}

public class NetsWebhookData
{
    public string PaymentId { get; set; } = string.Empty;

    /// <summary>Present on every "*.failed" event. Null otherwise.</summary>
    public NetsWebhookError? Error { get; set; }
}

public class NetsWebhookError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
}
