using EComm.Umbraco.Commerce.Models;
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

        // Check if this is a product detail request (set by ProductContentFinder)
        var isProductPage = HttpContext.Items.ContainsKey("IsProductPage") && 
                           (bool)HttpContext.Items["IsProductPage"]!;

        if (isProductPage)
        {
            // Render product detail page instead of category listing
            return RenderProductDetail(content);
        }

        // Get the categoryId from the current page property
        var categoryId = content.Value<string>("categoryId");

        // Create the view model
        var viewModel = new CategoryPageViewModel(content, _publishedValueFallback)
        {
            CategoryId = categoryId
        };

        try
        {
            // Fetch category tree from site root for navigation
            var root = content.Root();

            // Get all root-level CategoryPage nodes
            var rootCategoryPages = root.Children
                .Where(x => x.ContentType.Alias == "categoryPage")
                .ToList();

            viewModel.RootCategoryPages = rootCategoryPages;

            // Keep the old CategoryPages for backwards compatibility (siblings)
            var parent = content.Parent;
            if (parent != null)
            {
                viewModel.CategoryPages = parent.Children
                    .Where(x => x.ContentType.Alias == "categoryPage")
                    .ToList();
            }
            else
            {
                viewModel.CategoryPages = rootCategoryPages;
            }

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

    /// <summary>
    /// Renders product detail page when ProductContentFinder routes a product URL to this controller
    /// </summary>
    private IActionResult RenderProductDetail(IPublishedContent content)
    {
        // Get product data from HttpContext (set by ProductContentFinder)
        var productSlug = HttpContext.Items["ProductSlug"] as string;
        var productData = HttpContext.Items["ProductData"];

        // Create product view model
        var viewModel = new ProductPageViewModel(content, _publishedValueFallback);

        // Get the categoryId from the current page property
        var categoryId = content.Value<string>("categoryId");

        try
        {
            // Product data already fetched by content finder
            if (productData is Product productFromFinder)
            {
                viewModel.Product = productFromFinder;
                
                // Get category details
                if (!string.IsNullOrEmpty(categoryId))
                {
                    var category = _commerceApiClient.GetCategoryAsync(categoryId).GetAwaiter().GetResult();
                    viewModel.Category = category;
                }
                
                // Build breadcrumb trail
                viewModel.CategoryBreadcrumbs = BuildCategoryBreadcrumbs(content);
            }
            else
            {
                // Fallback: fetch product if not in context (shouldn't happen)
                var productIdentifier = productSlug ?? Request.Path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries).LastOrDefault();
                
                if (!string.IsNullOrEmpty(productIdentifier) && !string.IsNullOrEmpty(categoryId))
                {
                    var product = _commerceApiClient.GetProductAsync(productIdentifier).GetAwaiter().GetResult();
                    if (product == null)
                    {
                        product = _commerceApiClient.GetProductBySlugAsync(categoryId, productIdentifier).GetAwaiter().GetResult();
                    }

                    if (product != null)
                    {
                        viewModel.Product = product;
                        var category = _commerceApiClient.GetCategoryAsync(categoryId).GetAwaiter().GetResult();
                        viewModel.Category = category;
                        viewModel.CategoryBreadcrumbs = BuildCategoryBreadcrumbs(content);
                    }
                    else
                    {
                        viewModel.ErrorMessage = $"Product '{productIdentifier}' not found.";
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product {Slug} in category {CategoryId}", productSlug, categoryId);
            viewModel.ErrorMessage = "Unable to load product. Please check the Commerce Settings configuration.";
        }

        return View("ProductPage", viewModel);
    }

    /// <summary>
    /// Builds breadcrumb trail by walking up the content tree
    /// </summary>
    private List<CategoryBreadcrumb> BuildCategoryBreadcrumbs(IPublishedContent categoryNode)
    {
        var breadcrumbs = new List<CategoryBreadcrumb>();
        var current = categoryNode;

        while (current != null && current.ContentType.Alias == "categoryPage")
        {
            var categoryId = current.Value<string>("categoryId");
            breadcrumbs.Insert(0, new CategoryBreadcrumb
            {
                Name = current.Name,
                Url = current.Url(),
                Id = categoryId
            });

            current = current.Parent;
        }

        return breadcrumbs;
    }
}
