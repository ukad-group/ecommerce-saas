using EComm.Data;
using EComm.Data.Entities;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Api.Controllers;

[ApiController]
[Route("api/v1/discounts")]
public class DiscountsController : ControllerBase
{
    private readonly DataStore _store;

    public DiscountsController(DataStore store)
    {
        _store = store;
    }

    [HttpGet]
    public IActionResult GetDiscounts()
    {
        var tenantId = Request.Headers["X-Tenant-ID"].FirstOrDefault() ?? string.Empty;
        var marketId = Request.Headers["X-Market-ID"].FirstOrDefault() ?? string.Empty;
        return Ok(_store.GetDiscounts(tenantId, marketId));
    }

    [HttpGet("{id}")]
    public IActionResult GetDiscount(string id)
    {
        var discount = _store.GetDiscount(id);
        return discount == null ? NotFound() : Ok(discount);
    }

    [HttpPost]
    public IActionResult CreateDiscount([FromBody] Discount discount)
    {
        discount.TenantId = Request.Headers["X-Tenant-ID"].FirstOrDefault() ?? string.Empty;
        discount.MarketId = Request.Headers["X-Market-ID"].FirstOrDefault() ?? string.Empty;
        var created = _store.AddDiscount(discount);
        return StatusCode(201, created);
    }

    [HttpPut("{id}")]
    public IActionResult UpdateDiscount(string id, [FromBody] Discount discount)
    {
        discount.Id = id;
        var updated = _store.UpdateDiscount(discount);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteDiscount(string id)
    {
        return _store.DeleteDiscount(id) ? NoContent() : NotFound();
    }
}
