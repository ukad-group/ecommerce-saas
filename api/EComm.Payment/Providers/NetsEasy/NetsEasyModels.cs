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
    public int UnitPrice { get; set; }
    public int NetTotalAmount { get; set; }
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
}

public class NetsCreatePaymentRequest
{
    public NetsOrder Order { get; set; } = new();
    public NetsCheckout Checkout { get; set; } = new();
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
}
