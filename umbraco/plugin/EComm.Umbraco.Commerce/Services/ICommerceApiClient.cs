using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Client for communicating with the eCommerce API
/// </summary>
public interface ICommerceApiClient
{
    /// <summary>
    /// Gets all markets for the configured tenant
    /// </summary>
    Task<List<MarketInfo>> GetMarketsAsync();

    /// <summary>
    /// Gets all categories for the configured (or specified) market
    /// </summary>
    Task<List<Category>> GetCategoriesAsync(string? marketId = null);

    /// <summary>
    /// Gets a single category by ID
    /// </summary>
    Task<Category?> GetCategoryAsync(string categoryId);

    Task<Category?> CreateCategoryAsync(Category category, string? marketId = null);

    /// <summary>
    /// Gets the countries a market ships to (or the full reference list if the market has no
    /// shipping-zone restriction configured)
    /// </summary>
    Task<List<Country>> GetCountriesAsync(string? marketId = null);

    /// <summary>
    /// Gets products for a category with pagination, in the configured (or specified) market
    /// </summary>
    Task<ProductListResult> GetProductsAsync(string categoryId, int page = 1, int pageSize = 20, string? marketId = null);

    /// <summary>
    /// Gets all products across all categories with pagination, in the configured (or specified) market
    /// </summary>
    Task<ProductListResult> GetAllProductsAsync(int page = 1, int pageSize = 100, string? marketId = null);

    /// <summary>
    /// Gets a product by its slug within a category, in the configured (or specified) market
    /// </summary>
    Task<Product?> GetProductBySlugAsync(string categoryId, string slug, string? marketId = null);

    /// <summary>
    /// Gets a product by ID (product IDs are globally unique — the API does not scope this by market)
    /// </summary>
    Task<Product?> GetProductAsync(string productId);

    /// <summary>
    /// Updates a product (creates new version in API). The API preserves the product's existing
    /// market regardless of caller — not scoped by market here.
    /// </summary>
    Task<Product?> UpdateProductAsync(string productId, Product product, string userId, string? changeNotes = null);

    /// <summary>
    /// Deletes a product permanently (not scoped by market — see GetProductAsync)
    /// </summary>
    Task<bool> DeleteProductAsync(string productId);

    /// <summary>
    /// Creates a new product in the configured (or specified) market
    /// </summary>
    Task<Product?> CreateProductAsync(Product product, string? marketId = null);

    /// <summary>
    /// Gets orders for the configured tenant/market with optional status filter
    /// </summary>
    Task<OrderListResult> GetOrdersAsync(string? status = null, int page = 1, int pageSize = 20, string? search = null, string? marketId = null);

    /// <summary>
    /// Gets a single order by ID
    /// </summary>
    Task<Order?> GetOrderAsync(string orderId);

    /// <summary>
    /// Updates an order's status
    /// </summary>
    Task<Order?> UpdateOrderStatusAsync(string orderId, string status, string? notes = null);

    /// <summary>
    /// Starts a Nets Easy payment for an order and returns the URL to redirect the customer to.
    /// Poll <see cref="GetOrderAsync"/> and read <see cref="Order.PaymentStatus"/> for the outcome.
    /// </summary>
    Task<CreatePaymentResult?> CreatePaymentAsync(string orderId, string returnUrl, string cancelUrl, string termsUrl);

    /// <summary>
    /// Gets all order status definitions for the configured tenant
    /// </summary>
    Task<List<OrderStatusDefinition>> GetOrderStatusDefinitionsAsync();

    /// <summary>
    /// Gets the store-global option presets library for the given market (falls back to settings)
    /// </summary>
    Task<List<OptionPreset>> GetOptionPresetsAsync(string? marketId = null);

    /// <summary>
    /// Replaces the full option presets list for the given market (falls back to settings)
    /// </summary>
    Task<bool> UpdateOptionPresetsAsync(string? marketId, List<OptionPreset> presets);

    // ── Property Templates ────────────────────────────────────────────────────

    Task<List<PropertyTemplate>> GetPropertyTemplatesAsync(string? marketId = null);
    Task<bool> UpdatePropertyTemplatesAsync(string marketId, List<PropertyTemplate> templates);

    // ── Product Attributes (market-scoped variant-axis library) + presets ──────

    Task<List<ProductAttribute>> GetAttributesAsync(string? marketId = null);
    Task<bool> UpdateAttributesAsync(string? marketId, List<ProductAttribute> attributes);
    Task<List<ProductAttributePreset>> GetAttributePresetsAsync(string? marketId = null);
    Task<bool> UpdateAttributePresetsAsync(string? marketId, List<ProductAttributePreset> presets);

    // ── Shipping Methods ─────────────────────────────────────────────────────

    Task<List<ShippingMethod>> GetShippingMethodsAsync(string? marketId = null);
    Task<bool> UpdateShippingMethodsAsync(string marketId, List<ShippingMethod> methods);

    // ── Leasing Periods ──────────────────────────────────────────────────────

    Task<LeasingSettings> GetLeasingPeriodsAsync(string? marketId = null);
    Task<bool> UpdateLeasingPeriodsAsync(string marketId, List<LeasingPeriod> periods);

    // ── Discounts ─────────────────────────────────────────────────────────────

    Task<List<Discount>> GetDiscountsAsync(string? marketId = null);
    Task<Discount?> CreateDiscountAsync(Discount d);
    Task<Discount?> UpdateDiscountAsync(string id, Discount d);
    Task<bool> DeleteDiscountAsync(string id);

    // ── Cart ──────────────────────────────────────────────────────────────────

    /// <summary>Gets (or implicitly creates) the cart for a session</summary>
    Task<Cart?> GetCartAsync(string sessionId, string? marketId = null);

    Task<CartItem?> AddCartItemAsync(string sessionId, string productId, string? variantId, string? optionId,
        int quantity, string? itemType = null, string? itemSubType = null, string? marketId = null);

    Task<CartItem?> UpdateCartItemAsync(string sessionId, string itemId, int quantity, string? marketId = null);
    Task<bool> RemoveCartItemAsync(string sessionId, string itemId, string? marketId = null);

    /// <summary>Clears the whole cart for a session (e.g. after a paid order)</summary>
    Task<bool> ClearCartAsync(string sessionId, string? marketId = null);

    /// <summary>Creates an order from the session's current cart</summary>
    Task<Order?> CreateOrderAsync(string sessionId, CreateOrderRequest request, string? marketId = null);
}

public class ProductListResult
{
    public List<Product> Products { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
