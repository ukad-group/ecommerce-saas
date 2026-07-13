using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EComm.Umbraco.Commerce.Models;
using EComm.Umbraco.Commerce.Notifications;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// HTTP client for communicating with the eCommerce API
/// </summary>
public class CommerceApiClient : ICommerceApiClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICommerceSettingsService _settingsService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CommerceApiClient> _logger;
    private readonly IEventAggregator _eventAggregator;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    // Cache durations
    private static readonly TimeSpan CategoryCacheDuration = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ProductCacheDuration = TimeSpan.FromMinutes(2);

    public CommerceApiClient(
        IHttpClientFactory httpClientFactory,
        ICommerceSettingsService settingsService,
        IMemoryCache cache,
        ILogger<CommerceApiClient> logger,
        IEventAggregator eventAggregator)
    {
        _httpClientFactory = httpClientFactory;
        _settingsService = settingsService;
        _cache = cache;
        _logger = logger;
        _eventAggregator = eventAggregator;
    }

    private class OptionPresetsResponse
    {
        public List<OptionPreset> Presets { get; set; } = new();
    }

    public async Task<List<MarketInfo>> GetMarketsAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return new List<MarketInfo>();

        try
        {
            var client = _httpClientFactory.CreateClient("ECommApi");
            var baseUrl = settings.ApiBaseUrl.TrimEnd('/');
            var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/tenants/{settings.TenantId}");
            if (!string.IsNullOrEmpty(settings.ApiKey))
                request.Headers.Add("X-API-Key", settings.ApiKey);

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode) return new List<MarketInfo>();

            var result = await response.Content.ReadFromJsonAsync<TenantInfoForMarkets>(JsonOptions);
            return result?.Markets ?? new List<MarketInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch markets");
            return new List<MarketInfo>();
        }
    }

    private class TenantInfoForMarkets
    {
        public List<MarketInfo>? Markets { get; set; }
    }

    public async Task<List<OptionPreset>> GetOptionPresetsAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Commerce settings not configured");
            return new List<OptionPreset>();
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"admin/markets/{settings.MarketId}/option-presets?pageSize=0";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var wrapper = await response.Content.ReadFromJsonAsync<OptionPresetsResponse>(JsonOptions);
            return wrapper?.Presets ?? new List<OptionPreset>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch option presets from eCommerce API");
            return new List<OptionPreset>();
        }
    }

    public async Task<List<Category>> GetCategoriesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Commerce settings not configured");
            return new List<Category>();
        }

        var effectiveMarketId = marketId ?? settings.MarketId;
        var cacheKey = $"EComm_Categories_{effectiveMarketId}";

        if (_cache.TryGetValue(cacheKey, out List<Category>? cachedCategories) && cachedCategories != null)
        {
            return cachedCategories;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"categories?tenantId={settings.TenantId}&marketId={effectiveMarketId}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var categories = await response.Content.ReadFromJsonAsync<List<Category>>(JsonOptions);
            categories ??= new List<Category>();

            _cache.Set(cacheKey, categories, CategoryCacheDuration);

            return categories;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch categories from eCommerce API");
            return new List<Category>();
        }
    }

    public async Task<List<Country>> GetCountriesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Commerce settings not configured");
            return new List<Country>();
        }

        var effectiveMarketId = marketId ?? settings.MarketId;
        var cacheKey = $"EComm_Countries_{effectiveMarketId}";

        if (_cache.TryGetValue(cacheKey, out List<Country>? cachedCountries) && cachedCountries != null)
        {
            return cachedCountries;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"countries?marketId={effectiveMarketId}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var countries = await response.Content.ReadFromJsonAsync<List<Country>>(JsonOptions);
            countries ??= new List<Country>();

            _cache.Set(cacheKey, countries, CategoryCacheDuration);

            return countries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch countries from eCommerce API");
            return new List<Country>();
        }
    }

    public async Task<Category?> GetCategoryAsync(string categoryId)
    {
        var cacheKey = $"EComm_Category_{categoryId}";

        if (_cache.TryGetValue(cacheKey, out Category? cachedCategory))
        {
            return cachedCategory;
        }

        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return null;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"categories/{categoryId}";

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var category = await response.Content.ReadFromJsonAsync<Category>(JsonOptions);

            if (category != null)
            {
                _cache.Set(cacheKey, category, CategoryCacheDuration);
            }

            return category;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch category {CategoryId} from eCommerce API", categoryId);
            return null;
        }
    }

    public async Task<Category?> CreateCategoryAsync(Category category, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot create category: API settings not configured");
            return null;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var effectiveMarketId = marketId ?? settings.MarketId;

            var json = JsonSerializer.Serialize(category, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "categories") { Content = content };
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", effectiveMarketId);

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var created = await response.Content.ReadFromJsonAsync<Category>(JsonOptions);
                // Drop the market's cached tree so the new category shows on next load.
                _cache.Remove($"EComm_Categories_{effectiveMarketId}");
                _logger.LogInformation("Category created successfully with ID {CategoryId}", created?.Id);
                return created;
            }

            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create category: {StatusCode} - {Error}", response.StatusCode, error);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create category");
            return null;
        }
    }

    public async Task<ProductListResult> GetProductsAsync(string categoryId, int page = 1, int pageSize = 20, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return new ProductListResult();
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"products?tenantId={settings.TenantId}&marketId={marketId ?? settings.MarketId}&categoryId={categoryId}&page={page}&pageSize={pageSize}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            // API returns a plain array, not a ProductListResult object
            var products = await response.Content.ReadFromJsonAsync<List<Product>>(JsonOptions);

            return new ProductListResult
            {
                Products = products ?? new List<Product>(),
                TotalCount = products?.Count ?? 0,
                Page = page,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch products for category {CategoryId}", categoryId);
            return new ProductListResult();
        }
    }

    public async Task<ProductListResult> GetAllProductsAsync(int page = 1, int pageSize = 100, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return new ProductListResult();
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"products?tenantId={settings.TenantId}&marketId={marketId ?? settings.MarketId}&page={page}&pageSize={pageSize}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            // API returns a plain array, not a ProductListResult object
            var products = await response.Content.ReadFromJsonAsync<List<Product>>(JsonOptions);

            return new ProductListResult
            {
                Products = products ?? new List<Product>(),
                TotalCount = products?.Count ?? 0,
                Page = page,
                PageSize = pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch all products");
            return new ProductListResult();
        }
    }

    public async Task<Product?> GetProductBySlugAsync(string categoryId, string slug, string? marketId = null)
    {
        var cacheKey = $"EComm_Product_{categoryId}_{slug}";

        if (_cache.TryGetValue(cacheKey, out Product? cachedProduct))
        {
            return cachedProduct;
        }

        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return null;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"products/by-slug/{slug}?tenantId={settings.TenantId}&marketId={marketId ?? settings.MarketId}&categoryId={categoryId}";

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var product = await response.Content.ReadFromJsonAsync<Product>(JsonOptions);

            if (product != null)
            {
                _cache.Set(cacheKey, product, ProductCacheDuration);
            }

            return product;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch product by slug {Slug} in category {CategoryId}", slug, categoryId);
            return null;
        }
    }

    public async Task<Product?> GetProductAsync(string productId)
    {
        var cacheKey = $"EComm_Product_{productId}";

        if (_cache.TryGetValue(cacheKey, out Product? cachedProduct))
        {
            return cachedProduct;
        }

        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return null;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"products/{productId}";

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var product = await response.Content.ReadFromJsonAsync<Product>(JsonOptions);

            if (product != null)
            {
                _cache.Set(cacheKey, product, ProductCacheDuration);
            }

            return product;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch product {ProductId}", productId);
            return null;
        }
    }

    public async Task<Product?> UpdateProductAsync(string productId, Product product, string userId, string? changeNotes = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot update product: API settings not configured");
            return null;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"products/{productId}";

            // Include change notes if provided
            if (!string.IsNullOrEmpty(changeNotes))
            {
                product.ChangeNotes = changeNotes;
            }

            var json = JsonSerializer.Serialize(product, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Put, url)
            {
                Content = content
            };

            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", settings.MarketId);
            request.Headers.Add("X-User-ID", userId);

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var updated = JsonSerializer.Deserialize<Product>(responseContent, JsonOptions);

                if (updated != null)
                {
                    // Clear every cache entry that could serve a stale copy of this
                    // product, across all routes (by-id, by-category-slug, and the
                    // ProductContentFinder's own key used by /{category}/{slug} URLs).
                    InvalidateProductCaches(updated, productId);

                    // Tell consumers (e.g. the site's catalog-index cache) the catalog changed so they can
                    // drop their own caches - otherwise a changed price lags their TTL.
                    await _eventAggregator.PublishAsync(new ECommCatalogChangedNotification(settings.MarketId, productId));

                    _logger.LogInformation("Product {ProductId} updated successfully (new version {Version})",
                        productId, updated.Version);
                }

                return updated;
            }

            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to update product {ProductId}: {StatusCode} - {Error}",
                productId, response.StatusCode, error);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update product {ProductId}", productId);
            return null;
        }
    }

    /// <summary>
    /// Removes every cache entry that could serve a stale copy of a product:
    /// the by-id entry, the per-category products list, this client's by-slug
    /// entries, and the ProductContentFinder's own "product:{cat}:{slug}"
    /// entries (used by /{category}/{slug} URLs) — across every category the
    /// product belongs to. Without this, edits made in the backoffice lag on
    /// two-segment product URLs until the finder cache expires.
    /// </summary>
    private void InvalidateProductCaches(Product product, string productId)
    {
        _cache.Remove($"EComm_Product_{productId}");
        _cache.Remove("EComm_Products_all");

        var categoryIds = new List<string>();
        if (!string.IsNullOrEmpty(product.CategoryId)) categoryIds.Add(product.CategoryId!);
        if (product.CategoryIds != null) categoryIds.AddRange(product.CategoryIds);

        // The URL segment can be either the product id or its slug.
        var slugs = new List<string> { productId };
        if (!string.IsNullOrEmpty(product.Slug)) slugs.Add(product.Slug!);

        foreach (var cat in categoryIds.Distinct())
        {
            _cache.Remove($"EComm_Products_{cat}");
            foreach (var slug in slugs.Distinct())
            {
                _cache.Remove($"EComm_Product_{cat}_{slug}");  // CommerceApiClient by-slug cache
                _cache.Remove($"product:{cat}:{slug}");         // ProductContentFinder cache
            }
        }
    }

    public async Task<bool> DeleteProductAsync(string productId)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot delete product: API settings not configured");
            return false;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Delete, $"products/{productId}");
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", settings.MarketId);

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _cache.Remove($"EComm_Product_{productId}");
                _cache.Remove($"EComm_Products_all");
                _logger.LogInformation("Product {ProductId} deleted successfully", productId);
                return true;
            }

            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to delete product {ProductId}: {StatusCode} - {Error}",
                productId, response.StatusCode, error);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete product {ProductId}", productId);
            return false;
        }
    }

    public async Task<Product?> CreateProductAsync(Product product, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot create product: API settings not configured");
            return null;
        }

        try
        {
            var client = await CreateClientAsync(settings);

            // eCommerce API Product entity uses non-nullable DateTime — must send real values
            var now = DateTime.UtcNow;
            product.VersionCreatedAt ??= now;
            product.CreatedAt ??= now;
            product.UpdatedAt ??= now;

            var json = JsonSerializer.Serialize(product, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "products")
            {
                Content = content
            };
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var created = JsonSerializer.Deserialize<Product>(responseContent, JsonOptions);
                if (created != null && !string.IsNullOrEmpty(created.CategoryId))
                {
                    _cache.Remove($"EComm_Products_{created.CategoryId}");
                }
                _logger.LogInformation("Product created successfully with ID {ProductId}", created?.Id);
                return created;
            }

            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create product: {StatusCode} - {Error}", response.StatusCode, error);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create product");
            return null;
        }
    }

    public async Task<OrderListResult> GetOrdersAsync(string? status = null, int page = 1, int pageSize = 20, string? search = null, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return new OrderListResult();

        try
        {
            var client = await CreateClientAsync(settings);
            var qs = new List<string> { $"page={page}", $"pageSize={pageSize}" };
            if (!string.IsNullOrEmpty(status))
                qs.Add($"status={Uri.EscapeDataString(status)}");
            if (!string.IsNullOrEmpty(search))
                qs.Add($"search={Uri.EscapeDataString(search)}");
            var url = "orders?" + string.Join("&", qs);

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OrderListResult>(JsonOptions);
            return result ?? new OrderListResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch orders from eCommerce API");
            return new OrderListResult();
        }
    }

    public async Task<Order?> GetOrderAsync(string orderId)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"orders/{orderId}");
            if (!response.IsSuccessStatusCode)
                return null;
            return await response.Content.ReadFromJsonAsync<Order>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch order {OrderId}", orderId);
            return null;
        }
    }

    public async Task<Order?> UpdateOrderStatusAsync(string orderId, string status, string? notes = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var payload = new UpdateOrderStatusRequest { Status = status, Notes = notes };
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PutAsync($"orders/{orderId}/status", content);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to update order {OrderId} status: {Error}", orderId, err);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<Order>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update order {OrderId} status", orderId);
            return null;
        }
    }

    public async Task<CreatePaymentResult?> CreatePaymentAsync(string orderId, string returnUrl, string cancelUrl, string termsUrl)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var payload = new { returnUrl, cancelUrl, termsUrl };
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync($"orders/{orderId}/payment", content);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create payment for order {OrderId}: {Error}", orderId, err);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<CreatePaymentResult>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create payment for order {OrderId}", orderId);
            return null;
        }
    }

    public async Task<Cart?> GetCartAsync(string sessionId, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Get, "cart");
            request.Headers.Add("X-Session-ID", sessionId);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<Cart>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch cart for session {SessionId}", sessionId);
            return null;
        }
    }

    public async Task<CartItem?> AddCartItemAsync(string sessionId, string productId, string? variantId, string? optionId,
        int quantity, string? itemType = null, string? itemSubType = null, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var payload = new { productId, variantId, optionId, itemType, itemSubType, quantity };
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, "cart/items") { Content = content };
            request.Headers.Add("X-Session-ID", sessionId);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to add cart item for session {SessionId}: {Error}", sessionId, err);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<CartItem>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add cart item for session {SessionId}", sessionId);
            return null;
        }
    }

    public async Task<CartItem?> UpdateCartItemAsync(string sessionId, string itemId, int quantity, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { quantity }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Put, $"cart/items/{itemId}") { Content = content };
            request.Headers.Add("X-Session-ID", sessionId);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to update cart item {ItemId}: {Error}", itemId, err);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<CartItem>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update cart item {ItemId}", itemId);
            return null;
        }
    }

    public async Task<bool> RemoveCartItemAsync(string sessionId, string itemId, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Delete, $"cart/items/{itemId}");
            request.Headers.Add("X-Session-ID", sessionId);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove cart item {ItemId}", itemId);
            return false;
        }
    }

    public async Task<bool> ClearCartAsync(string sessionId, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Delete, "cart");
            request.Headers.Add("X-Session-ID", sessionId);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear cart for session {SessionId}", sessionId);
            return false;
        }
    }

    public async Task<Order?> CreateOrderAsync(string sessionId, CreateOrderRequest request, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var payload = new
            {
                sessionId,
                customer = request.Customer,
                shippingAddress = request.ShippingAddress,
                billingAddress = request.BillingAddress,
                shippingMethodId = request.ShippingMethodId,
                customProperties = request.CustomProperties
            };
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            // sessionId travels in the body (CreateOrderRequest.SessionId), not a header —
            // OrdersController.CreateOrder reads it there, unlike the cart endpoints above.
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "orders") { Content = content };
            httpRequest.Headers.Add("X-Tenant-ID", settings.TenantId);
            httpRequest.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create order for session {SessionId}: {Error}", sessionId, err);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<Order>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create order for session {SessionId}", sessionId);
            return null;
        }
    }

    public async Task<List<OrderStatusDefinition>> GetOrderStatusDefinitionsAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return new List<OrderStatusDefinition>();

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Get, "order-statuses");
            request.Headers.Add("X-Tenant-ID", settings.TenantId);

            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadFromJsonAsync<List<OrderStatusDefinition>>(JsonOptions)
                   ?? new List<OrderStatusDefinition>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch order status definitions");
            return new List<OrderStatusDefinition>();
        }
    }

    public async Task<bool> UpdateOptionPresetsAsync(List<OptionPreset> presets)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { presets }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{settings.MarketId}/option-presets", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update option presets");
            return false;
        }
    }

    private class PropertyTemplatesResponse
    {
        public List<PropertyTemplate> Templates { get; set; } = new();
    }

    public async Task<List<PropertyTemplate>> GetPropertyTemplatesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new List<PropertyTemplate>();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/property-templates");
            response.EnsureSuccessStatusCode();
            var wrapper = await response.Content.ReadFromJsonAsync<PropertyTemplatesResponse>(JsonOptions);
            return wrapper?.Templates ?? new List<PropertyTemplate>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch property templates for market {MarketId}", marketId);
            return new List<PropertyTemplate>();
        }
    }

    public async Task<bool> UpdatePropertyTemplatesAsync(string marketId, List<PropertyTemplate> templates)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { templates }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{marketId}/property-templates", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update property templates for market {MarketId}", marketId);
            return false;
        }
    }

    private class ShippingMethodsResponse
    {
        public List<ShippingMethod> Methods { get; set; } = new();
    }

    public async Task<List<ShippingMethod>> GetShippingMethodsAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new List<ShippingMethod>();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/shipping-methods");
            response.EnsureSuccessStatusCode();
            var wrapper = await response.Content.ReadFromJsonAsync<ShippingMethodsResponse>(JsonOptions);
            return wrapper?.Methods ?? new List<ShippingMethod>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch shipping methods for market {MarketId}", marketId);
            return new List<ShippingMethod>();
        }
    }

    public async Task<bool> UpdateShippingMethodsAsync(string marketId, List<ShippingMethod> methods)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { methods }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{marketId}/shipping-methods", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update shipping methods for market {MarketId}", marketId);
            return false;
        }
    }

    private class LeasingPeriodsResponse
    {
        public List<LeasingPeriod> Periods { get; set; } = new();
        public decimal? DefaultLeasingFactor { get; set; }
    }

    public async Task<LeasingSettings> GetLeasingPeriodsAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new LeasingSettings();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/leasing-periods");
            response.EnsureSuccessStatusCode();
            var wrapper = await response.Content.ReadFromJsonAsync<LeasingPeriodsResponse>(JsonOptions);
            return new LeasingSettings
            {
                Periods = wrapper?.Periods ?? new List<LeasingPeriod>(),
                DefaultLeasingFactor = wrapper?.DefaultLeasingFactor
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch leasing periods for market {MarketId}", marketId);
            return new LeasingSettings();
        }
    }

    public async Task<bool> UpdateLeasingPeriodsAsync(string marketId, List<LeasingPeriod> periods)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { periods }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{marketId}/leasing-periods", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update leasing periods for market {MarketId}", marketId);
            return false;
        }
    }

    public async Task<List<Discount>> GetDiscountsAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new List<Discount>();

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Get, "discounts");
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<List<Discount>>(JsonOptions) ?? new List<Discount>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch discounts");
            return new List<Discount>();
        }
    }

    public async Task<Discount?> CreateDiscountAsync(Discount d)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(d, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(HttpMethod.Post, "discounts") { Content = content };
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", settings.MarketId);
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<Discount>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create discount");
            return null;
        }
    }

    public async Task<Discount?> UpdateDiscountAsync(string id, Discount d)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(d, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var request = new HttpRequestMessage(HttpMethod.Put, $"discounts/{id}") { Content = content };
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", settings.MarketId);
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<Discount>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update discount {Id}", id);
            return null;
        }
    }

    public async Task<bool> DeleteDiscountAsync(string id)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Delete, $"discounts/{id}");
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", settings.MarketId);
            var response = await client.SendAsync(request);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete discount {Id}", id);
            return false;
        }
    }

    private Task<HttpClient> CreateClientAsync(CommerceSettings settings)
    {
        var client = _httpClientFactory.CreateClient("ECommApi");
        // Trailing slash is required: HttpClient/RFC 3986 merge rules replace the base's last
        // path segment (e.g. "v1") instead of appending when the base has no trailing slash and
        // the relative request path has no leading slash.
        client.BaseAddress = new Uri(settings.ApiBaseUrl.TrimEnd('/') + "/");

        if (!string.IsNullOrEmpty(settings.ApiKey))
        {
            client.DefaultRequestHeaders.Add("X-API-Key", settings.ApiKey);
        }

        return Task.FromResult(client);
    }
}
