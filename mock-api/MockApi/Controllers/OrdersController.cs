using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

    [HttpPost]
    public ActionResult<Order> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var cart = _store.GetOrCreateCart(request.SessionId);
        if (cart.Items.Count == 0)
        {
            return BadRequest("Cart is empty");
        }

        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = "demo-tenant",
            MarketId = "market-1",
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            Status = "pending",
            Customer = request.Customer,
            ShippingAddress = request.ShippingAddress,
            BillingAddress = request.BillingAddress,
            Items = cart.Items.Select(ci => new OrderItem
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = ci.ProductId,
                ProductName = ci.ProductName,
                ProductImageUrl = ci.ProductImageUrl,
                UnitPrice = ci.UnitPrice,
                Quantity = ci.Quantity,
                Subtotal = ci.Subtotal
            }).ToList(),
            Subtotal = cart.Subtotal,
            Tax = cart.Tax,
            ShippingCost = 0m, // Free shipping
            Total = cart.Total,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _store.AddOrder(order);
        _store.ClearCart(request.SessionId);

        return Ok(order);
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
    public ActionResult<Order> UpdateOrderStatus(
        string id,
        [FromBody] UpdateOrderStatusRequest request)
    {
        var order = _store.GetOrder(id);
        if (order == null)
        {
            return NotFound();
        }

        order.Status = request.Status;

        // Generate tracking number when marked as paid
        if (request.Status.ToLower() == "paid" && string.IsNullOrEmpty(order.TrackingNumber))
        {
            order.TrackingNumber = $"TRACK-{order.Id.Substring(0, Math.Min(8, order.Id.Length)).ToUpper()}";
        }

        _store.UpdateOrder(order);
        return Ok(order);
    }
}
