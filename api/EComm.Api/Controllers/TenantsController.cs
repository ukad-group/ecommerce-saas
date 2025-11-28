using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Api.DTOs.Requests.Tenants;
using EComm.Api.DTOs.Responses.Tenants;

namespace EComm.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

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

    [HttpPut("{id}")]
    public ActionResult<Tenant> UpdateTenant(string id, [FromBody] UpdateTenantRequest request)
    {
        var tenant = _store.GetTenant(id);
        if (tenant == null)
        {
            return NotFound();
        }

        // Update tenant properties
        if (!string.IsNullOrEmpty(request.DisplayName))
        {
            tenant.DisplayName = request.DisplayName;
        }

        if (!string.IsNullOrEmpty(request.ContactEmail))
        {
            tenant.ContactEmail = request.ContactEmail;
        }

        if (request.ContactPhone != null)
        {
            tenant.ContactPhone = request.ContactPhone;
        }

        tenant.UpdatedAt = DateTime.UtcNow;

        _store.UpdateTenant(tenant);

        return Ok(tenant);
    }

    [HttpDelete("{id}")]
    public IActionResult DeactivateTenant(string id)
    {
        var tenant = _store.GetTenant(id);
        if (tenant == null)
        {
            return NotFound();
        }

        tenant.Status = "inactive";
        tenant.UpdatedAt = DateTime.UtcNow;
        _store.UpdateTenant(tenant);

        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public ActionResult<Tenant> ReactivateTenant(string id)
    {
        var tenant = _store.GetTenant(id);
        if (tenant == null)
        {
            return NotFound();
        }

        tenant.Status = "active";
        tenant.UpdatedAt = DateTime.UtcNow;
        _store.UpdateTenant(tenant);

        return Ok(tenant);
    }
}
