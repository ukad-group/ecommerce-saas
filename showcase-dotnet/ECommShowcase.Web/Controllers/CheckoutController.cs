using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ECommShowcase.Web.Models.Configuration;
using ECommShowcase.Web.Models.DTOs;
using ECommShowcase.Web.Models.ViewModels;
using ECommShowcase.Web.Services;

namespace ECommShowcase.Web.Controllers;

public class CheckoutController : Controller
{
    private readonly ILogger<CheckoutController> _logger;
    private readonly IECommApiClient _apiClient;
    private readonly ShowcaseSettings _settings;

    public CheckoutController(
        ILogger<CheckoutController> logger,
        IECommApiClient apiClient,
        IOptions<ShowcaseSettings> settings)
    {
        _logger = logger;
        _apiClient = apiClient;
        _settings = settings.Value;
    }

    // GET: /Checkout
    public async Task<IActionResult> Index()
    {
        try
        {
            var sessionId = GetSessionId();
            if (string.IsNullOrEmpty(sessionId))
            {
                return RedirectToAction("Index", "Cart");
            }

            var cart = await _apiClient.GetCartAsync(sessionId);
            if (cart == null || cart.Items.Count == 0)
            {
                TempData["ErrorMessage"] = "Your cart is empty";
                return RedirectToAction("Index", "Cart");
            }

            var viewModel = new CheckoutViewModel
            {
                Cart = cart,
                CurrencySymbol = _settings.CurrencySymbol
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading checkout");
            return RedirectToAction("Index", "Cart");
        }
    }

    // POST: /Checkout/Complete
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Complete(CheckoutViewModel model)
    {
        if (!ModelState.IsValid)
        {
            var sessionId = GetSessionId();
            if (!string.IsNullOrEmpty(sessionId))
            {
                model.Cart = await _apiClient.GetCartAsync(sessionId) ?? new CartDto();
            }
            model.CurrencySymbol = _settings.CurrencySymbol;
            return View("Index", model);
        }

        try
        {
            var sessionId = GetSessionId();
            if (string.IsNullOrEmpty(sessionId))
            {
                return RedirectToAction("Index", "Cart");
            }

            var cart = await _apiClient.GetCartAsync(sessionId);
            if (cart == null || cart.Items.Count == 0)
            {
                TempData["ErrorMessage"] = "Your cart is empty";
                return RedirectToAction("Index", "Cart");
            }

            // Create order request
            var orderRequest = new CreateOrderRequest
            {
                SessionId = sessionId,
                Customer = new CustomerInfoDto
                {
                    FullName = model.FullName,
                    Email = model.Email,
                    Phone = model.Phone
                },
                ShippingAddress = new AddressDto
                {
                    Street = model.Street,
                    Street2 = model.Street2,
                    City = model.City,
                    State = model.State,
                    PostalCode = model.PostalCode,
                    Country = model.Country
                },
                Items = cart.Items.Select(item => new OrderItemRequest
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice
                }).ToList()
            };

            // Create order
            var order = await _apiClient.CreateOrderAsync(orderRequest);

            // Simulate payment processing delay
            await Task.Delay(1000);

            // Fake payment - automatically mark as paid
            order = await _apiClient.UpdateOrderStatusAsync(order.Id, "paid", "Payment processed (fake)");

            // Generate fake tracking number
            if (string.IsNullOrEmpty(order.TrackingNumber))
            {
                var trackingNumber = $"TRACK-{order.Id.Substring(0, Math.Min(8, order.Id.Length)).ToUpper()}";
                // Note: In a real implementation, you'd update the order with tracking number
                order.TrackingNumber = trackingNumber;
            }

            // Clear session
            HttpContext.Session.Remove("CartSessionId");

            return RedirectToAction(nameof(Confirmation), new { orderId = order.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing checkout");
            TempData["ErrorMessage"] = "An error occurred while processing your order. Please try again.";

            var sessionId = GetSessionId();
            if (!string.IsNullOrEmpty(sessionId))
            {
                model.Cart = await _apiClient.GetCartAsync(sessionId) ?? new CartDto();
            }
            model.CurrencySymbol = _settings.CurrencySymbol;
            return View("Index", model);
        }
    }

    // GET: /Checkout/Confirmation/5
    public async Task<IActionResult> Confirmation(string orderId)
    {
        try
        {
            var order = await _apiClient.GetOrderByIdAsync(orderId);
            if (order == null)
            {
                return NotFound();
            }

            var viewModel = new OrderConfirmationViewModel
            {
                Order = order,
                CurrencySymbol = _settings.CurrencySymbol
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading order confirmation");
            return NotFound();
        }
    }

    private string? GetSessionId()
    {
        return HttpContext.Session.GetString("CartSessionId");
    }
}
