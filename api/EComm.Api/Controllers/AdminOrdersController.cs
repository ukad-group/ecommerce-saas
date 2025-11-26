using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Api.Data;
using EComm.Api.Models;

namespace EComm.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin/orders")]
public class AdminOrdersController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

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

    [HttpPut("{id}/status")]
    public ActionResult<Order> UpdateOrderStatus(string id, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = _store.GetOrder(id);
        if (order == null)
        {
            return NotFound();
        }

        // Update the order status
        order.Status = request.Status;
        order.UpdatedAt = DateTime.UtcNow;

        // Update the order in the store
        _store.UpdateOrder(order);

        return Ok(order);
    }
}
