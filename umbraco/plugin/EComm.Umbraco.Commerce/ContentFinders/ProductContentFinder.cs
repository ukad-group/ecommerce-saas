using EComm.Umbraco.Commerce.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Extensions;

namespace EComm.Umbraco.Commerce.ContentFinders;

/// <summary>
/// Content finder that routes product URLs to the Product template node.
///
/// URL pattern: /shop/electronics/laptop-xyz
/// - Finds category node at /shop/electronics
/// - Extracts product slug "laptop-xyz"
/// - Fetches product from eCommerce API
/// - Routes to Product template node with product data
/// </summary>
public class ProductContentFinder : IContentFinder
{
    private readonly IUmbracoContextAccessor _umbracoContextAccessor;
    private readonly IDocumentUrlService _documentUrlService;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<ProductContentFinder> _logger;

    // Document type aliases
    private const string CategoryPageAlias = "categoryPage";
    private const string ProductPageAlias = "productPage";
    private const string CategoryIdPropertyAlias = "categoryId";

    public ProductContentFinder(
        IUmbracoContextAccessor umbracoContextAccessor,
        IDocumentUrlService documentUrlService,
        IServiceScopeFactory serviceScopeFactory,
        ILogger<ProductContentFinder> logger)
    {
        _umbracoContextAccessor = umbracoContextAccessor;
        _documentUrlService = documentUrlService;
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    public async Task<bool> TryFindContent(IPublishedRequestBuilder request)
    {
        // Get the Umbraco context
        if (!_umbracoContextAccessor.TryGetUmbracoContext(out var umbracoContext))
        {
            return false;
        }

        var path = request.Uri.GetAbsolutePathDecoded();
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);

        // Need at least 2 segments (category + product)
        if (segments.Length < 2)
        {
            return false;
        }

        // Try to find a category page at the parent path
        var categoryPath = "/" + string.Join("/", segments.Take(segments.Length - 1));
        var productSlug = segments.Last();

        // Skip if this looks like the Product template node itself
        if (productSlug.Equals("product", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var content = umbracoContext?.Content;
        if (content == null)
        {
            return false;
        }

        // Find the category node using the new API
        // Note: documentStartNodeId of null means search from root, isDraft: false means published content only
        var documentKey = _documentUrlService.GetDocumentKeyByRoute(categoryPath, culture: null, documentStartNodeId: null, isDraft: false);
        if (!documentKey.HasValue)
        {
            return false;
        }

        var categoryNode = content.GetById(documentKey.Value);

        if (categoryNode == null || categoryNode.ContentType.Alias != CategoryPageAlias)
        {
            return false;
        }

        // Get the category ID from the node
        var categoryId = categoryNode.Value<string>(CategoryIdPropertyAlias);

        if (string.IsNullOrEmpty(categoryId))
        {
            _logger.LogWarning("Category node {NodeId} at {Path} has no categoryId configured",
                categoryNode.Id, categoryPath);
            return false;
        }

        // Find the Product template child node
        // Note: Using Children() extension method instead of obsolete Children property
        var productTemplateNode = categoryNode.Children()
            .FirstOrDefault(c => c.ContentType.Alias == ProductPageAlias);

        if (productTemplateNode == null)
        {
            _logger.LogDebug("Category {CategoryId} has no product template node", categoryId);
            return false;
        }

        // Fetch the product from the API using a scoped service
        // Note: Using IServiceScopeFactory to resolve scoped services from this singleton
        using var scope = _serviceScopeFactory.CreateScope();
        var apiClient = scope.ServiceProvider.GetRequiredService<ICommerceApiClient>();

        var product = await apiClient.GetProductBySlugAsync(categoryId, productSlug);

        if (product == null)
        {
            _logger.LogDebug("Product {Slug} not found in category {CategoryId}", productSlug, categoryId);
            return false; // Let Umbraco handle 404
        }

        // Store product data for the template to access
        request.SetPublishedContent(productTemplateNode);

        // Store product in HttpContext.Items for template access
        if (request is IPublishedRequest publishedRequest)
        {
            // The template can access this via ViewData or HttpContext.Items
            _logger.LogDebug("Routing to product {ProductId} ({Slug}) in category {CategoryId}",
                product.Id, productSlug, categoryId);
        }

        return true;
    }
}
