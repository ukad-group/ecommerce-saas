using ECommShowcase.Web.Models.Configuration;
using ECommShowcase.Web.Models.DTOs;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;
using System.Text.Json;

namespace ECommShowcase.Web.Services;

public class ECommApiClient : IECommApiClient
{
    private readonly HttpClient _httpClient;
    private readonly ECommPlatformSettings _settings;
    private readonly ILogger<ECommApiClient> _logger;

    public ECommApiClient(
        HttpClient httpClient,
        IOptions<ECommPlatformSettings> settings,
        ILogger<ECommApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        // Configure base address and default headers
        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", _settings.ApiKey);
        _httpClient.DefaultRequestHeaders.Add("X-Tenant-ID", _settings.TenantId);
        _httpClient.DefaultRequestHeaders.Add("X-Market-ID", _settings.MarketId);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.Timeout);
    }

    // Products
    public async Task<ProductListResponse> GetProductsAsync(string? categoryId = null, string? search = null, int page = 1, int pageSize = 12)
    {
        try
        {
            var queryParams = new List<string>
            {
                $"page={page}",
                $"pageSize={pageSize}"
            };

            if (!string.IsNullOrEmpty(categoryId))
                queryParams.Add($"categoryId={categoryId}");

            if (!string.IsNullOrEmpty(search))
                queryParams.Add($"search={Uri.EscapeDataString(search)}");

            var query = string.Join("&", queryParams);
            var response = await _httpClient.GetFromJsonAsync<ProductListResponse>($"/products?{query}");

            return response ?? new ProductListResponse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching products");
            return new ProductListResponse();
        }
    }

    public async Task<ProductDto?> GetProductByIdAsync(string productId)
    {
        try
        {
            return await _httpClient.GetFromJsonAsync<ProductDto>($"/products/{productId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product {ProductId}", productId);
            return null;
        }
    }

    // Categories
    public async Task<List<CategoryDto>> GetCategoriesAsync()
    {
        try
        {
            var response = await _httpClient.GetFromJsonAsync<CategoryListResponse>("/categories");
            return response?.Data ?? new List<CategoryDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching categories");
            return new List<CategoryDto>();
        }
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(string categoryId)
    {
        try
        {
            return await _httpClient.GetFromJsonAsync<CategoryDto>($"/categories/{categoryId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching category {CategoryId}", categoryId);
            return null;
        }
    }

    // Cart
    public async Task<CartDto?> GetCartAsync(string sessionId)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Session-ID");
            _httpClient.DefaultRequestHeaders.Add("X-Session-ID", sessionId);

            return await _httpClient.GetFromJsonAsync<CartDto>("/cart");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching cart for session {SessionId}", sessionId);
            return null;
        }
    }

    public async Task<CartItemDto> AddCartItemAsync(string sessionId, AddCartItemRequest request)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Session-ID");
            _httpClient.DefaultRequestHeaders.Add("X-Session-ID", sessionId);

            var response = await _httpClient.PostAsJsonAsync("/cart/items", request);
            response.EnsureSuccessStatusCode();

            var item = await response.Content.ReadFromJsonAsync<CartItemDto>();
            return item ?? throw new Exception("Failed to add item to cart");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to cart");
            throw;
        }
    }

    public async Task<CartItemDto> UpdateCartItemAsync(string sessionId, string itemId, int quantity)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Session-ID");
            _httpClient.DefaultRequestHeaders.Add("X-Session-ID", sessionId);

            var request = new UpdateCartItemRequest { Quantity = quantity };
            var response = await _httpClient.PutAsJsonAsync($"/cart/items/{itemId}", request);
            response.EnsureSuccessStatusCode();

            var item = await response.Content.ReadFromJsonAsync<CartItemDto>();
            return item ?? throw new Exception("Failed to update cart item");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating cart item {ItemId}", itemId);
            throw;
        }
    }

    public async Task DeleteCartItemAsync(string sessionId, string itemId)
    {
        try
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Session-ID");
            _httpClient.DefaultRequestHeaders.Add("X-Session-ID", sessionId);

            var response = await _httpClient.DeleteAsync($"/cart/items/{itemId}");
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting cart item {ItemId}", itemId);
            throw;
        }
    }

    // Orders
    public async Task<OrderDto> CreateOrderAsync(CreateOrderRequest request)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("/orders", request);
            response.EnsureSuccessStatusCode();

            var order = await response.Content.ReadFromJsonAsync<OrderDto>();
            return order ?? throw new Exception("Failed to create order");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order");
            throw;
        }
    }

    public async Task<OrderDto> UpdateOrderStatusAsync(string orderId, string status, string? notes = null)
    {
        try
        {
            var request = new UpdateOrderStatusRequest
            {
                Status = status,
                Notes = notes
            };

            var response = await _httpClient.PutAsJsonAsync($"/orders/{orderId}/status", request);
            response.EnsureSuccessStatusCode();

            var order = await response.Content.ReadFromJsonAsync<OrderDto>();
            return order ?? throw new Exception("Failed to update order status");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating order status for {OrderId}", orderId);
            throw;
        }
    }

    public async Task<OrderDto?> GetOrderByIdAsync(string orderId)
    {
        try
        {
            return await _httpClient.GetFromJsonAsync<OrderDto>($"/orders/{orderId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching order {OrderId}", orderId);
            return null;
        }
    }
}
