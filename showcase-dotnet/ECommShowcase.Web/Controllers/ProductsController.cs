using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ECommShowcase.Web.Models.Configuration;
using ECommShowcase.Web.Models.ViewModels;
using ECommShowcase.Web.Services;

namespace ECommShowcase.Web.Controllers;

public class ProductsController : Controller
{
    private readonly ILogger<ProductsController> _logger;
    private readonly IECommApiClient _apiClient;
    private readonly ShowcaseSettings _settings;

    public ProductsController(
        ILogger<ProductsController> logger,
        IECommApiClient apiClient,
        IOptions<ShowcaseSettings> settings)
    {
        _logger = logger;
        _apiClient = apiClient;
        _settings = settings.Value;
    }

    // GET: /Products
    public async Task<IActionResult> Index(string? categoryId, string? search, int page = 1)
    {
        try
        {
            var productsResponse = await _apiClient.GetProductsAsync(
                categoryId: categoryId,
                search: search,
                page: page,
                pageSize: _settings.ProductsPerPage);

            var categories = await _apiClient.GetCategoriesAsync();

            var viewModel = new ProductListViewModel
            {
                Products = productsResponse.Data,
                Categories = categories,
                SelectedCategoryId = categoryId,
                SearchQuery = search,
                CurrentPage = page,
                TotalPages = (int)Math.Ceiling((double)productsResponse.Total / _settings.ProductsPerPage),
                TotalProducts = productsResponse.Total,
                CurrencySymbol = _settings.CurrencySymbol
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading products");
            return View(new ProductListViewModel
            {
                CurrencySymbol = _settings.CurrencySymbol
            });
        }
    }

    // GET: /Products/Details/5
    public async Task<IActionResult> Details(string id)
    {
        try
        {
            var product = await _apiClient.GetProductByIdAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            var category = await _apiClient.GetCategoryByIdAsync(product.CategoryId);

            var viewModel = new ProductDetailViewModel
            {
                Product = product,
                Category = category,
                CurrencySymbol = _settings.CurrencySymbol
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading product {ProductId}", id);
            return NotFound();
        }
    }

    // GET: /Products/Search
    public async Task<IActionResult> Search(string q, int page = 1)
    {
        return await Index(categoryId: null, search: q, page: page);
    }
}
