using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/admin/[controller]")]
public class MarketsController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

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
}
