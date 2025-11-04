using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/admin/orders")]
public class AdminOrdersController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

    [HttpGet]
    public ActionResult<List<Order>> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? tenantId = null,
        [FromQuery] string? marketId = null)
    {
        var orders = _store.GetAllOrders();

        if (!string.IsNullOrEmpty(status))
        {
            orders = orders.Where(o => o.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(tenantId))
        {
            orders = orders.Where(o => o.TenantId == tenantId).ToList();
        }

        if (!string.IsNullOrEmpty(marketId))
        {
            orders = orders.Where(o => o.MarketId == marketId).ToList();
        }

        return Ok(orders.OrderByDescending(o => o.CreatedAt).ToList());
    }

    [HttpGet("{id}")]
    public ActionResult<Order> GetOrder(string id)
    {
        var order = _store.GetOrder(id);
        if (order == null)
        {
            return NotFound();
        }
        return Ok(order);
    }
}
