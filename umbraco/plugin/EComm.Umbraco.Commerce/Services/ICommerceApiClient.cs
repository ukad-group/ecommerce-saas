using System.Text.Json;
using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Client for communicating with the eCommerce API
/// </summary>
public interface ICommerceApiClient
{
    // ----- Payment providers (per-market config; JSON passthrough, schema-driven) -----

    /// <summary>The catalog of registered payment providers + their settings schema.</summary>
    Task<JsonElement> GetPaymentProviderCatalogAsync();

    /// <summary>Providers configured for a market (secrets masked) + the active alias.</summary>
    Task<JsonElement> GetMarketPaymentProvidersAsync(string marketId);

    /// <summary>Add/update a provider's settings for a market (blank/masked secrets are kept).</summary>
    Task<JsonElement> UpsertMarketPaymentProviderAsync(string marketId, string alias, JsonElement settings);

    /// <summary>Remove a provider's config from a market.</summary>
    Task<bool> DeleteMarketPaymentProviderAsync(string marketId, string alias);

    /// <summary>The unmasked value of one Secret-typed setting, so an admin can see the stored key.</summary>
    Task<JsonElement> GetPaymentProviderSecretAsync(string marketId, string alias, string key);

    /// <summary>Set (alias) or clear (null) the market's active provider.</summary>
    Task<JsonElement> SetActivePaymentProviderAsync(string marketId, string? alias);

    /// <summary>Set (code) or clear (null) the order status to apply when a payment succeeds.</summary>
    Task<JsonElement> SetOrderStatusAfterPaymentAsync(string marketId, string? code);

    /// <summary>Set a provider's surcharge fee for a market.</summary>
    Task<JsonElement> SetPaymentSurchargeAsync(string marketId, string alias, JsonElement surcharge);

    /// <summary>Remove a provider's surcharge fee from a market.</summary>
    Task<bool> DeletePaymentSurchargeAsync(string marketId, string alias);

    // ----- Tax Classes (market-scoped; drives the goods rate and the surcharge fee's tax) -----

    /// <summary>The market's named classes plus its flat fallback rate.</summary>
    Task<TaxClassesResponse> GetTaxClassesAsync(string? marketId = null);

    /// <summary>taxRate null leaves the market's stored fallback rate untouched.</summary>
    Task<bool> UpdateTaxClassesAsync(string? marketId, List<TaxClass> taxClasses, decimal? taxRate = null);

    // ----- Currencies + Countries (market-scoped; saved whole-list) -----

    /// <summary>The currencies a market offers, plus the market's active currency code.</summary>
    Task<CurrenciesResponse> GetCurrenciesAsync(string? marketId = null);

    Task<bool> UpdateCurrenciesAsync(string? marketId, List<Currency> currencies);

    /// <summary>The countries a market sells to, with their checkout defaults.</summary>
    Task<MarketCountriesResponse> GetMarketCountriesAsync(string? marketId = null);

    Task<bool> UpdateMarketCountriesAsync(string? marketId, List<MarketCountry> countries);

    /// <summary>ISO 4217 currencies and formatting cultures, for the currency editor's dropdowns.</summary>
    Task<CurrencyPresetsResponse> GetCurrencyPresetsAsync();

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
    /// With a marketId: exactly the countries that market sells to — empty when it has none
    /// configured. Without one: the full ISO 3166 reference list.
    /// </summary>
    Task<List<Country>> GetCountriesAsync(string? marketId = null);

    /// <summary>
    /// Gets products for a category with pagination, in the configured (or specified) market
    /// </summary>
    Task<ProductListResult> GetProductsAsync(string categoryId, int page = 1, int pageSize = 20, string? marketId = null);

    /// <summary>
    /// Gets a single page of products in a category, filtered by an optional name/SKU search,
    /// using the API's server-side pagination (returns the true total count across all pages).
    /// </summary>
    Task<ProductListResult> GetCategoryProductsPagedAsync(string categoryId, int page, int pageSize, string? search = null, string? marketId = null);

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
    /// Starts a payment for an order via the market's configured payment provider and returns the URL
    /// to redirect the customer to. Poll <see cref="GetOrderAsync"/> and read
    /// <see cref="Order.PaymentStatus"/> for the outcome.
    /// <para>
    /// Where the customer is sent afterwards (continue/cancel/error), the shop's terms URLs and the
    /// payment window's language are configured per market on the provider itself — in the Commerce
    /// section under Options → Payment Providers — so no storefront passes them here.
    /// </para>
    /// </summary>
    Task<CreatePaymentResult?> CreatePaymentAsync(string orderId);

    /// <summary>
    /// Gets a store's order status definitions. Statuses are market-scoped, so every call carries a
    /// market — omit it and the settings-default market is used.
    /// </summary>
    Task<List<OrderStatusDefinition>> GetOrderStatusDefinitionsAsync(string? marketId = null);

    /// <summary>
    /// Creates/updates/deletes one of a store's order statuses. These return the API's error text
    /// rather than swallowing it: refusals are the useful part ("in use by orders", the store settles
    /// payments into it, duplicate code), and the editor shows them.
    /// </summary>
    Task<(OrderStatusDefinition? Status, string? Error)> CreateOrderStatusDefinitionAsync(OrderStatusDefinition status, string? marketId = null);
    Task<(OrderStatusDefinition? Status, string? Error)> UpdateOrderStatusDefinitionAsync(string id, OrderStatusDefinition status, string? marketId = null);

    /// <summary>Null when deleted, otherwise the reason it was refused.</summary>
    Task<string?> DeleteOrderStatusDefinitionAsync(string id, string? marketId = null);

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

    /// <summary>
    /// Backoffice cart list for a market, most recent activity first. Search matches session id and
    /// product names — a cart has no customer or order number to match on.
    /// </summary>
    Task<CartListResult> GetCartsAsync(int page = 1, int pageSize = 20, string? search = null, string? marketId = null);

    Task<CartItem?> AddCartItemAsync(string sessionId, string productId, string? variantId,
        int quantity, string? itemType = null, string? itemSubType = null, string? marketId = null);

    Task<CartItem?> UpdateCartItemAsync(string sessionId, string itemId, int quantity, string? marketId = null);
    Task<bool> RemoveCartItemAsync(string sessionId, string itemId, string? marketId = null);

    /// <summary>Clears the whole cart for a session (e.g. after a paid order)</summary>
    Task<bool> ClearCartAsync(string sessionId, string? marketId = null);

    /// <summary>Creates an order from the session's current cart</summary>
    Task<Order?> CreateOrderAsync(string sessionId, CreateOrderRequest request, string? marketId = null);

    /// <summary>Rebuilds an existing unpaid order from the session's current cart and the given customer
    /// details, keeping its id and order number. Null when the order is gone or no longer updatable.</summary>
    Task<Order?> UpdateOrderAsync(string orderId, string sessionId, CreateOrderRequest request, string? marketId = null);
}

public class ProductListResult
{
    public List<Product> Products { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
