using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

    [HttpGet]
    public ActionResult<List<Category>> GetCategories(
        [FromQuery] string? tenantId = null,
        [FromQuery] string? marketId = null,
        [FromHeader(Name = "X-Tenant-ID")] string? headerTenantId = null,
        [FromHeader(Name = "X-Market-ID")] string? headerMarketId = null)
    {
        var categories = _store.GetCategories().AsQueryable();

        // Use header values if query params not provided
        var effectiveTenantId = tenantId ?? headerTenantId;
        var effectiveMarketId = marketId ?? headerMarketId;

        // Filter by tenant
        if (!string.IsNullOrEmpty(effectiveTenantId))
        {
            categories = categories.Where(c => c.TenantId == effectiveTenantId);
        }

        // Filter by market
        if (!string.IsNullOrEmpty(effectiveMarketId))
        {
            categories = categories.Where(c => c.MarketId == effectiveMarketId);
        }

        return Ok(categories.ToList());
    }

    [HttpGet("{id}")]
    public ActionResult<Category> GetCategory(string id)
    {
        var category = _store.GetCategory(id);
        if (category == null)
        {
            return NotFound();
        }
        return Ok(category);
    }

    [HttpPost]
    public ActionResult<Category> CreateCategory(
        [FromBody] Category category,
        [FromHeader(Name = "X-Tenant-ID")] string? headerTenantId = null,
        [FromHeader(Name = "X-Market-ID")] string? headerMarketId = null)
    {
        // Generate ID if not provided
        if (string.IsNullOrEmpty(category.Id))
        {
            category.Id = $"cat-{Guid.NewGuid().ToString().Substring(0, 8)}";
        }

        // Set tenant and market from headers if not provided in body
        if (string.IsNullOrEmpty(category.TenantId) && !string.IsNullOrEmpty(headerTenantId))
        {
            category.TenantId = headerTenantId;
        }

        if (string.IsNullOrEmpty(category.MarketId) && !string.IsNullOrEmpty(headerMarketId))
        {
            category.MarketId = headerMarketId;
        }

        // Validate required fields
        if (string.IsNullOrEmpty(category.TenantId) || string.IsNullOrEmpty(category.MarketId))
        {
            return BadRequest(new { message = "TenantId and MarketId are required" });
        }

        _store.AddCategory(category);
        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public ActionResult<Category> UpdateCategory(
        string id,
        [FromBody] Category category)
    {
        var existingCategory = _store.GetCategory(id);
        if (existingCategory == null)
        {
            return NotFound();
        }

        // Ensure ID matches
        category.Id = id;

        // Preserve original tenant/market/created date
        category.TenantId = existingCategory.TenantId;
        category.MarketId = existingCategory.MarketId;
        category.CreatedAt = existingCategory.CreatedAt;

        _store.UpdateCategory(category);
        return Ok(category);
    }

    [HttpDelete("{id}")]
    public ActionResult DeleteCategory(string id)
    {
        var category = _store.GetCategory(id);
        if (category == null)
        {
            return NotFound();
        }

        // Check if any categories have this as parent
        var childCategories = _store.GetCategories().Where(c => c.ParentId == id).ToList();
        if (childCategories.Any())
        {
            return BadRequest(new { message = "Cannot delete category with subcategories. Delete subcategories first." });
        }

        // Check if any products are in this category
        var productsInCategory = _store.GetProducts().Where(p => p.CategoryIds.Contains(id)).ToList();
        if (productsInCategory.Any())
        {
            return BadRequest(new { message = $"Cannot delete category. {productsInCategory.Count} product(s) are assigned to this category." });
        }

        _store.DeleteCategory(id);
        return NoContent();
    }
}
