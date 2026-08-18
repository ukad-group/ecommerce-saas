using EComm.Commerce.Demo.Services;
using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Extensions;

namespace EComm.Commerce.Demo.Controllers;

/// <summary>
/// Controller for the storeRoot document type - the store landing page.
///
/// Product counts come from the eCommerce API, not from the Umbraco tree. Counting child nodes
/// instead would report the content structure (subcategory and product nodes) rather than the
/// catalogue, so a category with products but no product nodes would read as empty, and the
/// number would disagree with the count the category page itself shows.
/// </summary>
public class StoreRootController : RenderController
{
    private readonly ICommerceApiClient _commerceApiClient;
    private readonly ILogger<StoreRootController> _logger;
    private readonly IPublishedValueFallback _publishedValueFallback;

    public StoreRootController(
        ILogger<StoreRootController> logger,
        ICompositeViewEngine compositeViewEngine,
        IUmbracoContextAccessor umbracoContextAccessor,
        ICommerceApiClient commerceApiClient,
        IPublishedValueFallback publishedValueFallback)
        : base(logger, compositeViewEngine, umbracoContextAccessor)
    {
        _commerceApiClient = commerceApiClient;
        _logger = logger;
        _publishedValueFallback = publishedValueFallback;
    }

    public override IActionResult Index()
    {
        var content = CurrentPage;
        if (content == null) return NotFound();

        // This node IS the store, so remember it for /cart and /checkout, which have no content
        // node of their own to resolve from.
        var storeId = StoreContext.ResolveAndRemember(content, HttpContext);

        var viewModel = new StoreRootViewModel(content, _publishedValueFallback)
        {
            StoreId = storeId
        };

        foreach (var node in content.Children().Where(c => c.ContentType.Alias == "categoryPage"))
        {
            var categoryId = node.Value<string>("categoryId");
            int? productCount = null;

            if (!string.IsNullOrEmpty(categoryId))
            {
                try
                {
                    // pageSize 1 - only the total is needed, not the products themselves.
                    var result = _commerceApiClient
                        .GetProductsAsync(categoryId, page: 1, pageSize: 1, marketId: storeId)
                        .GetAwaiter().GetResult();
                    productCount = result.TotalCount;
                }
                catch (Exception ex)
                {
                    // A count that can't be fetched is left unknown rather than shown as zero -
                    // reporting "0 products" for a category that has some is worse than saying
                    // nothing.
                    _logger.LogError(ex, "Could not count products for category {CategoryId}", categoryId);
                }
            }

            viewModel.Categories.Add(new StoreCategoryLink
            {
                Content = node,
                CategoryId = categoryId,
                ProductCount = productCount
            });
        }

        return CurrentTemplate(viewModel);
    }
}

public class StoreRootViewModel : PublishedContentWrapped
{
    public StoreRootViewModel(IPublishedContent content, IPublishedValueFallback publishedValueFallback)
        : base(content, publishedValueFallback)
    {
    }

    public string? StoreId { get; set; }
    public List<StoreCategoryLink> Categories { get; set; } = new();
}

public class StoreCategoryLink
{
    public required IPublishedContent Content { get; init; }
    public string? CategoryId { get; init; }

    /// <summary>Products in this category (descendants included), or null if unknown.</summary>
    public int? ProductCount { get; init; }
}
