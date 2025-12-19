using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;

namespace EComm.Commerce.Demo.Controllers;

/// <summary>
/// Controller for categoryPage document type
/// Fetches products from the eCommerce API and displays them
/// </summary>
public class CategoryPageController : RenderController
{
    private readonly ICommerceApiClient _commerceApiClient;
    private readonly ILogger<CategoryPageController> _logger;
    private readonly IPublishedValueFallback _publishedValueFallback;

    public CategoryPageController(
        ILogger<CategoryPageController> logger,
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
        // Get the current page content
        var content = CurrentPage;
        if (content == null)
        {
            return NotFound();
        }

        // Check query string first, then fall back to the categoryId property
        var categoryId = Request.Query["categoryId"].ToString();
        if (string.IsNullOrEmpty(categoryId))
        {
            categoryId = content.Value<string>("categoryId");
        }

        // Create the view model
        var viewModel = new CategoryPageViewModel(content, _publishedValueFallback)
        {
            CategoryId = categoryId
        };

        try
        {
            // Fetch all categories for navigation
            var categories = _commerceApiClient.GetCategoriesAsync().GetAwaiter().GetResult();
            viewModel.Categories = categories ?? new List<EComm.Umbraco.Commerce.Models.Category>();

            // If categoryId is set, fetch products for that category
            if (!string.IsNullOrEmpty(categoryId))
            {
                // Get category details (synchronous call)
                var category = _commerceApiClient.GetCategoryAsync(categoryId).GetAwaiter().GetResult();
                viewModel.CategoryName = category?.Name;

                // Get products for this category (first page, 100 items)
                var productsResult = _commerceApiClient.GetProductsAsync(categoryId, page: 1, pageSize: 100).GetAwaiter().GetResult();
                viewModel.Products = productsResult.Products;
                viewModel.TotalProducts = productsResult.TotalCount;
            }
            else
            {
                // No category selected - show all products
                viewModel.CategoryName = "All Products";

                // Get all products (first page, 100 items)
                var productsResult = _commerceApiClient.GetAllProductsAsync(page: 1, pageSize: 100).GetAwaiter().GetResult();
                viewModel.Products = productsResult.Products;
                viewModel.TotalProducts = productsResult.TotalCount;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching products for category {CategoryId}", categoryId ?? "all");
            viewModel.ErrorMessage = "Unable to load products. Please check the Commerce Settings configuration.";
        }

        return View("CategoryPage", viewModel);
    }
}
