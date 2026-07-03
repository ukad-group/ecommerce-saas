using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Api.DTOs.Requests.Orders;

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

    /// <summary>
    /// Import a historical order verbatim (e.g. data migration). Writes the supplied
    /// Id, OrderNumber, Status, totals and timestamps as-is — no cart, no number/date
    /// generation, and no stock side-effects. Returns 409 if the Id already exists
    /// (use PUT to replace).
    /// </summary>
    [HttpPost]
    public ActionResult<Order> ImportOrder([FromBody] ImportOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
        {
            return BadRequest(new { error = "Order Id is required for import" });
        }
        if (string.IsNullOrWhiteSpace(request.OrderNumber))
        {
            return BadRequest(new { error = "OrderNumber is required" });
        }

        if (_store.GetOrder(request.Id) != null)
        {
            return Conflict(new { error = $"Order '{request.Id}' already exists" });
        }

        var order = MapToOrder(request);
        _store.AddOrder(order);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, order);
    }

    /// <summary>
    /// Upsert a historical order by Id — full replace, written verbatim. Makes
    /// re-running an import idempotent.
    /// </summary>
    [HttpPut("{id}")]
    public ActionResult<Order> UpsertOrder(string id, [FromBody] ImportOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OrderNumber))
        {
            return BadRequest(new { error = "OrderNumber is required" });
        }

        request.Id = id;
        var order = MapToOrder(request);

        // Delete-then-add so the order is stored verbatim (preserves CreatedAt AND
        // UpdatedAt; DataStore.UpdateOrder would stamp UpdatedAt = UtcNow).
        if (_store.GetOrder(id) != null)
        {
            _store.DeleteOrder(id);
        }
        _store.AddOrder(order);
        return Ok(order);
    }

    private static Order MapToOrder(ImportOrderRequest r) => new()
    {
        Id = r.Id,
        TenantId = r.TenantId,
        MarketId = r.MarketId,
        OrderNumber = r.OrderNumber,
        Status = string.IsNullOrWhiteSpace(r.Status) ? "completed" : r.Status,
        Subtotal = r.Subtotal,
        Tax = r.Tax,
        ShippingCost = r.ShippingCost,
        Total = r.Total,
        Customer = r.Customer,
        ShippingAddress = r.ShippingAddress,
        BillingAddress = r.BillingAddress,
        Items = r.Items,
        TrackingNumber = r.TrackingNumber,
        CustomProperties = r.CustomProperties,
        PaymentStatus = r.PaymentStatus,
        PaymentReference = r.PaymentReference,
        CreatedAt = r.CreatedAt == default ? DateTime.UtcNow : r.CreatedAt,
        UpdatedAt = r.UpdatedAt != default ? r.UpdatedAt
                  : r.CreatedAt != default ? r.CreatedAt
                  : DateTime.UtcNow,
    };

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
