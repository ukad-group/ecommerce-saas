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
        [FromQuery] string? status = null,
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

        // Filter by status - default to "active" only if not specified
        if (!string.IsNullOrEmpty(status))
        {
            // If status is explicitly provided, use it (can be "all" to get all statuses)
            if (!status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                products = products.Where(p => p.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
            }
        }
        else
        {
            // Default behavior: return only active products
            products = products.Where(p => p.Status.Equals("active", StringComparison.OrdinalIgnoreCase));
        }

        // Filter by category (check if product is in this category or any of its subcategories)
        if (!string.IsNullOrEmpty(categoryId))
        {
            var categoryIdsToInclude = _store.GetCategoryWithDescendants(categoryId);
            products = products.Where(p => p.CategoryIds.Any(cid => categoryIdsToInclude.Contains(cid)));
        }

        // Search by name or SKU
        if (!string.IsNullOrEmpty(search))
        {
            products = products.Where(p =>
                p.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (p.Sku != null && p.Sku.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
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

    [HttpPost]
    public ActionResult<Product> CreateProduct(
        [FromBody] Product product,
        [FromHeader(Name = "X-Tenant-ID")] string? headerTenantId = null,
        [FromHeader(Name = "X-Market-ID")] string? headerMarketId = null)
    {
        // Generate ID if not provided
        if (string.IsNullOrEmpty(product.Id))
        {
            product.Id = $"prod-{Guid.NewGuid().ToString().Substring(0, 8)}";
        }

        // Set tenant and market from headers if not provided in body
        if (string.IsNullOrEmpty(product.TenantId) && !string.IsNullOrEmpty(headerTenantId))
        {
            product.TenantId = headerTenantId;
        }

        if (string.IsNullOrEmpty(product.MarketId) && !string.IsNullOrEmpty(headerMarketId))
        {
            product.MarketId = headerMarketId;
        }

        // Validate required fields
        if (string.IsNullOrEmpty(product.TenantId) || string.IsNullOrEmpty(product.MarketId))
        {
            return BadRequest(new { message = "TenantId and MarketId are required" });
        }

        _store.AddProduct(product);
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public ActionResult<Product> UpdateProduct(
        string id,
        [FromBody] Product product)
    {
        var existingProduct = _store.GetProduct(id);
        if (existingProduct == null)
        {
            return NotFound();
        }

        // Ensure ID matches
        product.Id = id;

        // Preserve original tenant/market/created date
        product.TenantId = existingProduct.TenantId;
        product.MarketId = existingProduct.MarketId;
        product.CreatedAt = existingProduct.CreatedAt;

        _store.UpdateProduct(product);
        return Ok(product);
    }

    [HttpDelete("{id}")]
    public ActionResult DeleteProduct(string id)
    {
        var product = _store.GetProduct(id);
        if (product == null)
        {
            return NotFound();
        }

        _store.DeleteProduct(id);
        return NoContent();
    }
}
