using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Api.DTOs.Requests.Products;

namespace EComm.Api.Controllers;

[Authorize] // Require authentication for all product endpoints
[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

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
        // Only return current versions
        var products = _store.GetProducts().Where(p => p.IsCurrentVersion).AsQueryable();

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
        // Get current version only
        var product = _store.GetProducts().FirstOrDefault(p => p.Id == id && p.IsCurrentVersion);
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

        if (string.IsNullOrWhiteSpace(product.Name))
        {
            return BadRequest(new { message = "Name is required" });
        }

        // Simple products (no variants) must carry a price
        if (!product.HasVariants && !(product.Price > 0))
        {
            return BadRequest(new { message = "Price is required for products without variants" });
        }

        var variantError = ValidateVariants(product);
        if (variantError != null)
        {
            return BadRequest(new { message = variantError });
        }

        // Always derive currency from the market (single currency per market)
        var market = _store.GetMarket(product.MarketId);
        if (market != null)
            product.Currency = market.Currency;

        _store.AddProduct(product);
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public ActionResult<Product> UpdateProduct(
        string id,
        [FromBody] Product product,
        [FromHeader(Name = "X-User-ID")] string? userId = null)
    {
        var existingProduct = _store.GetProducts().FirstOrDefault(p => p.Id == id && p.IsCurrentVersion);
        if (existingProduct == null)
        {
            return NotFound();
        }

        // Ensure ID matches
        product.Id = id;

        var variantError = ValidateVariants(product);
        if (variantError != null)
        {
            return BadRequest(new { message = variantError });
        }

        // Preserve original tenant/market/created date and market-derived currency
        product.TenantId = existingProduct.TenantId;
        product.MarketId = existingProduct.MarketId;
        product.CreatedAt = existingProduct.CreatedAt;
        product.Currency = existingProduct.Currency; // currency is market-level, not editable per product

        // Update product with versioning
        _store.UpdateProduct(product, userId ?? "system", product.ChangeNotes);

        // Return the newly created version
        var updatedProduct = _store.GetProducts().FirstOrDefault(p => p.Id == id && p.IsCurrentVersion);
        return Ok(updatedProduct);
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

    // Reject duplicate variants: same non-empty SKU, or same option-combination.
    private static string? ValidateVariants(Product product)
    {
        if (!product.HasVariants || product.Variants == null)
            return null;

        var seenSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenCombos = new HashSet<string>();

        foreach (var variant in product.Variants)
        {
            if (!string.IsNullOrWhiteSpace(variant.Sku) && !seenSkus.Add(variant.Sku.Trim()))
            {
                return $"Duplicate variant SKU '{variant.Sku}'. Each variant must have a unique SKU.";
            }

            // Order-independent key for the option combination (e.g. "color=red|size=m")
            var combo = string.Join("|", variant.Options
                .OrderBy(o => o.Key, StringComparer.OrdinalIgnoreCase)
                .Select(o => $"{o.Key.Trim().ToLowerInvariant()}={o.Value.Trim().ToLowerInvariant()}"));
            if (!seenCombos.Add(combo))
            {
                return "Duplicate variant: two variants share the same option combination.";
            }
        }

        return null;
    }

    // Version history endpoints

    [HttpGet("{id}/versions")]
    public ActionResult<List<Product>> GetProductVersions(string id)
    {
        var versions = _store.GetProductVersions(id);
        if (versions == null || versions.Count == 0)
        {
            return NotFound();
        }
        return Ok(versions);
    }

    [HttpGet("{id}/versions/{version}")]
    public ActionResult<Product> GetProductVersion(string id, int version)
    {
        var product = _store.GetProductVersion(id, version);
        if (product == null)
        {
            return NotFound();
        }
        return Ok(product);
    }

    [HttpPost("{id}/versions/{version}/restore")]
    public ActionResult<Product> RestoreProductVersion(
        string id,
        int version,
        [FromHeader(Name = "X-User-ID")] string? userId = null)
    {
        var restoredProduct = _store.RestoreProductVersion(id, version, userId ?? "system");
        if (restoredProduct == null)
        {
            return NotFound();
        }
        return Ok(restoredProduct);
    }

    // Stock management endpoint (does not create versions)

    [HttpPatch("{id}/stock")]
    public ActionResult UpdateProductStock(
        string id,
        [FromBody] UpdateStockRequest request)
    {
        var product = _store.GetProducts().FirstOrDefault(p => p.Id == id && p.IsCurrentVersion);
        if (product == null)
        {
            return NotFound();
        }

        _store.UpdateProductStock(id, request.StockQuantity);
        return NoContent();
    }
}
