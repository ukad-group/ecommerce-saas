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
            new() { Key = "liveSecretKey", Label = "Live secret key", Type = PaymentFieldType.Secret, HelpText = "Your live Nets secret key (server-side only)." },
            new() { Key = "liveCheckoutKey", Label = "Live checkout key", Type = PaymentFieldType.Text, HelpText = "Your live Nets checkout key." },
            new() { Key = "testSecretKey", Label = "Test secret key", Type = PaymentFieldType.Secret, HelpText = "Your test Nets secret key (server-side only)." },
            new() { Key = "testCheckoutKey", Label = "Test checkout key", Type = PaymentFieldType.Text, HelpText = "Your test Nets checkout key." },
            new() { Key = "merchantTermsUrl", Label = "Merchant Terms URL", Type = PaymentFieldType.Text, HelpText = "The URL to the privacy and cookie settings of your webshop." },
            new() { Key = "merchantNumber", Label = "Merchant Number", Type = PaymentFieldType.Text, HelpText = "Only for Nets partners initiating checkout with partner keys — leave blank if you're using your webshop's own integration keys." },
            new() { Key = "testMode", Label = "Test mode", Type = PaymentFieldType.Bool, DefaultValue = "true", HelpText = "Use the Nets test environment (and the test keys above)." },
            new() { Key = "allowFetchingPaymentStatus", Label = "Allow Fetching Payment Status", Type = PaymentFieldType.Bool, DefaultValue = "false", HelpText = "Set whether fetching payment status from the payment provider API should be allowed." },
            new() { Key = "allowCancellingPayments", Label = "Allow Cancelling Payments", Type = PaymentFieldType.Bool, DefaultValue = "true", HelpText = "Set whether cancelling payments should be allowed." },
            new() { Key = "allowCapturingPayments", Label = "Allow Capturing Payments", Type = PaymentFieldType.Bool, DefaultValue = "true", HelpText = "Set whether capturing payments should be allowed." },
            new() { Key = "allowRefundingPayments", Label = "Allow Refunding Payments", Type = PaymentFieldType.Bool, DefaultValue = "false", HelpText = "Set whether refunding payments should be allowed." }
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
        var secretApiKey = settings.ActiveSecretKey;
        if (string.IsNullOrEmpty(secretApiKey))
            return null;
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
        if (order.PaymentFee > 0)
            items.Add(FlatAmountLine("payment-fee", "Payment fee", order.PaymentFee));
        if (order.PaymentFeeTax > 0)
            items.Add(FlatAmountLine("payment-fee-tax", "Payment fee tax", order.PaymentFeeTax));

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
                TermsUrl = context.TermsUrl,
                MerchantTermsUrl = NullIfBlank(settings.MerchantTermsUrl),
                Consumer = BuildConsumer(order)  // prefill (still editable) so the shopper doesn't re-type
            },
            MerchantNumber = NullIfBlank(settings.MerchantNumber)
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
            "payment.cancel.created" => "Cancelled",
            "payment.checkout.cancelled" => "Cancelled",
            _ => (string?)null
        };
        var succeeded = newStatus is "Authorized" or "Captured";

        return new WebhookResult { PaymentReference = envelope.Data.PaymentId, NewStatus = newStatus, Succeeded = succeeded };
    }

    // ----- Consumer prefill mapping (best-effort; omit anything Nets could reject) -----

    private static NetsConsumer? BuildConsumer(EComm.Data.Entities.Order order)
    {
        var customer = order.Customer;
        var address = order.ShippingAddress;
        var consumer = new NetsConsumer();
        var hasAny = false;

        if (!string.IsNullOrWhiteSpace(customer?.Email))
        {
            consumer.Email = customer.Email;
            hasAny = true;
        }

        // privatePerson requires BOTH names — only include when FullName splits into two.
        var fullName = customer?.FullName?.Trim();
        if (!string.IsNullOrEmpty(fullName))
        {
            var space = fullName.IndexOf(' ');
            if (space > 0)
            {
                consumer.PrivatePerson = new NetsPrivatePerson
                {
                    FirstName = fullName[..space].Trim(),
                    LastName = fullName[(space + 1)..].Trim()
                };
                hasAny = true;
            }
        }

        if (address != null && (!string.IsNullOrWhiteSpace(address.Street) || !string.IsNullOrWhiteSpace(address.City)))
        {
            consumer.ShippingAddress = new NetsAddress
            {
                AddressLine1 = NullIfBlank(address.Street),
                AddressLine2 = NullIfBlank(address.Street2),
                PostalCode = NullIfBlank(address.PostalCode),
                City = NullIfBlank(address.City),
                Country = ToAlpha3(address.Country)  // null when unmappable → omitted
            };
            hasAny = true;
        }

        return hasAny ? consumer : null;
    }

    private static string? NullIfBlank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    // ISO 3166-1 alpha-2 → alpha-3 for the currencies/markets we support; pass through valid alpha-3.
    private static readonly Dictionary<string, string> Alpha2To3 = new(StringComparer.OrdinalIgnoreCase)
    {
        ["SE"] = "SWE", ["NO"] = "NOR", ["DK"] = "DNK", ["FI"] = "FIN", ["GB"] = "GBR",
        ["US"] = "USA", ["DE"] = "DEU", ["FR"] = "FRA", ["NL"] = "NLD", ["PL"] = "POL",
        ["ES"] = "ESP", ["IT"] = "ITA", ["IE"] = "IRL", ["BE"] = "BEL", ["AT"] = "AUT",
        ["CH"] = "CHE", ["PT"] = "PRT", ["CA"] = "CAN", ["AU"] = "AUS"
    };

    private static string? ToAlpha3(string? country)
    {
        if (string.IsNullOrWhiteSpace(country)) return null;
        var c = country.Trim();
        if (c.Length == 3) return c.ToUpperInvariant();          // already alpha-3
        return Alpha2To3.TryGetValue(c, out var a3) ? a3 : null;  // unknown → omit
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
