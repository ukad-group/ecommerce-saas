using EComm.Commerce.Demo.Models;
using EComm.Commerce.Demo.Services;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Commerce.Demo.Controllers;

[Route("cart")]
public class CartController : Controller
{
    private readonly StoreCartService _cartService;

    public CartController(StoreCartService cartService)
    {
        _cartService = cartService;
    }

    private string GetOrCreateSessionId()
    {
        var sessionId = Request.Cookies["ecomm_session"];
        if (string.IsNullOrEmpty(sessionId))
        {
            sessionId = Guid.NewGuid().ToString();
            Response.Cookies.Append("ecomm_session", sessionId, new CookieOptions
            {
                HttpOnly = true,
                Expires = DateTimeOffset.UtcNow.AddDays(90),
                SameSite = SameSiteMode.Lax,
                IsEssential = true
            });
        }
        return sessionId;
    }

    private void SetCartCountCookie(int count)
    {
        Response.Cookies.Append("ecomm_cart_count", count.ToString(), new CookieOptions
        {
            HttpOnly = false,
            Expires = DateTimeOffset.UtcNow.AddDays(90),
            SameSite = SameSiteMode.Lax,
            IsEssential = true
        });
    }

    [HttpGet("")]
    public async Task<IActionResult> Index()
    {
        var sessionId = GetOrCreateSessionId();
        var cart = await _cartService.GetCartAsync(sessionId) ?? new CartDto();
        SetCartCountCookie(cart.Items.Count);
        return View(cart);
    }

    [HttpPost("add")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Add([FromBody] AddToCartRequest request)
    {
        var sessionId = GetOrCreateSessionId();
        var (success, error) = await _cartService.AddItemAsync(sessionId, request.ProductId, request.VariantId, request.Quantity);

        if (!success)
            return BadRequest(new { error });

        var cart = await _cartService.GetCartAsync(sessionId);
        var count = cart?.Items?.Count ?? 0;
        SetCartCountCookie(count);

        return Ok(new { success = true, cartItemCount = count });
    }

    [HttpPost("update")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Update(string itemId, int quantity)
    {
        var sessionId = GetOrCreateSessionId();

        if (quantity <= 0)
        {
            await _cartService.RemoveItemAsync(sessionId, itemId);
        }
        else
        {
            var (success, error) = await _cartService.UpdateItemAsync(sessionId, itemId, quantity);
            if (!success)
                TempData["Error"] = error;
        }

        var cart = await _cartService.GetCartAsync(sessionId);
        SetCartCountCookie(cart?.Items?.Count ?? 0);

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("remove")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Remove(string itemId)
    {
        var sessionId = GetOrCreateSessionId();
        await _cartService.RemoveItemAsync(sessionId, itemId);

        var cart = await _cartService.GetCartAsync(sessionId);
        SetCartCountCookie(cart?.Items?.Count ?? 0);

        return RedirectToAction(nameof(Index));
    }
}
