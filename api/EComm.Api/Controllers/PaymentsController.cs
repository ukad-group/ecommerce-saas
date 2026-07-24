using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Payment;

namespace EComm.Api.Controllers;

[ApiController]
public class PaymentsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;
    private readonly IPaymentProviderResolver _resolver;

    public PaymentsController(IPaymentProviderResolver resolver)
    {
        _resolver = resolver;
    }

    /// <summary>
    /// Lists every registered payment provider with its settings schema — the catalog a backoffice
    /// offers when adding a provider to a market. No secrets here (schema only).
    /// </summary>
    [HttpGet("api/v1/payments/providers")]
    public ActionResult GetProviders() => Ok(_resolver.Descriptors);

    /// <summary>
    /// Starts a payment for an order using the market's configured provider and returns the URL to
    /// redirect the customer to.
    /// </summary>
    [HttpPost("api/v1/orders/{id}/payment")]
    public async Task<ActionResult> CreatePayment(string id, [FromBody] CreatePaymentRequest request)
    {
        var order = _store.GetOrder(id);
        if (order == null) return NotFound();

        var market = _store.GetMarket(order.MarketId);
        if (market == null) return BadRequest(new { message = "Order market not found" });

        var provider = _resolver.ResolveForMarket(market);
        if (provider == null)
            return BadRequest(new { message = "No payment provider is configured for this market" });

        JsonElement? providerSettings = market.Settings?.PaymentProviders is { } bag && bag.TryGetValue(provider.Alias, out var element)
            ? element
            : null;

        var result = await provider.CreatePaymentAsync(new PaymentCreationContext
        {
            Order = order,
            Market = market,
            ProviderSettingsJson = providerSettings,
            ReturnUrl = request.ReturnUrl,
            CancelUrl = request.CancelUrl,
            TermsUrl = request.TermsUrl
        });

        if (result == null)
            return StatusCode(502, new { message = "Payment provider could not create the payment" });

        order.PaymentReference = result.PaymentId;
        order.PaymentStatus = "Initialized";
        order.UpdatedAt = DateTime.UtcNow;
        _store.UpdateOrder(order);

        return Ok(new { paymentId = result.PaymentId, redirectUrl = result.RedirectUrl });
    }

    /// <summary>
    /// Payment status webhook. The optional <c>{provider}</c> segment selects which provider parses
    /// the body; when omitted the default/sole provider is used (so an existing callback URL without
    /// the segment keeps working).
    /// </summary>
    [HttpPost("api/v1/payments/webhook/{provider?}")]
    public async Task<ActionResult> HandleWebhook(string? provider)
    {
        var paymentProvider = _resolver.Resolve(provider);
        if (paymentProvider == null) return Ok(); // Unknown provider — ack anyway so the gateway stops retrying

        var result = await paymentProvider.HandleWebhookAsync(Request);
        if (result == null || string.IsNullOrEmpty(result.PaymentReference))
            return Ok();

        var order = _store.GetAllOrders().FirstOrDefault(o => o.PaymentReference == result.PaymentReference);
        if (order == null) return Ok(); // Unknown payment — ack anyway so the gateway stops retrying

        var changed = false;

        if (!string.IsNullOrEmpty(result.NewStatus))
        {
            order.PaymentStatus = result.NewStatus;
            changed = true;
        }

        // On a successful payment, advance the order status to the provider's configured value.
        if (result.Succeeded)
        {
            var market = _store.GetMarket(order.MarketId);
            JsonElement? providerSettings =
                market?.Settings?.PaymentProviders is { } bag && bag.TryGetValue(paymentProvider.Alias, out var el)
                    ? el
                    : null;

            string? orderStatus;
            if (providerSettings.HasValue)
            {
                orderStatus = paymentProvider.SuccessOrderStatus(providerSettings.Value);
            }
            else
            {
                using var empty = JsonDocument.Parse("{}");
                orderStatus = paymentProvider.SuccessOrderStatus(empty.RootElement);
            }

            if (!string.IsNullOrEmpty(orderStatus))
            {
                order.Status = orderStatus;
                changed = true;
            }
        }

        if (changed)
        {
            order.UpdatedAt = DateTime.UtcNow;
            _store.UpdateOrder(order);
        }

        return Ok();
    }
}
