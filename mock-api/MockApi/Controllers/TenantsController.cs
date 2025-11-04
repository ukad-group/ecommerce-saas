using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/admin/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

    [HttpGet]
    public ActionResult<TenantsResponse> GetTenants(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10)
    {
        var tenants = _store.GetTenants().AsQueryable();

        // Filter by search term
        if (!string.IsNullOrEmpty(search))
        {
            tenants = tenants.Where(t =>
                t.DisplayName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                t.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                t.ContactEmail.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        // Filter by status
        if (!string.IsNullOrEmpty(status) && status != "all")
        {
            tenants = tenants.Where(t => t.Status == status);
        }

        var total = tenants.Count();
        var pagedTenants = tenants
            .OrderBy(t => t.DisplayName)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Ok(new TenantsResponse
        {
            Data = pagedTenants,
            Total = total,
            Page = page,
            Limit = limit
        });
    }

    [HttpGet("{id}")]
    public ActionResult<Tenant> GetTenant(string id)
    {
        var tenant = _store.GetTenant(id);
        if (tenant == null)
        {
            return NotFound();
        }
        return Ok(tenant);
    }
}
