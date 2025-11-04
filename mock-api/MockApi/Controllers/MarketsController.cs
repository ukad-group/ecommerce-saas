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
    public ActionResult<List<Market>> GetMarkets([FromQuery] string? tenantId = null)
    {
        if (!string.IsNullOrEmpty(tenantId))
        {
            return Ok(_store.GetMarketsByTenant(tenantId));
        }
        return Ok(_store.GetMarkets());
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
