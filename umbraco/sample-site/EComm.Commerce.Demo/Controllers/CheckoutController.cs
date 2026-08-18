using EComm.Commerce.Demo.Models;
using EComm.Commerce.Demo.Services;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Commerce.Demo.Controllers;

[Route("checkout")]
public class CheckoutController : Controller
{
    private readonly StoreCartService _cartService;
    private readonly ILogger<CheckoutController> _logger;

    /// <summary>
    /// Whether checkout may fall back to marking the order paid when a real payment can't be
    /// started. On for the demo out of the box; turn it OFF (Checkout:DemoAutoPay = false in
    /// appsettings) as soon as a provider is configured for real, otherwise a misconfigured
    /// provider quietly produces "paid" orders that were never paid.
    /// </summary>
    private readonly bool _demoAutoPay;

    public CheckoutController(
        StoreCartService cartService,
        IConfiguration configuration,
        ILogger<CheckoutController> logger)
    {
        _cartService = cartService;
        _logger = logger;
        _demoAutoPay = configuration.GetValue("Checkout:DemoAutoPay", true);
    }

    private string? GetSessionId() => Request.Cookies["ecomm_session"];

    [HttpGet("")]
    public async Task<IActionResult> Index()
    {
        var sessionId = GetSessionId();
        if (string.IsNullOrEmpty(sessionId))
            return RedirectToAction("Index", "Cart");

        var cart = await _cartService.GetCartAsync(sessionId);
        if (cart == null || cart.Items.Count == 0)
            return RedirectToAction("Index", "Cart");

        ViewBag.Cart = cart;
        return View(new CheckoutFormModel());
    }

    [HttpPost("")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> PlaceOrder(CheckoutFormModel form)
    {
        var sessionId = GetSessionId();
        if (string.IsNullOrEmpty(sessionId))
            return RedirectToAction("Index", "Cart");

        if (!ModelState.IsValid)
        {
            ViewBag.Cart = await _cartService.GetCartAsync(sessionId);
            return View("Index", form);
        }

        // Create the order from the cart
        var (order, createError) = await _cartService.CreateOrderAsync(sessionId, form);
        if (order == null)
        {
            ModelState.AddModelError(string.Empty, createError ?? "Failed to create order. Please try again.");
            ViewBag.Cart = await _cartService.GetCartAsync(sessionId);
            return View("Index", form);
        }

        // The shopper leaves the site for the provider's hosted page, so remember which order
        // they are paying for - the return URLs are static settings on the market and carry no
        // order id.
        RememberPendingOrder(order.Id);

        var (payment, payError) = await _cartService.CreatePaymentAsync(order.Id);

        if (!string.IsNullOrEmpty(payment?.RedirectUrl))
        {
            // Off to the provider. The order only becomes paid when their webhook reaches the
            // API - the shopper coming back to /checkout/complete is not proof of payment.
            return Redirect(payment.RedirectUrl);
        }

        // Real payment could not be started. Note this is NOT only the "no provider" case: with a
        // single provider registered the resolver picks it by default, so an unconfigured market
        // fails on its provider settings instead (e.g. "Continue URL is required"). Either way the
        // market isn't ready to take money.
        if (_demoAutoPay)
        {
            _logger.LogWarning(
                "Falling back to demo auto-pay for order {OrderId} - real payment could not start: {Error}",
                order.Id, payError);

            var (paidOrder, demoPayError) = await _cartService.PayOrderAsync(order.Id);
            if (paidOrder == null)
            {
                ModelState.AddModelError(string.Empty, demoPayError ?? "Payment could not be processed. Please try again.");
                ViewBag.Cart = await _cartService.GetCartAsync(sessionId);
                return View("Index", form);
            }

            ClearPendingOrder();
            ClearCartCountCookie();

            // Deliberately no notice on the receipt: with no provider set up this is the demo
            // checkout behaving exactly as it did before, and the page already says Demo Mode.
            // The reason is in the log above for anyone diagnosing a provider that should work.
            return RedirectToAction(nameof(Confirmation), new { id = paidOrder.Id });
        }

        ModelState.AddModelError(string.Empty, payError ?? "Payment could not be started. Please try again.");
        ViewBag.Cart = await _cartService.GetCartAsync(sessionId);
        return View("Index", form);
    }

    /// <summary>
    /// Continue URL target. The provider sends the shopper here after the hosted page; it means
    /// "the shopper came back", not "the money arrived" - the webhook decides that - so the order
    /// is re-read and an unpaid order is shown as still processing rather than as confirmed.
    /// </summary>
    [HttpGet("complete")]
    public async Task<IActionResult> Complete()
    {
        var orderId = Request.Cookies[PendingOrderCookie];
        if (string.IsNullOrEmpty(orderId)) return RedirectToAction("Index", "Cart");

        var order = await _cartService.GetOrderAsync(orderId);
        if (order == null) return RedirectToAction("Index", "Cart");

        ClearPendingOrder();
        ClearCartCountCookie();

        if (IsSettled(order)) return RedirectToAction(nameof(Confirmation), new { id = order.Id });

        // Paid at the gateway but the webhook hasn't landed yet - normal, and not an error.
        return View("Processing", order);
    }

    /// <summary>Cancel URL target - the shopper backed out on the provider's page.</summary>
    [HttpGet("cancelled")]
    public async Task<IActionResult> Cancelled()
    {
        var order = await ReadPendingOrderAsync();
        ClearPendingOrder();
        return View("Cancelled", order);
    }

    /// <summary>Error URL target - the provider or the API refused the payment.</summary>
    [HttpGet("failed")]
    public async Task<IActionResult> Failed()
    {
        var order = await ReadPendingOrderAsync();
        ClearPendingOrder();
        return View("Failed", order);
    }

    private const string PendingOrderCookie = "ecomm_pending_order";

    private static bool IsSettled(OrderDto order) =>
        order.Status.Equals("paid", StringComparison.OrdinalIgnoreCase) ||
        order.Status.Equals("completed", StringComparison.OrdinalIgnoreCase);

    private async Task<OrderDto?> ReadPendingOrderAsync()
    {
        var orderId = Request.Cookies[PendingOrderCookie];
        return string.IsNullOrEmpty(orderId) ? null : await _cartService.GetOrderAsync(orderId);
    }

    private void RememberPendingOrder(string orderId) =>
        Response.Cookies.Append(PendingOrderCookie, orderId, new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(2)
        });

    private void ClearPendingOrder() => Response.Cookies.Delete(PendingOrderCookie);

    private void ClearCartCountCookie() =>
        Response.Cookies.Append("ecomm_cart_count", "0", new CookieOptions
        {
            HttpOnly = false,
            Expires = DateTimeOffset.UtcNow.AddDays(90),
            SameSite = SameSiteMode.Lax,
            IsEssential = true
        });

    [HttpGet("confirmation/{id}")]
    public async Task<IActionResult> Confirmation(string id)
    {
        var order = await _cartService.GetOrderAsync(id);
        if (order == null) return NotFound();
        return View(order);
    }
}
