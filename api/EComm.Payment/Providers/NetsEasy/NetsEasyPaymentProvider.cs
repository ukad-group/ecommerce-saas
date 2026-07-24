using System.Text.Json;

namespace EComm.Payment.Providers.NetsEasy;

/// <summary>
/// Nets Easy hosted-checkout provider. Reads its per-market credentials as a strongly-typed
/// <see cref="NetsEasySettings"/>. This is the only place the Nets contract (line-item mapping,
/// minor units, webhook event names) lives.
/// </summary>
public class NetsEasyPaymentProvider : IPaymentProvider
{
    public string Alias => "nets-easy";

    public PaymentProviderDescriptor Descriptor => new()
    {
        Alias = Alias,
        DisplayName = "Nets Easy",
        Fields =
        [
            new() { Key = "secretApiKey", Label = "Secret API key", Type = PaymentFieldType.Secret, Required = true, HelpText = "Nets Easy secret key (server-side only)." },
            new() { Key = "checkoutKey", Label = "Checkout key", Type = PaymentFieldType.Text, HelpText = "Public checkout key (optional for hosted checkout)." },
            new() { Key = "testMode", Label = "Test mode", Type = PaymentFieldType.Bool, DefaultValue = "true", HelpText = "Use the Nets test environment." }
        ]
    };

    private static readonly JsonSerializerOptions WebhookJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly INetsEasyClient _nets;

    public NetsEasyPaymentProvider(INetsEasyClient nets)
    {
        _nets = nets;
    }

    public async Task<PaymentCreationResult?> CreatePaymentAsync(PaymentCreationContext context)
    {
        var order = context.Order;
        var market = context.Market;

        var settings = context.GetSettings<NetsEasySettings>();
        if (string.IsNullOrEmpty(settings.SecretApiKey))
            return null;
        var secretApiKey = settings.SecretApiKey;
        var testMode = settings.TestMode;

        var items = order.Items.Select(i => new NetsOrderItem
        {
            Reference = string.IsNullOrEmpty(i.Sku) ? i.ProductId : i.Sku,
            Name = i.ProductName,
            Quantity = i.Quantity,
            UnitPrice = ToMinorUnits(i.UnitPrice),
            NetTotalAmount = ToMinorUnits(i.Subtotal),
            GrossTotalAmount = ToMinorUnits(i.Subtotal)
        }).ToList();

        // Our tax/shipping are flat order-level amounts, not per-line — Nets requires
        // order.amount == sum(item.grossTotalAmount), so represent them as their own lines.
        if (order.Tax > 0)
            items.Add(FlatAmountLine("tax", "Tax", order.Tax));
        if (order.ShippingCost > 0)
            items.Add(FlatAmountLine("shipping", "Shipping", order.ShippingCost));

        var netsRequest = new NetsCreatePaymentRequest
        {
            Order = new NetsOrder
            {
                Items = items,
                Amount = ToMinorUnits(order.Total),
                Currency = market.Currency,
                Reference = order.OrderNumber
            },
            Checkout = new NetsCheckout
            {
                IntegrationType = "HostedPaymentPage",
                ReturnUrl = context.ReturnUrl,
                CancelUrl = context.CancelUrl,
                TermsUrl = context.TermsUrl
            }
        };

        var result = await _nets.CreatePaymentAsync(secretApiKey, testMode, netsRequest);
        if (result == null)
            return null;

        return new PaymentCreationResult
        {
            PaymentId = result.PaymentId,
            RedirectUrl = result.HostedPaymentPageUrl
        };
    }

    public async Task<WebhookResult?> HandleWebhookAsync(HttpRequest request)
    {
        // ponytail: no signature verification yet (Nets supports a per-webhook auth header, not wired up) —
        // add HMAC/shared-secret verification here before this handles real money in production.
        var envelope = await JsonSerializer.DeserializeAsync<NetsWebhookEnvelope>(request.Body, WebhookJsonOptions);
        if (envelope == null || string.IsNullOrEmpty(envelope.Data.PaymentId))
            return null;

        var newStatus = envelope.Event switch
        {
            "payment.checkout.completed" => "Authorized",
            "payment.charge.created.v2" => "Captured",
            _ => (string?)null
        };

        return new WebhookResult { PaymentReference = envelope.Data.PaymentId, NewStatus = newStatus };
    }

    private static NetsOrderItem FlatAmountLine(string reference, string name, decimal amount) => new()
    {
        Reference = reference,
        Name = name,
        Quantity = 1,
        UnitPrice = ToMinorUnits(amount),
        NetTotalAmount = ToMinorUnits(amount),
        GrossTotalAmount = ToMinorUnits(amount)
    };

    private static int ToMinorUnits(decimal amount) => (int)Math.Round(amount * 100, MidpointRounding.AwayFromZero);
}
