using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ECommShowcase.Web.Models;
using ECommShowcase.Web.Models.Configuration;
using ECommShowcase.Web.Models.ViewModels;
using ECommShowcase.Web.Services;

namespace ECommShowcase.Web.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly IECommApiClient _apiClient;
    private readonly ShowcaseSettings _settings;

    public HomeController(
        ILogger<HomeController> logger,
        IECommApiClient apiClient,
        IOptions<ShowcaseSettings> settings)
    {
        _logger = logger;
        _apiClient = apiClient;
        _settings = settings.Value;
    }

    public async Task<IActionResult> Index()
    {
        try
        {
            // Fetch featured products (first page) - only active products
            var productsResponse = await _apiClient.GetProductsAsync(
                status: "active",
                page: 1,
                pageSize: _settings.FeaturedProductCount);

            // Fetch categories for navigation
            var categories = await _apiClient.GetCategoriesAsync();

            var viewModel = new HomeViewModel
            {
                FeaturedProducts = productsResponse.Data,
                Categories = categories,
                StoreName = _settings.StoreName,
                CurrencySymbol = _settings.CurrencySymbol
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading home page");
            return View(new HomeViewModel
            {
                StoreName = _settings.StoreName,
                CurrencySymbol = _settings.CurrencySymbol
            });
        }
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
