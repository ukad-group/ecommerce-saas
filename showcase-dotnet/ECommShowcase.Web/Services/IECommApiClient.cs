using ECommShowcase.Web.Models.DTOs;

namespace ECommShowcase.Web.Services;

public interface IECommApiClient
{
    // Products
    Task<ProductListResponse> GetProductsAsync(string? categoryId = null, string? search = null, int page = 1, int pageSize = 12);
    Task<ProductDto?> GetProductByIdAsync(string productId);

    // Categories
    Task<List<CategoryDto>> GetCategoriesAsync();
    Task<CategoryDto?> GetCategoryByIdAsync(string categoryId);

    // Cart
    Task<CartDto?> GetCartAsync(string sessionId);
    Task<CartItemDto> AddCartItemAsync(string sessionId, AddCartItemRequest request);
    Task<CartItemDto> UpdateCartItemAsync(string sessionId, string itemId, int quantity);
    Task DeleteCartItemAsync(string sessionId, string itemId);

    // Orders
    Task<OrderDto> CreateOrderAsync(CreateOrderRequest request);
    Task<OrderDto> UpdateOrderStatusAsync(string orderId, string status, string? notes = null);
    Task<OrderDto?> GetOrderByIdAsync(string orderId);
}
