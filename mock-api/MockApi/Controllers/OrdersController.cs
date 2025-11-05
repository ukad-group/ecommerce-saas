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
    public ActionResult<Order> CreateOrder(
        [FromBody] CreateOrderRequest request,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        var cart = _store.GetOrCreateCart(request.SessionId, tenantId ?? "tenant-a", marketId ?? "market-1");
        if (cart.Items.Count == 0)
        {
            return BadRequest("Cart is empty");
        }

        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = cart.TenantId,
            MarketId = cart.MarketId,
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            Status = "pending",
            Customer = request.Customer,
            ShippingAddress = request.ShippingAddress,
            BillingAddress = request.BillingAddress,
            Items = cart.Items.Select(ci =>
            {
                var product = _store.GetProducts().FirstOrDefault(p => p.Id == ci.ProductId);
                return new OrderItem
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductId = ci.ProductId,
                    ProductName = ci.ProductName,
                    Sku = product?.Sku ?? "",
                    ProductImageUrl = ci.ProductImageUrl,
                    UnitPrice = ci.UnitPrice,
                    Quantity = ci.Quantity,
                    Subtotal = ci.Subtotal,
                    Currency = "USD"
                };
            }).ToList(),
            Subtotal = cart.Subtotal,
            Tax = cart.Tax,
            ShippingCost = 0m, // Free shipping
            Total = cart.Total,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _store.AddOrder(order);

        // Clear both cart and the "new" status cart-order
        var cartOrderId = $"cart-{request.SessionId}";
        var cartOrder = _store.GetOrder(cartOrderId);
        if (cartOrder != null && cartOrder.Status == "new")
        {
            _store.DeleteOrder(cartOrderId);
        }
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
