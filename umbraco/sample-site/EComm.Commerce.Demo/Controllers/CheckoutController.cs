using EComm.Commerce.Demo.Models;
using EComm.Commerce.Demo.Services;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Commerce.Demo.Controllers;

[Route("checkout")]
public class CheckoutController : Controller
{
    private readonly StoreCartService _cartService;

    public CheckoutController(StoreCartService cartService)
    {
        _cartService = cartService;
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

        // Auto-pay (demo checkout - simulate successful payment)
        var (paidOrder, payError) = await _cartService.PayOrderAsync(order.Id);
        if (paidOrder == null)
        {
            ModelState.AddModelError(string.Empty, payError ?? "Payment could not be processed. Please try again.");
            ViewBag.Cart = await _cartService.GetCartAsync(sessionId);
            return View("Index", form);
        }

        // Clear cart count in cookie - stock has been deducted
        Response.Cookies.Append("ecomm_cart_count", "0", new CookieOptions
        {
            HttpOnly = false,
            Expires = DateTimeOffset.UtcNow.AddDays(90),
            SameSite = SameSiteMode.Lax,
            IsEssential = true
        });

        return RedirectToAction(nameof(Confirmation), new { id = paidOrder.Id });
    }

    [HttpGet("confirmation/{id}")]
    public async Task<IActionResult> Confirmation(string id)
    {
        var order = await _cartService.GetOrderAsync(id);
        if (order == null) return NotFound();
        return View(order);
    }
}
