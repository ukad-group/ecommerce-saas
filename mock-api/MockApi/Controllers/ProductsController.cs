using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

    [HttpGet]
    public ActionResult<List<Product>> GetProducts(
        [FromQuery] string? categoryId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? tenantId = null,
        [FromQuery] string? marketId = null,
        [FromHeader(Name = "X-Tenant-ID")] string? headerTenantId = null,
        [FromHeader(Name = "X-Market-ID")] string? headerMarketId = null)
    {
        var products = _store.GetProducts().AsQueryable();

        // Use header values if query params not provided
        var effectiveTenantId = tenantId ?? headerTenantId;
        var effectiveMarketId = marketId ?? headerMarketId;

        // Filter by tenant
        if (!string.IsNullOrEmpty(effectiveTenantId))
        {
            products = products.Where(p => p.TenantId == effectiveTenantId);
        }

        // Filter by market
        if (!string.IsNullOrEmpty(effectiveMarketId))
        {
            products = products.Where(p => p.MarketId == effectiveMarketId);
        }

        // Filter by category
        if (!string.IsNullOrEmpty(categoryId))
        {
            products = products.Where(p => p.CategoryId == categoryId);
        }

        // Search by name
        if (!string.IsNullOrEmpty(search))
        {
            products = products.Where(p =>
                p.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (p.Description != null && p.Description.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        var result = products.OrderBy(p => p.Name).ToList();

        return Ok(result);
    }

    [HttpGet("{id}")]
    public ActionResult<Product> GetProduct(string id)
    {
        var product = _store.GetProduct(id);
        if (product == null)
        {
            return NotFound();
        }
        return Ok(product);
    }
}
