using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ECommShowcase.Web.Models.Configuration;
using ECommShowcase.Web.Models.DTOs;
using ECommShowcase.Web.Models.ViewModels;
using ECommShowcase.Web.Services;

namespace ECommShowcase.Web.Controllers;

public class CartController : Controller
{
    private readonly ILogger<CartController> _logger;
    private readonly IECommApiClient _apiClient;
    private readonly ShowcaseSettings _settings;

    public CartController(
        ILogger<CartController> logger,
        IECommApiClient apiClient,
        IOptions<ShowcaseSettings> settings)
    {
        _logger = logger;
        _apiClient = apiClient;
        _settings = settings.Value;
    }

    // GET: /Cart
    public async Task<IActionResult> Index()
    {
        try
        {
            // Prevent browser caching of cart page
            Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            Response.Headers.Append("Pragma", "no-cache");
            Response.Headers.Append("Expires", "0");

            var sessionId = GetOrCreateSessionId();
            var cart = await _apiClient.GetCartAsync(sessionId);

            var viewModel = new CartViewModel
            {
                Cart = cart ?? new CartDto(),
                CurrencySymbol = _settings.CurrencySymbol
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading cart");
            return View(new CartViewModel
            {
                CurrencySymbol = _settings.CurrencySymbol
            });
        }
    }

    // POST: /Cart/AddItem
    [HttpPost]
    public async Task<IActionResult> AddItem(string productId, string? variantId = null, int quantity = 1)
    {
        try
        {
            var sessionId = GetOrCreateSessionId();
            var request = new AddCartItemRequest
            {
                ProductId = productId,
                VariantId = variantId,
                Quantity = quantity
            };

            await _apiClient.AddCartItemAsync(sessionId, request);

            TempData["SuccessMessage"] = "Item added to cart";
            return RedirectToAction(nameof(Index));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to cart");
            TempData["ErrorMessage"] = "Failed to add item to cart";
            return RedirectToAction("Details", "Products", new { id = productId });
        }
    }

    // POST: /Cart/UpdateItem
    [HttpPost]
    public async Task<IActionResult> UpdateItem(string itemId, int quantity)
    {
        try
        {
            var sessionId = GetOrCreateSessionId();
            _logger.LogInformation("Updating cart item {ItemId} to quantity {Quantity} for session {SessionId}", itemId, quantity, sessionId);

            await _apiClient.UpdateCartItemAsync(sessionId, itemId, quantity);

            _logger.LogInformation("Successfully updated cart item {ItemId}", itemId);

            // For AJAX requests, return success without redirect
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest" || Request.Headers["Accept"].ToString().Contains("application/json"))
            {
                return Ok();
            }

            TempData["SuccessMessage"] = "Cart updated";
            return RedirectToAction(nameof(Index));
        }
        catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.BadRequest)
        {
            // Stock validation failed - return error message for AJAX
            var errorMessage = httpEx.Message;
            _logger.LogWarning("Stock validation failed: {Error}", errorMessage);

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest" || Request.Headers["Accept"].ToString().Contains("application/json"))
            {
                return BadRequest(errorMessage);
            }

            TempData["ErrorMessage"] = errorMessage.Contains("Insufficient stock")
                ? errorMessage.Substring(errorMessage.IndexOf("Insufficient stock"))
                : "Failed to update item";
            return RedirectToAction(nameof(Index));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cart item {ItemId} to quantity {Quantity}", itemId, quantity);

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest" || Request.Headers["Accept"].ToString().Contains("application/json"))
            {
                return StatusCode(500, "Failed to update item");
            }

            TempData["ErrorMessage"] = "Failed to update item";
            return RedirectToAction(nameof(Index));
        }
    }

    // POST: /Cart/RemoveItem
    [HttpPost]
    public async Task<IActionResult> RemoveItem(string itemId)
    {
        try
        {
            var sessionId = GetOrCreateSessionId();
            await _apiClient.DeleteCartItemAsync(sessionId, itemId);

            TempData["SuccessMessage"] = "Item removed from cart";
            return RedirectToAction(nameof(Index));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cart item");
            TempData["ErrorMessage"] = "Failed to remove item";
            return RedirectToAction(nameof(Index));
        }
    }

    // GET: /Cart/Count (for AJAX)
    [HttpGet]
    public async Task<IActionResult> Count()
    {
        try
        {
            var sessionId = GetOrCreateSessionId();
            var cart = await _apiClient.GetCartAsync(sessionId);
            var count = cart?.Items.Sum(i => i.Quantity) ?? 0;

            return Json(new { count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cart count");
            return Json(new { count = 0 });
        }
    }

    private string GetOrCreateSessionId()
    {
        var sessionId = HttpContext.Session.GetString("CartSessionId");
        if (string.IsNullOrEmpty(sessionId))
        {
            sessionId = Guid.NewGuid().ToString();
            HttpContext.Session.SetString("CartSessionId", sessionId);
        }
        return sessionId;
    }
}
