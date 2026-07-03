using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Api.Payments;

namespace EComm.Api.Controllers;

[ApiController]
public class PaymentsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;
    private readonly NetsEasyClient _nets;

    public PaymentsController(NetsEasyClient nets)
    {
        _nets = nets;
    }

    /// <summary>
    /// Starts a Nets Easy payment for an order and returns the URL to redirect the customer to.
    /// </summary>
    [HttpPost("api/v1/orders/{id}/payment")]
    public async Task<ActionResult> CreatePayment(string id, [FromBody] CreatePaymentRequest request)
    {
        var order = _store.GetOrder(id);
        if (order == null) return NotFound();

        var market = _store.GetMarket(order.MarketId);
        var secretApiKey = market?.Settings?.NetsSecretApiKey;
        if (string.IsNullOrEmpty(secretApiKey))
            return BadRequest(new { message = "Market has no Nets Easy secret API key configured" });
        var testMode = market!.Settings!.NetsTestMode;

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
                ReturnUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl,
                TermsUrl = request.TermsUrl
            }
        };

        var result = await _nets.CreatePaymentAsync(secretApiKey, testMode, netsRequest);
        if (result == null)
            return StatusCode(502, new { message = "Failed to create payment with Nets Easy" });

        order.PaymentReference = result.PaymentId;
        order.PaymentStatus = "Initialized";
        order.UpdatedAt = DateTime.UtcNow;
        _store.UpdateOrder(order);

        return Ok(new { paymentId = result.PaymentId, redirectUrl = result.HostedPaymentPageUrl });
    }

    /// <summary>
    /// Nets Easy calls this when a payment's status changes (checkout completed, charge created, etc).
    /// ponytail: no signature verification yet (Nets supports a per-webhook auth header, not wired up) —
    /// add HMAC/shared-secret verification here before this handles real money in production.
    /// </summary>
    [HttpPost("api/v1/payments/webhook")]
    public ActionResult HandleWebhook([FromBody] NetsWebhookEnvelope envelope)
    {
        var order = _store.GetAllOrders().FirstOrDefault(o => o.PaymentReference == envelope.Data.PaymentId);
        if (order == null) return Ok(); // Unknown payment — ack anyway so Nets stops retrying

        var newStatus = envelope.Event switch
        {
            "payment.checkout.completed" => "Authorized",
            "payment.charge.created.v2" => "Captured",
            _ => (string?)null
        };

        if (newStatus != null)
        {
            order.PaymentStatus = newStatus;
            order.UpdatedAt = DateTime.UtcNow;
            _store.UpdateOrder(order);
        }

        return Ok();
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
