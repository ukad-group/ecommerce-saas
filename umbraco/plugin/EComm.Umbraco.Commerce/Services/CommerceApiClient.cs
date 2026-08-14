using System.Linq;
using System.Net;
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

    /// <summary>
    /// Distinct keys for the two different lists this endpoint serves: the static ISO reference list
    /// and one market's own countries. Spelled out rather than interpolating a "all" sentinel, so a
    /// market whose id happened to be that sentinel couldn't collide with the reference list.
    /// </summary>
    private static string CountriesCacheKey(string? marketId)
        => string.IsNullOrEmpty(marketId) ? "EComm_Countries_iso" : $"EComm_Countries_market_{marketId}";

    public async Task<List<Country>> GetCountriesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Commerce settings not configured");
            return new List<Country>();
        }

        // No implicit market default: passing one restricts the list to that market's configured
        // countries, and every caller so far wants the full ISO reference list (to create countries
        // from, and to pick tax-rate overrides — a tax law is independent of where a store ships).
        var cacheKey = CountriesCacheKey(marketId);

        if (_cache.TryGetValue(cacheKey, out List<Country>? cachedCountries) && cachedCountries != null)
        {
            return cachedCountries;
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = string.IsNullOrEmpty(marketId) ? "countries" : $"countries?marketId={marketId}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var countries = await response.Content.ReadFromJsonAsync<List<Country>>(JsonOptions);
            countries ??= new List<Country>();

            // Never cache "no countries". A market with none configured legitimately answers an empty
            // list, and caching that strands a storefront for the whole cache window after an admin
            // adds the first country — with a checkout view that renders its country field only when
            // the list is non-empty, the field silently disappears. An empty answer is also what a
            // null body or a shape change looks like, so it is exactly the answer worth re-asking.
            if (countries.Count > 0)
                _cache.Set(cacheKey, countries, CategoryCacheDuration);
            else
                _logger.LogDebug("No countries returned for {CacheKey} — not cached", cacheKey);

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

    // Envelope returned by the API when paged=true.
    private class PagedProductsResponse
    {
        public List<Product> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public async Task<ProductListResult> GetCategoryProductsPagedAsync(string categoryId, int page, int pageSize, string? search = null, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return new ProductListResult { Page = page, PageSize = pageSize };
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"products?tenantId={settings.TenantId}&marketId={marketId ?? settings.MarketId}"
                    + $"&categoryId={Uri.EscapeDataString(categoryId)}&paged=true&page={page}&pageSize={pageSize}";
            if (!string.IsNullOrWhiteSpace(search))
                url += $"&search={Uri.EscapeDataString(search)}";

            var response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var envelope = await response.Content.ReadFromJsonAsync<PagedProductsResponse>(JsonOptions);
            return new ProductListResult
            {
                Products = envelope?.Items ?? new List<Product>(),
                TotalCount = envelope?.Total ?? 0,
                Page = envelope?.Page ?? page,
                PageSize = envelope?.PageSize ?? pageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch paged products for category {CategoryId}", categoryId);
            return new ProductListResult { Page = page, PageSize = pageSize };
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

    public async Task<(Product? Product, string? Error)> UpdateProductAsync(string productId, Product product, string userId, string? changeNotes = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot update product: API settings not configured");
            return (null, "Commerce API is not configured");
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

                return (updated, null);
            }

            var error = await ReadErrorAsync(response);
            _logger.LogError("Failed to update product {ProductId}: {StatusCode} - {Error}",
                productId, response.StatusCode, error);
            return (null, error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update product {ProductId}", productId);
            return (null, ex.Message);
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

    public async Task<(bool Success, string? Error)> DeleteProductAsync(string productId)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot delete product: API settings not configured");
            return (false, "Commerce API is not configured");
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
                return (true, null);
            }

            var error = await ReadErrorAsync(response);
            _logger.LogError("Failed to delete product {ProductId}: {StatusCode} - {Error}",
                productId, response.StatusCode, error);
            return (false, error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete product {ProductId}", productId);
            return (false, ex.Message);
        }
    }

    public async Task<(Product? Product, string? Error)> CreateProductAsync(Product product, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Cannot create product: API settings not configured");
            return (null, "Commerce API is not configured");
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
                return (created, null);
            }

            var error = await ReadErrorAsync(response);
            _logger.LogError("Failed to create product: {StatusCode} - {Error}", response.StatusCode, error);
            return (null, error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create product");
            return (null, ex.Message);
        }
    }

    public async Task<OrderListResult> GetOrdersAsync(string? status = null, int page = 1, int pageSize = 20, string? search = null, string? marketId = null, OrderFilter? filter = null)
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
            foreach (var (name, value) in filter?.ToQuery() ?? [])
                qs.Add($"{name}={Uri.EscapeDataString(value)}");
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

    public async Task<CreatePaymentResult?> CreatePaymentAsync(string orderId)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);

            // No body: the URLs and language the payment needs are the market's provider settings.
            var response = await client.PostAsync($"orders/{orderId}/payment", content: null);
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

    public async Task<CartListResult> GetCartsAsync(int page = 1, int pageSize = 20, string? search = null, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return new CartListResult();

        try
        {
            var client = await CreateClientAsync(settings);
            var qs = new List<string> { $"page={page}", $"pageSize={pageSize}" };
            if (!string.IsNullOrEmpty(search))
                qs.Add($"search={Uri.EscapeDataString(search)}");
            var url = "carts?" + string.Join("&", qs);

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<CartListResult>(JsonOptions);
            return result ?? new CartListResult();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch carts from eCommerce API");
            return new CartListResult();
        }
    }

    public async Task<CartItem?> AddCartItemAsync(string sessionId, string productId, string? variantId,
        int quantity, string? itemType = null, string? itemSubType = null, string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return null;

        try
        {
            var client = await CreateClientAsync(settings);
            var payload = new { productId, variantId, itemType, itemSubType, quantity };
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

    public async Task<Order?> UpdateOrderAsync(string orderId, string sessionId, CreateOrderRequest request, string? marketId = null)
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

            // Same body as CreateOrderAsync — the API takes CreateOrderRequest for both, so the update
            // re-prices from the cart exactly like a first submit.
            var httpRequest = new HttpRequestMessage(HttpMethod.Put, $"orders/{orderId}") { Content = content };
            httpRequest.Headers.Add("X-Tenant-ID", settings.TenantId);
            httpRequest.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(httpRequest);
            if (!response.IsSuccessStatusCode)
            {
                // 404 (gone) and 409 (settled) are expected outcomes, not faults — the caller falls back
                // to creating a new order when this returns null.
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Could not update order {OrderId} ({Status}): {Error}", orderId, (int)response.StatusCode, err);
                return null;
            }
            return await response.Content.ReadFromJsonAsync<Order>(JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update order {OrderId}", orderId);
            return null;
        }
    }

    public async Task<List<OrderStatusDefinition>> GetOrderStatusDefinitionsAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
            return new List<OrderStatusDefinition>();

        try
        {
            var client = await CreateClientAsync(settings);
            var request = new HttpRequestMessage(HttpMethod.Get, "order-statuses");
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

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

    public async Task<(OrderStatusDefinition? Status, string? Error)> CreateOrderStatusDefinitionAsync(OrderStatusDefinition status, string? marketId = null)
        => await SendOrderStatusAsync(HttpMethod.Post, "order-statuses", status, marketId);

    public async Task<(OrderStatusDefinition? Status, string? Error)> UpdateOrderStatusDefinitionAsync(string id, OrderStatusDefinition status, string? marketId = null)
        => await SendOrderStatusAsync(HttpMethod.Put, $"order-statuses/{id}", status, marketId);

    private async Task<(OrderStatusDefinition?, string?)> SendOrderStatusAsync(HttpMethod method, string path, OrderStatusDefinition status, string? marketId)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return (null, "Commerce API is not configured");

        try
        {
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(status, JsonOptions);
            var request = new HttpRequestMessage(method, path)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var err = await ReadErrorAsync(response);
                _logger.LogError("Failed to {Method} {Path}: {Error}", method, path, err);
                return (null, err);
            }
            return (await response.Content.ReadFromJsonAsync<OrderStatusDefinition>(JsonOptions), null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to {Method} {Path}", method, path);
            return (null, ex.Message);
        }
    }

    public async Task<(string? Error, int InUseCount)> DeleteOrderStatusDefinitionAsync(string id, string? marketId = null, string? reassignTo = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return ("Commerce API is not configured", 0);

        try
        {
            var client = await CreateClientAsync(settings);
            var path = $"order-statuses/{id}";
            if (!string.IsNullOrWhiteSpace(reassignTo)) path += $"?reassignTo={Uri.EscapeDataString(reassignTo)}";
            var request = new HttpRequestMessage(HttpMethod.Delete, path);
            request.Headers.Add("X-Tenant-ID", settings.TenantId);
            request.Headers.Add("X-Market-ID", marketId ?? settings.MarketId);

            var response = await client.SendAsync(request);
            if (response.IsSuccessStatusCode) return (null, 0);

            var err = await ReadErrorAsync(response);
            // 409 + inUseCount is the API asking where the orders should go, not a plain failure.
            var inUse = response.StatusCode == HttpStatusCode.Conflict ? await ReadIntAsync(response, "inUseCount") : 0;
            _logger.LogError("Failed to delete order status {Id}: {Error}", id, err);
            return (err, inUse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete order status {Id}", id);
            return (ex.Message, 0);
        }
    }

    /// <summary>Reads a number out of an error body, 0 when it isn't there.</summary>
    private static async Task<int> ReadIntAsync(HttpResponseMessage response, string property)
    {
        try
        {
            var doc = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                await response.Content.ReadAsStringAsync(), JsonOptions);
            return doc != null && doc.TryGetValue(property, out var v) && v.TryGetInt32(out var n) ? n : 0;
        }
        catch (JsonException) { return 0; }
    }

    /// <summary>
    /// Pulls the message out of the API's error body, falling back to the raw body. The API refuses
    /// in two dialects — `{ "error": "…", "suggestion": "…" }` and `{ "message": "…" }` (what the
    /// products endpoints answer, e.g. "Duplicate variant SKU 'X'") — so read both. A ProblemDetails
    /// body falls through to the raw JSON, which the backoffice unwraps for display.
    /// </summary>
    private static async Task<string> ReadErrorAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        try
        {
            var doc = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body, JsonOptions);
            if (doc != null && doc.TryGetValue("error", out var error) && error.ValueKind == JsonValueKind.String)
            {
                var suggestion = doc.TryGetValue("suggestion", out var s) && s.ValueKind == JsonValueKind.String ? $" {s.GetString()}" : "";
                return $"{error.GetString()}{suggestion}";
            }
            if (doc != null && doc.TryGetValue("message", out var message) && message.ValueKind == JsonValueKind.String)
            {
                return message.GetString()!;
            }
        }
        catch (JsonException) { /* not JSON — use the raw body */ }
        return string.IsNullOrWhiteSpace(body) ? response.StatusCode.ToString() : body;
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

    private class AttributesResponse
    {
        public List<ProductAttribute> Attributes { get; set; } = new();
    }

    private class AttributePresetsResponse
    {
        public List<ProductAttributePreset> Presets { get; set; } = new();
    }

    public async Task<List<ProductAttribute>> GetAttributesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new List<ProductAttribute>();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/attributes?pageSize=0");
            response.EnsureSuccessStatusCode();
            var wrapper = await response.Content.ReadFromJsonAsync<AttributesResponse>(JsonOptions);
            return wrapper?.Attributes ?? new List<ProductAttribute>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch product attributes for market {MarketId}", marketId);
            return new List<ProductAttribute>();
        }
    }

    public async Task<bool> UpdateAttributesAsync(string? marketId, List<ProductAttribute> attributes)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { attributes }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{mid}/attributes", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update product attributes for market {MarketId}", marketId);
            return false;
        }
    }

    public async Task<List<ProductAttributePreset>> GetAttributePresetsAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new List<ProductAttributePreset>();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/attribute-presets?pageSize=0");
            response.EnsureSuccessStatusCode();
            var wrapper = await response.Content.ReadFromJsonAsync<AttributePresetsResponse>(JsonOptions);
            return wrapper?.Presets ?? new List<ProductAttributePreset>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch attribute presets for market {MarketId}", marketId);
            return new List<ProductAttributePreset>();
        }
    }

    public async Task<bool> UpdateAttributePresetsAsync(string? marketId, List<ProductAttributePreset> presets)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { presets }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{mid}/attribute-presets", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update attribute presets for market {MarketId}", marketId);
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

    // ----- Payment providers (JSON passthrough — the plugin doesn't model provider schemas) -----

    public async Task<JsonElement> GetPaymentProviderCatalogAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return default;
        var client = await CreateClientAsync(settings);
        var response = await client.GetAsync("payments/providers");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<JsonElement> GetMarketPaymentProvidersAsync(string marketId)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return default;
        var client = await CreateClientAsync(settings);
        var response = await client.GetAsync($"admin/markets/{marketId}/payment-providers");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<JsonElement> UpsertMarketPaymentProviderAsync(string marketId, string alias, JsonElement settings)
    {
        var config = await _settingsService.GetSettingsAsync();
        if (config == null || !config.IsValid) return default;
        var client = await CreateClientAsync(config);
        var content = new StringContent(settings.GetRawText(), Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"admin/markets/{marketId}/payment-providers/{alias}", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<bool> DeleteMarketPaymentProviderAsync(string marketId, string alias)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;
        var client = await CreateClientAsync(settings);
        var response = await client.DeleteAsync($"admin/markets/{marketId}/payment-providers/{alias}");
        return response.IsSuccessStatusCode;
    }

    public async Task<JsonElement> GetPaymentProviderSecretAsync(string marketId, string alias, string key)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return default;
        var client = await CreateClientAsync(settings);
        var response = await client.GetAsync($"admin/markets/{marketId}/payment-providers/{alias}/secrets/{key}");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<JsonElement> SetActivePaymentProviderAsync(string marketId, string? alias)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return default;
        var client = await CreateClientAsync(settings);
        var json = JsonSerializer.Serialize(new { alias }, JsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"admin/markets/{marketId}/active-payment-provider", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<JsonElement> SetOrderStatusAfterPaymentAsync(string marketId, string? code)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return default;
        var client = await CreateClientAsync(settings);
        var json = JsonSerializer.Serialize(new { code }, JsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"admin/markets/{marketId}/order-status-after-payment", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<JsonElement> SetPaymentSurchargeAsync(string marketId, string alias, JsonElement surcharge)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return default;
        var client = await CreateClientAsync(settings);
        var content = new StringContent(surcharge.GetRawText(), Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"admin/markets/{marketId}/payment-providers/{alias}/surcharge", content);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
    }

    public async Task<bool> DeletePaymentSurchargeAsync(string marketId, string alias)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;
        var client = await CreateClientAsync(settings);
        var response = await client.DeleteAsync($"admin/markets/{marketId}/payment-providers/{alias}/surcharge");
        return response.IsSuccessStatusCode;
    }

    public async Task<TaxClassesResponse> GetTaxClassesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new TaxClassesResponse();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/tax-classes");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<TaxClassesResponse>(JsonOptions)
                   ?? new TaxClassesResponse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch tax classes for market {MarketId}", marketId);
            return new TaxClassesResponse();
        }
    }

    /// <summary>taxRate null leaves the market's stored fallback rate untouched.</summary>
    public async Task<bool> UpdateTaxClassesAsync(string? marketId, List<TaxClass> taxClasses, decimal? taxRate = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { taxClasses, taxRate }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{mid}/tax-classes", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update tax classes for market {MarketId}", marketId);
            return false;
        }
    }

    // ----- Currencies + Countries (market-scoped; saved whole-list) -----

    public async Task<CurrenciesResponse> GetCurrenciesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new CurrenciesResponse();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/currencies");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<CurrenciesResponse>(JsonOptions)
                   ?? new CurrenciesResponse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch currencies for market {MarketId}", marketId);
            return new CurrenciesResponse();
        }
    }

    public async Task<bool> UpdateCurrenciesAsync(string? marketId, List<Currency> currencies)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { currencies }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{mid}/currencies", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update currencies for market {MarketId}", marketId);
            return false;
        }
    }

    public async Task<MarketCountriesResponse> GetMarketCountriesAsync(string? marketId = null)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new MarketCountriesResponse();

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync($"admin/markets/{mid}/countries");
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<MarketCountriesResponse>(JsonOptions)
                   ?? new MarketCountriesResponse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch countries for market {MarketId}", marketId);
            return new MarketCountriesResponse();
        }
    }

    public async Task<bool> UpdateMarketCountriesAsync(string? marketId, List<MarketCountry> countries)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return false;

        try
        {
            var mid = marketId ?? settings.MarketId;
            var client = await CreateClientAsync(settings);
            var json = JsonSerializer.Serialize(new { countries }, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PutAsync($"admin/markets/{mid}/countries", content);

            // Evict this market's cached list, as the category and product writes do — otherwise a
            // storefront keeps serving the pre-save countries for the rest of the cache window. The
            // ISO reference key is deliberately left alone: it is static and unaffected by a store's
            // configuration.
            if (response.IsSuccessStatusCode)
                _cache.Remove(CountriesCacheKey(mid));

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update countries for market {MarketId}", marketId);
            return false;
        }
    }

    /// <summary>Reference data only — never changes at runtime, so it's cached like the ISO list.</summary>
    public async Task<CurrencyPresetsResponse> GetCurrencyPresetsAsync()
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid) return new CurrencyPresetsResponse();

        const string cacheKey = "EComm_CurrencyPresets";
        if (_cache.TryGetValue(cacheKey, out CurrencyPresetsResponse? cached) && cached != null)
            return cached;

        try
        {
            var client = await CreateClientAsync(settings);
            var response = await client.GetAsync("currencies/presets");
            response.EnsureSuccessStatusCode();
            var presets = await response.Content.ReadFromJsonAsync<CurrencyPresetsResponse>(JsonOptions)
                          ?? new CurrencyPresetsResponse();

            _cache.Set(cacheKey, presets, CategoryCacheDuration);
            return presets;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch currency presets");
            return new CurrencyPresetsResponse();
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
