using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EComm.Umbraco.Commerce.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

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
        ILogger<CommerceApiClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settingsService = settingsService;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<Category>> GetCategoriesAsync()
    {
        var cacheKey = "EComm_Categories";

        if (_cache.TryGetValue(cacheKey, out List<Category>? cachedCategories) && cachedCategories != null)
        {
            return cachedCategories;
        }

        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            _logger.LogWarning("Commerce settings not configured");
            return new List<Category>();
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"/api/v1/categories?tenantId={settings.TenantId}&marketId={settings.MarketId}";

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
            var url = $"/api/v1/categories/{categoryId}";

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

    public async Task<ProductListResult> GetProductsAsync(string categoryId, int page = 1, int pageSize = 20)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return new ProductListResult();
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"/api/v1/products?tenantId={settings.TenantId}&marketId={settings.MarketId}&categoryId={categoryId}&page={page}&pageSize={pageSize}";

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

    public async Task<ProductListResult> GetAllProductsAsync(int page = 1, int pageSize = 100)
    {
        var settings = await _settingsService.GetSettingsAsync();
        if (settings == null || !settings.IsValid)
        {
            return new ProductListResult();
        }

        try
        {
            var client = await CreateClientAsync(settings);
            var url = $"/api/v1/products?tenantId={settings.TenantId}&marketId={settings.MarketId}&page={page}&pageSize={pageSize}";

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

    public async Task<Product?> GetProductBySlugAsync(string categoryId, string slug)
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
            var url = $"/api/v1/products/by-slug/{slug}?tenantId={settings.TenantId}&marketId={settings.MarketId}&categoryId={categoryId}";

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
            var url = $"/api/v1/products/{productId}";

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

    public async Task<Product?> UpdateProductAsync(string productId, Product product, string? changeNotes = null)
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
            var url = $"/api/v1/products/{productId}";

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

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var updated = JsonSerializer.Deserialize<Product>(responseContent, JsonOptions);

                if (updated != null)
                {
                    // Clear cache for this product and its category products list
                    _cache.Remove($"EComm_Product_{productId}");
                    if (!string.IsNullOrEmpty(product.CategoryId))
                    {
                        _cache.Remove($"EComm_Products_{product.CategoryId}");
                    }

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

    private Task<HttpClient> CreateClientAsync(CommerceSettings settings)
    {
        var client = _httpClientFactory.CreateClient("ECommApi");
        client.BaseAddress = new Uri(settings.ApiBaseUrl.TrimEnd('/'));

        if (!string.IsNullOrEmpty(settings.ApiKey))
        {
            client.DefaultRequestHeaders.Add("X-API-Key", settings.ApiKey);
        }

        return Task.FromResult(client);
    }
}
