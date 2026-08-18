using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using EComm.Commerce.Demo.Models;
using EComm.Umbraco.Commerce.Services;

namespace EComm.Commerce.Demo.Services;

/// <summary>
/// Client for cart and order operations against the eCommerce API
/// </summary>
public class StoreCartService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICommerceSettingsService _settingsService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<StoreCartService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public StoreCartService(
        IHttpClientFactory httpClientFactory,
        ICommerceSettingsService settingsService,
        IHttpContextAccessor httpContextAccessor,
        ILogger<StoreCartService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settingsService = settingsService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    private async Task<(HttpClient client, string baseUrl)> CreateClientAsync(string? sessionId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        var client = _httpClientFactory.CreateClient("ECommApi");

        var baseUrl = settings?.ApiBaseUrl?.TrimEnd('/') ?? "http://localhost:5180/api/v1";

        if (!string.IsNullOrEmpty(settings?.TenantId))
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Tenant-ID", settings.TenantId);
        // The store the shopper actually browsed, remembered by StoreContext while they were in
        // the content tree. /cart and /checkout are reserved paths with no content node, so
        // without this the cart and the order would always go to the globally configured market
        // no matter which store branch they shopped.
        var marketId = StoreContext.Current(_httpContextAccessor.HttpContext) ?? settings?.MarketId;
        if (!string.IsNullOrEmpty(marketId))
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Market-ID", marketId);
        if (!string.IsNullOrEmpty(settings?.ApiKey))
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-API-Key", settings.ApiKey);
        if (!string.IsNullOrEmpty(sessionId))
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Session-ID", sessionId);

        return (client, baseUrl);
    }

    public async Task<CartDto?> GetCartAsync(string sessionId)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync(sessionId);
            var response = await client.GetAsync($"{baseUrl}/cart");
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<CartDto>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get cart for session {SessionId}", sessionId);
            return null;
        }
    }

    public async Task<(bool Success, string? Error)> AddItemAsync(string sessionId, string productId, string? variantId, int quantity)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync(sessionId);
            var payload = new { productId, variantId, quantity };
            var response = await client.PostAsJsonAsync($"{baseUrl}/cart/items", payload, JsonOptions);

            if (response.IsSuccessStatusCode) return (true, null);

            var error = await response.Content.ReadAsStringAsync();
            return (false, error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add item to cart");
            return (false, ex.Message);
        }
    }

    public async Task<(bool Success, string? Error)> UpdateItemAsync(string sessionId, string itemId, int quantity)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync(sessionId);
            var payload = new { quantity };
            var response = await client.PutAsJsonAsync($"{baseUrl}/cart/items/{itemId}", payload, JsonOptions);

            if (response.IsSuccessStatusCode) return (true, null);

            var error = await response.Content.ReadAsStringAsync();
            return (false, error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update cart item {ItemId}", itemId);
            return (false, ex.Message);
        }
    }

    public async Task<bool> RemoveItemAsync(string sessionId, string itemId)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync(sessionId);
            var response = await client.DeleteAsync($"{baseUrl}/cart/items/{itemId}");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove cart item {ItemId}", itemId);
            return false;
        }
    }

    public async Task<(OrderDto? Order, string? Error)> CreateOrderAsync(string sessionId, CheckoutFormModel form)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync(sessionId);

            object? billingAddress = form.BillingSameAsShipping
                ? null
                : new
                {
                    street = form.BillingStreet ?? "",
                    street2 = form.BillingStreet2,
                    city = form.BillingCity ?? "",
                    state = form.BillingState ?? "",
                    postalCode = form.BillingPostalCode ?? "",
                    country = form.BillingCountry ?? ""
                };

            var payload = new
            {
                sessionId,
                customer = new
                {
                    fullName = form.FullName,
                    email = form.Email,
                    phone = form.Phone
                },
                shippingAddress = new
                {
                    street = form.ShippingStreet,
                    street2 = form.ShippingStreet2,
                    city = form.ShippingCity,
                    state = form.ShippingState,
                    postalCode = form.ShippingPostalCode,
                    country = form.ShippingCountry
                },
                billingAddress,
                items = Array.Empty<object>()
            };

            var response = await client.PostAsJsonAsync($"{baseUrl}/orders", payload, JsonOptions);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                return (null, error);
            }

            var order = await response.Content.ReadFromJsonAsync<OrderDto>(JsonOptions);
            return (order, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create order for session {SessionId}", sessionId);
            return (null, ex.Message);
        }
    }

    public async Task<(OrderDto? Order, string? Error)> PayOrderAsync(string orderId)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync();
            var payload = new { status = "paid" };
            var response = await client.PutAsJsonAsync($"{baseUrl}/orders/{orderId}/status", payload, JsonOptions);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                return (null, error);
            }

            var order = await response.Content.ReadFromJsonAsync<OrderDto>(JsonOptions);
            return (order, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to pay order {OrderId}", orderId);
            return (null, ex.Message);
        }
    }

    /// <summary>
    /// Asks the API to start a real payment for the order and returns where to send the shopper.
    ///
    /// No body: the return URLs, language and credentials all come from the provider settings on
    /// the order's market, so a storefront can't redirect a payment somewhere the market never
    /// configured. The market comes from the order itself, so this follows whichever store the
    /// order was placed in.
    /// </summary>
    public async Task<(PaymentDto? Payment, string? Error)> CreatePaymentAsync(string orderId)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync();
            var response = await client.PostAsync($"{baseUrl}/orders/{orderId}/payment", content: null);

            if (!response.IsSuccessStatusCode)
            {
                // The API returns a useful message here - "No payment provider is configured for
                // this market", or which common setting failed validation - so surface it rather
                // than a generic failure.
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create payment for order {OrderId}: {Error}", orderId, error);
                return (null, error);
            }

            var payment = await response.Content.ReadFromJsonAsync<PaymentDto>(JsonOptions);
            return (payment, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create payment for order {OrderId}", orderId);
            return (null, ex.Message);
        }
    }

    public async Task<OrderDto?> GetOrderAsync(string orderId)
    {
        try
        {
            var (client, baseUrl) = await CreateClientAsync();
            var response = await client.GetAsync($"{baseUrl}/orders/{orderId}");
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<OrderDto>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get order {OrderId}", orderId);
            return null;
        }
    }
}
