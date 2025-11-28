using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Tenant;
using EComm.Api.DTOs.Requests.Markets;

namespace EComm.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin/[controller]")]
public class MarketsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

    [HttpGet]
    public ActionResult GetMarkets(
        [FromQuery] string? tenantId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10)
    {
        var markets = string.IsNullOrEmpty(tenantId)
            ? _store.GetMarkets()
            : _store.GetMarketsByTenant(tenantId);

        // Apply filters
        if (!string.IsNullOrEmpty(search))
        {
            markets = markets.Where(m =>
                m.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                m.Code.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(status))
        {
            markets = markets.Where(m => m.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(type))
        {
            markets = markets.Where(m => m.Type.Equals(type, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        // Pagination
        var total = markets.Count;
        var paginatedMarkets = markets
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Ok(new
        {
            data = paginatedMarkets,
            total = total,
            page = page,
            limit = limit
        });
    }

    [HttpGet("{id}")]
    public ActionResult<Market> GetMarket(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }
        return Ok(market);
    }

    [HttpPut("{id}")]
    public ActionResult<Market> UpdateMarket(string id, [FromBody] UpdateMarketRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        // Update market properties
        if (!string.IsNullOrEmpty(request.Name))
        {
            market.Name = request.Name;
        }

        if (!string.IsNullOrEmpty(request.Code))
        {
            market.Code = request.Code;
        }

        if (!string.IsNullOrEmpty(request.Type))
        {
            market.Type = request.Type;
        }

        if (!string.IsNullOrEmpty(request.Currency))
        {
            market.Currency = request.Currency;
        }

        if (!string.IsNullOrEmpty(request.Timezone))
        {
            market.Timezone = request.Timezone;
        }

        market.UpdatedAt = DateTime.UtcNow;

        _store.UpdateMarket(market);

        return Ok(market);
    }

    [HttpDelete("{id}")]
    public IActionResult DeactivateMarket(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        market.Status = "inactive";
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public ActionResult<Market> ReactivateMarket(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        market.Status = "active";
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(market);
    }

    [HttpGet("{id}/property-templates")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetPropertyTemplates(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        var templates = market.Settings?.CustomPropertyTemplates ?? new List<CustomPropertyTemplate>();
        return Ok(new { templates });
    }

    [HttpPut("{id}/property-templates")]
    public ActionResult UpdatePropertyTemplates(string id, [FromBody] UpdatePropertyTemplatesRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        // Initialize Settings if null
        market.Settings ??= new MarketSettings();

        // Update property templates
        market.Settings.CustomPropertyTemplates = request.Templates;
        market.UpdatedAt = DateTime.UtcNow;

        _store.UpdateMarket(market);

        return Ok(new { templates = market.Settings.CustomPropertyTemplates });
    }
}
