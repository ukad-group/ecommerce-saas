using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.Controllers;

/// <summary>
/// Public, market-scoped read access to the store-global option presets
/// library so storefronts can resolve a product's option-block references.
/// </summary>
[ApiController]
[Route("api/v1/option-presets")]
public class OptionPresetsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

    [HttpGet]
    public ActionResult GetOptionPresets(
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        var market = _store.GetMarket(marketId ?? "market-1");
        var presets = (market?.Settings?.OptionPresets ?? new List<OptionPreset>())
            .Where(p => p.Status == "active")
            .ToList();
        return Ok(new { presets });
    }
}
