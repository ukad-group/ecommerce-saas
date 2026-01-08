using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using System.Security.Claims;

namespace EComm.Api.Controllers;

/// <summary>
/// Public API for tenant information - accepts API key authentication
/// Used by external integrations (e.g., Umbraco) to validate connectivity
/// </summary>
[Authorize]
[ApiController]
[Route("api/v1/tenants")]
public class TenantInfoController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

    /// <summary>
    /// Gets tenant information and available markets
    /// Requires valid API key for the specified tenant
    /// </summary>
    [HttpGet("{tenantId}")]
    public ActionResult GetTenantInfo(string tenantId)
    {
        // Validate tenant exists
        var tenant = _store.GetTenant(tenantId);
        if (tenant == null)
        {
            return NotFound(new { message = "Tenant not found" });
        }

        // Validate that the API key belongs to this tenant
        var apiKeyTenantId = User.FindFirst("TenantId")?.Value;
        if (apiKeyTenantId != tenantId)
        {
            return Forbid();
        }

        // Get the specific market this API key has access to
        var apiKeyMarketId = User.FindFirst("MarketId")?.Value;
        var markets = _store.GetMarketsByTenant(tenantId)
            .Where(m => m.Status == "active" && m.Id == apiKeyMarketId)
            .Select(m => new
            {
                id = m.Id,
                name = m.Name,
                code = m.Code,
                currency = m.Currency
            })
            .ToList();

        return Ok(new
        {
            tenantId = tenant.Id,
            tenantName = tenant.DisplayName,
            markets = markets
        });
    }
}
