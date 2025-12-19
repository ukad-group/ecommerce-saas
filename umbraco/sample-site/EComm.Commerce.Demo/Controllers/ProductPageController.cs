using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;
using Umbraco.Extensions;

namespace EComm.Commerce.Demo.Controllers;

/// <summary>
/// Controller for productPage document type
/// Fetches product details from the eCommerce API and displays them
/// </summary>
public class ProductPageController : RenderController
{
    private readonly ICommerceApiClient _commerceApiClient;
    private readonly ILogger<ProductPageController> _logger;
    private readonly IPublishedValueFallback _publishedValueFallback;

    public ProductPageController(
        ILogger<ProductPageController> logger,
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
        // Get the current page content (the product template node)
        var content = CurrentPage;
        if (content == null)
        {
            return NotFound();
        }

        // Create the view model
        var viewModel = new ProductPageViewModel(content, _publishedValueFallback);

        // Get the parent category node
        var categoryNode = content.Parent;
        if (categoryNode == null || categoryNode.ContentType.Alias != "categoryPage")
        {
            viewModel.ErrorMessage = "Product page must be a child of a category page.";
            return View("ProductPage", viewModel);
        }

        // Get the categoryId from the parent
        var categoryId = categoryNode.Value<string>("categoryId");
        if (string.IsNullOrEmpty(categoryId))
        {
            viewModel.ErrorMessage = "Parent category has no categoryId configured.";
            return View("ProductPage", viewModel);
        }

        // Extract product ID/slug from the URL
        var path = Request.Path.Value ?? "";
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var productIdentifier = segments.LastOrDefault();

        if (string.IsNullOrEmpty(productIdentifier))
        {
            viewModel.ErrorMessage = "No product identifier found in URL.";
            return View("ProductPage", viewModel);
        }

        // Fetch product and category data from API
        try
        {
            // Get category details
            var category = _commerceApiClient.GetCategoryAsync(categoryId).GetAwaiter().GetResult();
            viewModel.Category = category;

            // Try to get product by ID first (since slugs may not be populated)
            var product = _commerceApiClient.GetProductAsync(productIdentifier).GetAwaiter().GetResult();

            // If not found by ID, try by slug
            if (product == null)
            {
                product = _commerceApiClient.GetProductBySlugAsync(categoryId, productIdentifier).GetAwaiter().GetResult();
            }

            if (product == null)
            {
                viewModel.ErrorMessage = $"Product '{productIdentifier}' not found.";
            }
            else
            {
                viewModel.Product = product;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product {Identifier} in category {CategoryId}", productIdentifier, categoryId);
            viewModel.ErrorMessage = "Unable to load product. Please check the Commerce Settings configuration.";
        }

        return View("ProductPage", viewModel);
    }
}
