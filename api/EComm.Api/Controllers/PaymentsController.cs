using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Api.Services;
using EComm.Payment;
using Microsoft.AspNetCore.Authorization;

namespace EComm.Api.Controllers;

[ApiController]
public class PaymentsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;
    private readonly IPaymentProviderResolver _resolver;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentProviderResolver resolver,
        IConfiguration configuration,
        ILogger<PaymentsController> logger)
    {
        _resolver = resolver;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Lists every registered payment provider with its settings schema — the catalog a backoffice
    /// offers when adding a provider to a market. No secrets here (schema only).
    /// </summary>
    [HttpGet("api/v1/payments/providers")]
    public ActionResult GetProviders() => Ok(_resolver.Descriptors);

    /// <summary>
    /// Starts a payment for an order using the market's configured provider and returns the URL to
    /// redirect the customer to. Authenticated (JWT or X-API-Key): this spends against the market's
    /// live gateway credentials, so it must not be reachable with just a guessed order id.
    /// </summary>
    [Authorize]
    [HttpPost("api/v1/orders/{id}/payment")]
    public async Task<ActionResult> CreatePayment(string id)
    {
        var order = _store.GetOrder(id);
        if (order == null) return NotFound();

        var market = _store.GetMarket(order.MarketId);
        if (market == null) return BadRequest(new { message = "Order market not found" });

        var provider = _resolver.ResolveForMarket(market);
        if (provider == null)
            return BadRequest(new { message = "No payment provider is configured for this market" });

        // Where the customer goes next comes from the provider's settings for this market, not from
        // the caller — so a storefront can't send a payment somewhere the market never configured.
        var settingsJson = ProviderSettingsFor(market, provider.Alias);
        var common = PaymentSettings.Read<PaymentCommonSettings>(settingsJson);
        if (common.Validate() is { } problem)
            return BadRequest(new { message = problem, errorUrl = common.ErrorUrl });

        var result = await provider.CreatePaymentAsync(new PaymentCreationContext
        {
            Order = order,
            Market = market,
            ProviderSettingsJson = settingsJson,
            Common = common,
            WebhookUrl = WebhookUrlFor(provider.Alias)
        });

        if (result == null)
            return StatusCode(502, new
            {
                message = "Payment provider could not create the payment",
                errorUrl = common.ErrorUrl
            });

        order.PaymentReference = result.PaymentId;
        order.PaymentStatus = nameof(PaymentState.Initialized);
        order.PaymentWebhookSecret = result.WebhookSecret;
        order.PaymentError = null;
        order.UpdatedAt = DateTime.UtcNow;
        _store.UpdateOrder(order);

        return Ok(new { paymentId = result.PaymentId, redirectUrl = result.RedirectUrl });
    }

    /// <summary>
    /// Payment status webhook. The optional <c>{provider}</c> segment selects which provider parses
    /// the body; when omitted the default/sole provider is used (so an existing callback URL without
    /// the segment keeps working).
    /// <para>
    /// Gateways deliver at-least-once and out of order, so this is an idempotent consumer: every
    /// event is recorded by key before it is applied, and a payment state may only ever advance.
    /// Anything parseable is acked with 200 — a non-200 just makes the gateway retry. The one
    /// exception is a failed signature check, which must not be acked.
    /// </para>
    /// </summary>
    [AllowAnonymous]
    [HttpPost("api/v1/payments/webhook/{provider?}")]
    public async Task<ActionResult> HandleWebhook(string? provider)
    {
        var paymentProvider = _resolver.Resolve(provider);
        if (paymentProvider == null) return Ok(); // Unknown provider — ack anyway so the gateway stops retrying

        // Providers read the body more than once: once to find the payment for verification, again to
        // parse it. Some also hash the raw bytes for an HMAC.
        Request.EnableBuffering();

        // One request can carry events for several payments (some gateways batch), so memoise.
        var orders = new Dictionary<string, Order?>(StringComparer.Ordinal);
        Order? OrderFor(string reference)
        {
            if (!orders.TryGetValue(reference, out var order))
                orders[reference] = order = _store.GetOrderByPaymentReference(reference);
            return order;
        }

        var context = new WebhookContext
        {
            Request = Request,
            ResolveSettings = reference =>
            {
                var order = OrderFor(reference);
                if (order == null) return null;
                var market = _store.GetMarket(order.MarketId);
                return new WebhookSettings
                {
                    ProviderSettingsJson = market == null ? null : ProviderSettingsFor(market, paymentProvider.Alias),
                    PaymentWebhookSecret = order.PaymentWebhookSecret
                };
            }
        };

        if (!await paymentProvider.VerifyWebhookAsync(context))
        {
            _logger.LogWarning("Rejected a {Provider} webhook that failed verification", paymentProvider.Alias);
            return Unauthorized();
        }

        foreach (var result in await paymentProvider.HandleWebhookAsync(context))
        {
            if (string.IsNullOrEmpty(result.PaymentReference)) continue;

            var order = OrderFor(result.PaymentReference);
            if (order == null)
            {
                _logger.LogWarning("{Provider} webhook {Event} for unknown payment {Reference}",
                    paymentProvider.Alias, result.EventName, result.PaymentReference);
                continue; // ack anyway so the gateway stops retrying
            }

            var recorded = _store.TryRecordWebhookEvent(new PaymentWebhookEvent
            {
                Id = $"{paymentProvider.Alias}:{DeduplicationKey(result)}",
                Provider = paymentProvider.Alias,
                EventName = result.EventName,
                PaymentReference = result.PaymentReference,
                OrderId = order.Id,
                ReceivedAt = DateTime.UtcNow
            });

            if (!recorded)
            {
                _logger.LogInformation("Skipped a redelivered {Provider} webhook {Event} for {Reference}",
                    paymentProvider.Alias, result.EventName, result.PaymentReference);
                continue;
            }

            Apply(result, order);
        }

        return Ok();
    }

    /// <summary>Applies one already-deduplicated event to its order.</summary>
    private void Apply(WebhookResult result, Order order)
    {
        var changed = false;

        if (result.Error != null)
        {
            order.PaymentError = string.IsNullOrEmpty(result.Error.Code)
                ? result.Error.Message
                : $"{result.Error.Code}: {result.Error.Message}";
            _logger.LogWarning("Payment {Reference} reported {Event}: {Error}",
                result.PaymentReference, result.EventName, order.PaymentError);
            changed = true;
        }

        // Out-of-order delivery is normal, so a late lower state must not undo a higher one.
        if (result.NewState is { } state && PaymentStates.Advances(order.PaymentStatus, state))
        {
            order.PaymentStatus = state.ToString();
            changed = true;

            // On a successful payment, advance the order status to the market's configured value
            // (regardless of which provider handled the payment), defaulting to "paid". Routed
            // through the shared service so stock is reserved and a tracking number issued, exactly
            // as when an operator marks the order paid by hand.
            if (state is PaymentState.Authorized or PaymentState.Captured)
            {
                var market = _store.GetMarket(order.MarketId);
                var orderStatus = market?.Settings?.OrderStatusAfterPayment;
                var error = OrderStatusService.ApplyStatus(
                    order, string.IsNullOrWhiteSpace(orderStatus) ? "paid" : orderStatus, market);

                // The money is already taken, so a stock shortfall can't undo the payment — record
                // the payment state, leave the order status alone and shout about it.
                if (error != null)
                    _logger.LogError("Payment {Reference} succeeded but the order could not be advanced: {Error}",
                        result.PaymentReference, error);
            }
        }

        if (changed)
        {
            order.UpdatedAt = DateTime.UtcNow;
            _store.UpdateOrder(order);
        }
    }

    /// <summary>
    /// The provider's own key when it has one, else a hash of the raw body. Several gateways send no
    /// event id at all, so this fallback is a normal path rather than a safety net.
    /// </summary>
    private string DeduplicationKey(WebhookResult result)
    {
        if (!string.IsNullOrEmpty(result.IdempotencyKey)) return result.IdempotencyKey;

        Request.Body.Position = 0;
        return Convert.ToHexString(SHA256.HashData(Request.Body));
    }

    private static JsonElement? ProviderSettingsFor(Market market, string alias)
        => market.Settings?.PaymentProviders is { } bag && bag.TryGetValue(alias, out var element)
            ? element
            : null;

    /// <summary>
    /// Where this provider's gateway should send status updates. Configured explicitly, because the
    /// gateway calls us from the internet: the request's own host is only right when the API is
    /// already publicly reachable, and locally it has to be the tunnel's URL.
    /// </summary>
    private string WebhookUrlFor(string alias)
    {
        var baseUrl = _configuration["Payments:PublicBaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
            baseUrl = $"{Request.Scheme}://{Request.Host}";

        return $"{baseUrl.TrimEnd('/')}/api/v1/payments/webhook/{alias}";
    }
}
