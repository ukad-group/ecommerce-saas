using System.Security.Cryptography;
using System.Text;
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

    public PaymentProviderDescriptor Descriptor =>
        new()
        {
            Alias = Alias,
            DisplayName = "Nets Easy",
            ProviderFields =
            [
                new()
                {
                    Key = "liveSecretKey",
                    Label = "Live secret key",
                    Type = PaymentFieldType.Secret,
                    HelpText = "Your live Nets secret key (server-side only).",
                },
                new()
                {
                    Key = "liveCheckoutKey",
                    Label = "Live checkout key",
                    Type = PaymentFieldType.Text,
                    HelpText =
                        "Your live Nets checkout key. Only used by embedded checkout — the hosted payment page doesn't need it.",
                },
                new()
                {
                    Key = "testSecretKey",
                    Label = "Test secret key",
                    Type = PaymentFieldType.Secret,
                    HelpText = "Your test Nets secret key (server-side only).",
                },
                new()
                {
                    Key = "testCheckoutKey",
                    Label = "Test checkout key",
                    Type = PaymentFieldType.Text,
                    HelpText =
                        "Your test Nets checkout key. Only used by embedded checkout — the hosted payment page doesn't need it.",
                },
                new()
                {
                    Key = "merchantNumber",
                    Label = "Merchant Number",
                    Type = PaymentFieldType.Text,
                    HelpText =
                        "Only for Nets partners initiating checkout with partner keys — leave blank if you're using your webshop's own integration keys.",
                },
                new()
                {
                    Key = "merchantHandlesConsumerData",
                    Label = "Merchant handles consumer data",
                    Type = PaymentFieldType.Bool,
                    DefaultValue = "false",
                    HelpText =
                        "Off: Nets shows the customer fields on its page, prefilled from the order and still editable. On: your own checkout owns that data and Nets asks only for payment details.",
                },
                new()
                {
                    Key = "testMode",
                    Label = "Test mode",
                    Type = PaymentFieldType.Bool,
                    DefaultValue = "true",
                    HelpText = "Use the Nets test environment (and the test keys above).",
                },
            ],
        };

    private static readonly JsonSerializerOptions WebhookJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>
    /// The events we subscribe to per payment — exactly the ones <see cref="StateFor"/> maps, so we
    /// never ask Nets for traffic we ignore. Nets allows up to 32 webhooks per payment and rejects
    /// unknown event names, so only documented ones belong here. The <c>.v2</c> variants are
    /// registered rather than their v1 twins to avoid two deliveries of the same logical event.
    /// </summary>
    private static readonly string[] SubscribedEvents =
    [
        "payment.created",
        "payment.checkout.completed",
        "payment.reservation.created.v2",
        "payment.reservation.failed",
        "payment.charge.created.v2",
        "payment.charge.failed.v2",
        "payment.charge.failed",
        "payment.refund.completed",
        "payment.refund.failed",
        "payment.cancel.created",
        "payment.cancel.failed",
    ];

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

        // Tax rides on the lines' taxRate/taxAmount, so the rate has to come from the tax class
        // attached to this market's active payment provider (its surcharge names it).
        // ResolveGoodsTaxRate owns that lookup and its fallback, so we report exactly the rate the
        // order was priced with; the same class taxes the surcharge fee, so this covers that line too.
        var taxRate = market.Settings?.ResolveGoodsTaxRate(order.ShippingAddress?.Country) ?? 0m;
        var taxRateBps = taxRate > 0m
            ? (int)Math.Round(taxRate * 10000, MidpointRounding.AwayFromZero)
            : (int?)null;

        var goodsTaxMinor = ToMinorUnits(order.Tax);
        var netTotalMinor = order.Items.Sum(i => ToMinorUnits(i.Subtotal));

        var items = new List<NetsOrderItem>();
        int netSoFar = 0, taxSoFar = 0;
        foreach (var i in order.Items)
        {
            var net = ToMinorUnits(i.Subtotal);
            netSoFar += net;
            // Our tax is a flat order-level amount, so it is allocated over the lines rather than
            // recomputed from the rate: this line's share is the running rounded share minus what
            // earlier lines already got, which makes the lines sum to exactly goodsTaxMinor. Nets
            // rejects order.amount != sum(grossTotalAmount), and order.amount is the total we charge.
            // ponytail: taxRate is the class's current rate, taxAmount the order's snapshot — they can
            // only disagree if the class was edited between pricing and payment, and the money wins.
            var tax = netTotalMinor == 0
                ? 0
                : (int)Math.Round((decimal)goodsTaxMinor * netSoFar / netTotalMinor, MidpointRounding.AwayFromZero) - taxSoFar;
            taxSoFar += tax;

            items.Add(new NetsOrderItem
            {
                Reference = string.IsNullOrEmpty(i.Sku) ? i.ProductId : i.Sku,
                Name = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = ToMinorUnits(i.UnitPrice),
                TaxRate = tax > 0 ? taxRateBps : null,
                TaxAmount = tax > 0 ? tax : null,
                NetTotalAmount = net,
                GrossTotalAmount = net + tax,
            });
        }

        // Shipping and the surcharge fee are order-level amounts with no line of their own, and Nets
        // requires order.amount == sum(item.grossTotalAmount) — so they get one line each. Shipping
        // carries no tax (this platform never taxes ShippingCost); the fee carries its own.
        if (order.ShippingCost > 0)
            items.Add(FlatAmountLine("shipping", "Shipping", order.ShippingCost));
        if (order.PaymentFee > 0)
            items.Add(FlatAmountLine("payment-fee", "Payment fee", order.PaymentFee, order.PaymentFeeTax, taxRateBps));

        // Nets echoes this back in the Authorization header of every webhook for this payment, and
        // requires 8-64 alphanumeric characters — "N" gives exactly 32. The pipeline stores it on the
        // order and hands it back to VerifyWebhookAsync.
        var webhookSecret = Guid.NewGuid().ToString("N");

        var netsRequest = new NetsCreatePaymentRequest
        {
            Order = new NetsOrder
            {
                Items = items,
                Amount = ToMinorUnits(order.Total),
                Currency = market.Currency,
                Reference = order.OrderNumber,
            },
            Checkout = new NetsCheckout
            {
                IntegrationType = "HostedPaymentPage",
                ReturnUrl = context.Common.ContinueUrl,
                CancelUrl = context.Common.CancelUrl,
                TermsUrl = context.Common.TermsUrl,
                MerchantTermsUrl = NullIfBlank(context.Common.MerchantTermsUrl),
                Consumer = BuildConsumer(order), // prefill (still editable) so the shopper doesn't re-type
                MerchantHandlesConsumerData = settings.MerchantHandlesConsumerData,
                // consumerType drives which consumer fields the page renders — without it Nets has
                // nothing to prefill *into*. Nets ignores it when the merchant handles the data.
                ConsumerType = settings.MerchantHandlesConsumerData ? null : new NetsConsumerType(),
                CountryCode = ToAlpha3(order.ShippingAddress?.Country),
            },
            MerchantNumber = NullIfBlank(settings.MerchantNumber),
            // No public webhook URL configured (Payments:PublicBaseUrl) ⇒ register nothing rather than
            // point Nets at something it can't reach.
            Notifications = string.IsNullOrWhiteSpace(context.WebhookUrl)
                ? null
                : new NetsNotifications
                {
                    Webhooks = SubscribedEvents
                        .Select(eventName => new NetsWebhookSubscription
                        {
                            EventName = eventName,
                            Url = context.WebhookUrl,
                            Authorization = webhookSecret,
                        })
                        .ToList(),
                },
        };

        var result = await _nets.CreatePaymentAsync(secretApiKey, testMode, netsRequest);
        if (result == null)
            return null;

        return new PaymentCreationResult
        {
            PaymentId = result.PaymentId,
            RedirectUrl = WithLanguage(result.HostedPaymentPageUrl, context.Common.Language),
            // Only meaningful if we actually registered webhooks carrying it.
            WebhookSecret = string.IsNullOrWhiteSpace(context.WebhookUrl) ? null : webhookSecret,
        };
    }

    /// <summary>
    /// Nets takes the hosted page's language as a <c>language</c> query parameter on the URL it hands
    /// back — there is no language field in the create-payment body. Unknown or unsupported codes fall
    /// back to Nets' default, so the value goes through as configured.
    /// </summary>
    private static string? WithLanguage(string? hostedPageUrl, string language)
    {
        if (string.IsNullOrWhiteSpace(hostedPageUrl) || string.IsNullOrWhiteSpace(language))
            return hostedPageUrl;

        var separator = hostedPageUrl.Contains('?') ? '&' : '?';
        return $"{hostedPageUrl}{separator}language={Uri.EscapeDataString(language.Trim())}";
    }

    /// <summary>
    /// Nets sends back the per-payment <c>authorization</c> value we registered, verbatim, in the
    /// HTTP Authorization header. Constant-time compare against the secret stored for that payment.
    /// </summary>
    public async Task<bool> VerifyWebhookAsync(WebhookContext context)
    {
        var envelope = await ReadEnvelopeAsync(context.Request);
        if (envelope == null || string.IsNullOrEmpty(envelope.Data.PaymentId))
            return true; // unparseable — HandleWebhookAsync drops it anyway; nothing to protect

        var expected = context.ResolveSettings(envelope.Data.PaymentId)?.PaymentWebhookSecret;
        if (string.IsNullOrEmpty(expected))
            return true; // payment predates webhook verification (or we registered no webhooks)

        var presented = context.Request.Headers.Authorization.ToString();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(presented),
            Encoding.UTF8.GetBytes(expected)
        );
    }

    public async Task<IReadOnlyList<WebhookResult>> HandleWebhookAsync(WebhookContext context)
    {
        var envelope = await ReadEnvelopeAsync(context.Request);
        if (envelope == null || string.IsNullOrEmpty(envelope.Data.PaymentId))
            return [];

        return
        [
            new WebhookResult
            {
                PaymentReference = envelope.Data.PaymentId,
                IdempotencyKey = envelope.Id, // Nets sends a unique event id on every delivery
                EventName = envelope.Event,
                NewState = StateFor(envelope.Event),
                Error = ToPaymentError(envelope.Data.Error),
            },
        ];
    }

    /// <summary>
    /// Nets' event vocabulary → the generic lifecycle. Events that report a problem with a *later*
    /// operation (refund/cancel failed) leave the payment's own state alone; their error is carried
    /// on the result instead. Keep this in sync with <see cref="SubscribedEvents"/>.
    /// </summary>
    private static PaymentState? StateFor(string eventName) =>
        eventName switch
        {
            "payment.created" => PaymentState.Initialized,
            "payment.checkout.completed"
            or "payment.reservation.created"
            or "payment.reservation.created.v2" => PaymentState.Authorized,
            "payment.charge.created" or "payment.charge.created.v2" => PaymentState.Captured,
            "payment.reservation.failed"
            or "payment.charge.failed"
            or "payment.charge.failed.v2" => PaymentState.Failed,
            "payment.cancel.created" or "payment.checkout.cancelled" => PaymentState.Cancelled,
            "payment.refund.completed" => PaymentState.Refunded,
            _ => null,
        };

    private static PaymentError? ToPaymentError(NetsWebhookError? error)
    {
        if (error == null || (string.IsNullOrWhiteSpace(error.Code) && string.IsNullOrWhiteSpace(error.Message)))
            return null;

        return new PaymentError
        {
            Code = error.Code,
            Message = string.IsNullOrWhiteSpace(error.Source)
                ? error.Message
                : $"{error.Message} (source: {error.Source})",
        };
    }

    /// <summary>Reads the envelope from the (buffered) request body, rewinding first — the pipeline
    /// reads the body more than once, for verification and then for parsing.</summary>
    private static async Task<NetsWebhookEnvelope?> ReadEnvelopeAsync(HttpRequest request)
    {
        if (request.Body.CanSeek)
            request.Body.Position = 0;

        try
        {
            return await JsonSerializer.DeserializeAsync<NetsWebhookEnvelope>(request.Body, WebhookJsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    // ----- Consumer prefill mapping -----
    //
    // Nets validates this block strictly and drops (or rejects) anything that doesn't satisfy its
    // documented shape, which is why a half-filled consumer shows up as an *empty* checkout rather
    // than a partly-filled one. Rules honoured here:
    //   - shippingAddress needs addressLine1 + postalCode + city + alpha-3 country. All four or none.
    //   - phoneNumber needs prefix ^[+]\d{1,3}$ and a digits-only number. Both or neither.
    //   - privatePerson needs both names; privatePerson and company are mutually exclusive.
    //   - < > ' " & \ are unsupported in most fields, and most strings cap at 128 characters.

    private static NetsConsumer? BuildConsumer(EComm.Data.Entities.Order order)
    {
        var customer = order.Customer;
        var address = order.ShippingAddress;
        var consumer = new NetsConsumer();
        var hasAny = false;

        if (!string.IsNullOrWhiteSpace(customer?.Email))
        {
            consumer.Email = Clean(customer.Email);
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
                    FirstName = Clean(fullName[..space]),
                    LastName = Clean(fullName[(space + 1)..]),
                };
                hasAny = true;
            }
        }

        if (BuildPhone(customer?.Phone, address?.Country) is { } phone)
        {
            consumer.PhoneNumber = phone;
            hasAny = true;
        }

        // All-or-nothing: a partial address is worse than none, because Nets discards the whole
        // consumer block rather than the one bad field.
        var addressLine1 = NullIfBlank(address?.Street);
        var postalCode = NullIfBlank(address?.PostalCode);
        var city = NullIfBlank(address?.City);
        var country = ToAlpha3(address?.Country);
        if (addressLine1 != null && postalCode != null && city != null && country != null)
        {
            consumer.ShippingAddress = new NetsAddress
            {
                AddressLine1 = Clean(addressLine1),
                AddressLine2 = NullIfBlank(address!.Street2) is { } line2 ? Clean(line2) : null,
                PostalCode = Clean(postalCode),
                City = Clean(city),
                Country = country,
            };
            hasAny = true;
        }

        return hasAny ? consumer : null;
    }

    /// <summary>
    /// Splits a free-form phone into Nets' <c>prefix</c> (^[+]\d{1,3}$) + digits-only national
    /// number. Returns null unless both come out valid — a malformed phone fails the whole
    /// create-payment call, and no prefill beats a rejected payment.
    /// <para>
    /// A number already carrying a country code is matched against the codes we know; one in local
    /// format takes its code from the shipping country. Anything else is omitted rather than guessed
    /// at — the calling code's length cannot be inferred from the number.
    /// </para>
    /// </summary>
    private static NetsPhone? BuildPhone(string? phone, string? country)
    {
        var trimmed = phone?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return null;

        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length == 0)
            return null;

        string? prefix;
        if (trimmed.StartsWith('+') || digits.StartsWith("00"))
        {
            if (digits.StartsWith("00")) digits = digits[2..];
            prefix = KnownCallingCodes.FirstOrDefault(digits.StartsWith);
            if (prefix == null)
                return null; // country code we don't recognise — omit rather than send a bad one
            digits = digits[prefix.Length..];
        }
        else if (country != null && Alpha2ToCallingCode.TryGetValue(country.Trim(), out var code))
        {
            prefix = code;
            digits = digits.TrimStart('0'); // national trunk prefix
        }
        else
        {
            return null;
        }

        return digits.Length >= 4 ? new NetsPhone { Prefix = $"+{prefix}", Number = digits } : null;
    }

    /// <summary>Strips the characters Nets rejects and caps length, so one apostrophe in a surname
    /// can't fail the whole create-payment call.</summary>
    private static string Clean(string value)
    {
        var cleaned = new string(value.Where(c => !"<>'\"&\\".Contains(c)).ToArray()).Trim();
        return cleaned.Length > 128 ? cleaned[..128] : cleaned;
    }

    private static string? NullIfBlank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    // Country calling codes for the same countries Alpha2To3 covers. Used both to recognise a code
    // a phone already carries and to supply one for a locally-formatted number.
    private static readonly Dictionary<string, string> Alpha2ToCallingCode = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["SE"] = "46",
        ["NO"] = "47",
        ["DK"] = "45",
        ["FI"] = "358",
        ["GB"] = "44",
        ["US"] = "1",
        ["DE"] = "49",
        ["FR"] = "33",
        ["NL"] = "31",
        ["PL"] = "48",
        ["ES"] = "34",
        ["IT"] = "39",
        ["IE"] = "353",
        ["BE"] = "32",
        ["AT"] = "43",
        ["CH"] = "41",
        ["PT"] = "351",
        ["CA"] = "1",
        ["AU"] = "61",
    };

    /// <summary>Longest first, so "358" wins over "35" and "46" over "4".</summary>
    private static readonly string[] KnownCallingCodes = Alpha2ToCallingCode
        .Values.Distinct()
        .OrderByDescending(c => c.Length)
        .ToArray();

    // ISO 3166-1 alpha-2 → alpha-3 for the currencies/markets we support; pass through valid alpha-3.
    private static readonly Dictionary<string, string> Alpha2To3 = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["SE"] = "SWE",
        ["NO"] = "NOR",
        ["DK"] = "DNK",
        ["FI"] = "FIN",
        ["GB"] = "GBR",
        ["US"] = "USA",
        ["DE"] = "DEU",
        ["FR"] = "FRA",
        ["NL"] = "NLD",
        ["PL"] = "POL",
        ["ES"] = "ESP",
        ["IT"] = "ITA",
        ["IE"] = "IRL",
        ["BE"] = "BEL",
        ["AT"] = "AUT",
        ["CH"] = "CHE",
        ["PT"] = "PRT",
        ["CA"] = "CAN",
        ["AU"] = "AUS",
        ["UA"] = "UKR",
    };

    private static string? ToAlpha3(string? country)
    {
        if (string.IsNullOrWhiteSpace(country))
            return null;
        var c = country.Trim();
        if (c.Length == 3)
            return c.ToUpperInvariant(); // already alpha-3
        return Alpha2To3.TryGetValue(c, out var a3) ? a3 : null; // unknown → omit
    }

    /// <summary>A single-unit line for an order-level amount. <paramref name="tax"/> is that amount's
    /// own tax (0 for untaxed ones), and <paramref name="taxRateBps"/> the rate it was taxed at.</summary>
    private static NetsOrderItem FlatAmountLine(
        string reference,
        string name,
        decimal amount,
        decimal tax = 0m,
        int? taxRateBps = null
    )
    {
        var net = ToMinorUnits(amount);
        var taxMinor = ToMinorUnits(tax);
        return new NetsOrderItem
        {
            Reference = reference,
            Name = name,
            Quantity = 1,
            UnitPrice = net,
            TaxRate = taxMinor > 0 ? taxRateBps : null,
            TaxAmount = taxMinor > 0 ? taxMinor : null,
            NetTotalAmount = net,
            GrossTotalAmount = net + taxMinor,
        };
    }

    private static int ToMinorUnits(decimal amount) =>
        (int)Math.Round(amount * 100, MidpointRounding.AwayFromZero);
}
