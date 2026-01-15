using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Extensions;

namespace EComm.Umbraco.Commerce.ContentFinders;

/// <summary>
/// Content finder that routes product URLs directly to category pages (single-node approach).
///
/// URL patterns:
/// - /shop/electronics → Category listing
/// - /shop/electronics/laptop-xyz → Product detail (routes to category page with product context)
/// - /shop/electronics/gaming/mouse-xyz → Product detail in nested category
///
/// No product template nodes required - category pages handle both listings and product details.
/// </summary>
public class ProductContentFinder : IContentFinder
{
    private readonly IUmbracoContextAccessor _umbracoContextAccessor;
    private readonly IDocumentUrlService _documentUrlService;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<ProductContentFinder> _logger;
    private readonly IMemoryCache _cache;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ProductContentFinder(
        IUmbracoContextAccessor umbracoContextAccessor,
        IDocumentUrlService documentUrlService,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<ProductContentFinder> logger,
        IMemoryCache cache,
        IHttpContextAccessor httpContextAccessor)
    {
        _umbracoContextAccessor = umbracoContextAccessor;
        _documentUrlService = documentUrlService;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
        _cache = cache;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<bool> TryFindContent(IPublishedRequestBuilder request)
    {
        // Create scope to access scoped services
        using var scope = _serviceScopeFactory.CreateScope();
        var settingsService = scope.ServiceProvider.GetRequiredService<ICommerceSettingsService>();

        // Load settings to get configurable aliases
        var settings = await settingsService.GetSettingsAsync();
        var categoryPageAlias = settings?.CategoryPageAlias ?? "categoryPage";
        var categoryIdPropertyAlias = settings?.CategoryIdPropertyAlias ?? "categoryId";

        // Get the Umbraco context
        if (!_umbracoContextAccessor.TryGetUmbracoContext(out var umbracoContext))
        {
            return false;
        }

        var path = request.Uri.GetAbsolutePathDecoded();
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        _logger.LogDebug("ProductContentFinder checking path: {Path}, segments: {SegmentCount}", path, segments.Length);

        var content = umbracoContext?.Content;
        if (content == null)
        {
            return false;
        }

        // Handle single-segment URLs (e.g., /prod-3) as potential product-only URLs
        if (segments.Length == 1)
        {
            var productSlugSingle = segments[0];
            
            // Try to find product by ID/slug across all categories
            var apiClientSingle = scope.ServiceProvider.GetRequiredService<ICommerceApiClient>();
            var productSingle = await apiClientSingle.GetProductAsync(productSlugSingle);
            
            if (productSingle == null)
            {
                _logger.LogDebug("Single-segment URL {Path} is not a valid product", path);
                return false;
            }
            
            // Find the category page that matches this product's categoryId  
            IPublishedContent? categorySingle = null;
            
            // Strategy: Search through content by getting a known page first
            // Try to find the first category page at common paths
            var commonPaths = new[] { "/", "/shop", "/products", "/store" };
            IPublishedContent? startingPoint = null;
            
            foreach (var testPath in commonPaths)
            {
                var testKey = _documentUrlService.GetDocumentKeyByRoute(testPath, null, null, false);
                if (testKey.HasValue)
                {
                    startingPoint = content.GetById(testKey.Value);
                    if (startingPoint != null) break;
                }
            }
            
            // If we found a starting point, search from root
            if (startingPoint != null)
            {
                var rootNode = startingPoint.Root();
                
                if (!string.IsNullOrEmpty(productSingle.CategoryId))
                {
                    categorySingle = rootNode.DescendantsOrSelf()
                        .FirstOrDefault(x => x.ContentType.Alias == categoryPageAlias &&
                                           x.Value<string>(categoryIdPropertyAlias) == productSingle.CategoryId);
                }
                
                // Fallback: use any category page if specific one not found
                if (categorySingle == null)
                {
                    categorySingle = rootNode.DescendantsOrSelf()
                        .FirstOrDefault(x => x.ContentType.Alias == categoryPageAlias);
                }
            }
            
            if (categorySingle == null)
            {
                _logger.LogWarning("Product {ProductId} found but no category page exists in Umbraco", productSingle.Id);
                return false;
            }
            
            // Route to the category page with product context
            request.SetPublishedContent(categorySingle);
            
            var httpCtx = _httpContextAccessor.HttpContext;
            if (httpCtx != null)
            {
                httpCtx.Items["ProductSlug"] = productSlugSingle;
                httpCtx.Items["IsProductPage"] = true;
                httpCtx.Items["ProductData"] = productSingle;
                
                _logger.LogDebug("Routing single-segment product URL {ProductId} ({Slug}) to category page {CategoryName}",
                    productSingle.Id, productSlugSingle, categorySingle.Name);
            }
            
            return true;
        }

        // Need at least 2 segments for category/product URLs
        if (segments.Length < 2)
        {
            return false;
        }

        // Check if URL might be a product detail page
        // Try to find a category node at the parent path
        var categoryPath = "/" + string.Join("/", segments.Take(segments.Length - 1));
        var potentialProductSlug = segments.Last();

        // First, try to find category at full path (might be category listing, not product)
        var fullPathKey = _documentUrlService.GetDocumentKeyByRoute(path, culture: null, documentStartNodeId: null, isDraft: false);
        if (fullPathKey.HasValue)
        {
            var fullPathNode = content.GetById(fullPathKey.Value);
            if (fullPathNode != null && fullPathNode.ContentType.Alias == categoryPageAlias)
            {
                // This is a category page URL, not a product - let default routing handle it
                return false;
            }
        }

        // Try to find category at parent path (this would make current segment a product slug)
        var documentKey = _documentUrlService.GetDocumentKeyByRoute(categoryPath, culture: null, documentStartNodeId: null, isDraft: false);
        
        _logger.LogDebug("Looking for category at path: {CategoryPath}, found: {Found}", categoryPath, documentKey.HasValue);
        
        if (!documentKey.HasValue)
        {
            return false;
        }

        var categoryNode = content.GetById(documentKey.Value);

        if (categoryNode == null || categoryNode.ContentType.Alias != categoryPageAlias)
        {
            _logger.LogDebug("Category node is null or wrong type. IsNull: {IsNull}, Alias: {Alias}", 
                categoryNode == null, categoryNode?.ContentType.Alias);
            return false;
        }

        // Get the category ID from the node
        var categoryId = categoryNode.Value<string>(categoryIdPropertyAlias);

        _logger.LogDebug("Found category node: {NodeName}, CategoryId: {CategoryId}", 
            categoryNode.Name, categoryId);

        if (string.IsNullOrEmpty(categoryId))
        {
            _logger.LogWarning("Category node {NodeId} at {Path} has no {PropertyAlias} configured",
                categoryNode.Id, categoryPath, categoryIdPropertyAlias);
            return false;
        }

        // Fetch the product from the API to verify this is actually a product URL
        var apiClient = scope.ServiceProvider.GetRequiredService<ICommerceApiClient>();

        // Try cache first for better performance
        var cacheKey = $"product:{categoryId}:{potentialProductSlug}";
        var product = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
            
            // Try to get product by ID first (since slugs may not be populated)
            var prod = await apiClient.GetProductAsync(potentialProductSlug);

            // If not found by ID, try by slug
            if (prod == null)
            {
                prod = await apiClient.GetProductBySlugAsync(categoryId, potentialProductSlug);
            }

            return prod;
        });

        if (product == null)
        {
            _logger.LogDebug("Product {Identifier} not found in category {CategoryId} - not a product URL", 
                potentialProductSlug, categoryId);
            return false; // Not a product URL, let default routing handle it
        }

        // This IS a product URL - route to the category page but store product context
        request.SetPublishedContent(categoryNode);

        // Store product context in HttpContext.Items for controller/view access
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext != null)
        {
            httpContext.Items["ProductSlug"] = potentialProductSlug;
            httpContext.Items["IsProductPage"] = true;
            httpContext.Items["ProductData"] = product;
            
            _logger.LogDebug("Routing product {ProductId} ({Slug}) to category page {CategoryPath}",
                product.Id, potentialProductSlug, categoryPath);
        }

        return true;
    }
}
