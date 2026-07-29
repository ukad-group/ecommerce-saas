using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Tenant;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Api.Services;

namespace EComm.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

    [Authorize]
    [HttpGet]
    public ActionResult GetOrders(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _store.GetAllOrders().AsEnumerable();

        if (!string.IsNullOrEmpty(tenantId))
            query = query.Where(o => o.TenantId == tenantId);

        if (!string.IsNullOrEmpty(marketId))
            query = query.Where(o => o.MarketId == marketId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status.Equals(status, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrEmpty(search))
        {
            var q = search.ToLower();
            query = query.Where(o =>
                (o.OrderNumber?.ToLower().Contains(q) ?? false) ||
                (o.Customer?.FullName?.ToLower().Contains(q) ?? false) ||
                (o.Customer?.Email?.ToLower().Contains(q) ?? false));
        }

        var sorted = query.OrderByDescending(o => o.CreatedAt).ToList();
        var totalCount = sorted.Count;
        var orders = sorted.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new { orders, totalCount, page, pageSize });
    }

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

        var market = _store.GetMarket(cart.MarketId);
        var orderCurrency = market?.Currency ?? "USD";
        var shippingMethods = market?.Settings?.ShippingMethods ?? new List<ShippingMethod>();
        var shippingMethod = !string.IsNullOrEmpty(request.ShippingMethodId)
            ? shippingMethods.FirstOrDefault(m => m.Id == request.ShippingMethodId)
            : shippingMethods.FirstOrDefault();
        var shippingCost = shippingMethod?.Price ?? 0m;

        // Re-resolve goods tax here rather than inheriting cart.Tax: the cart had no address, so a
        // tax class with per-country rates could only offer its default until now.
        var goodsTaxRate = market?.Settings?.ResolveGoodsTaxRate(request.ShippingAddress.Country) ?? 0m;
        var tax = Math.Round(cart.Subtotal * goodsTaxRate, 2, MidpointRounding.AwayFromZero);

        PaymentSurcharge? surcharge = null;
        if (!string.IsNullOrEmpty(market?.Settings?.PaymentProvider))
            market.Settings.PaymentSurcharges?.TryGetValue(market.Settings.PaymentProvider, out surcharge);
        var paymentFee = surcharge?.Amount ?? 0m;
        var paymentFeeTaxRate = paymentFee > 0
            ? TaxClass.ResolveRate(market?.Settings?.TaxClasses, surcharge?.TaxClassId, request.ShippingAddress.Country)
            : 0m;
        var paymentFeeTax = Math.Round(paymentFee * paymentFeeTaxRate, 2, MidpointRounding.AwayFromZero);

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
                var product = _store.GetProducts().FirstOrDefault(p => p.Id == ci.ProductId && p.IsCurrentVersion);
                string sku = "";
                if (!string.IsNullOrEmpty(ci.VariantId))
                {
                    var variant = product?.Variants?.FirstOrDefault(v => v.Id == ci.VariantId);
                    sku = variant?.Sku ?? "";
                }
                else
                {
                    sku = product?.Sku ?? "";
                }

                return new OrderItem
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductId = ci.ProductId,
                    VariantId = ci.VariantId,  // CRITICAL: Include VariantId
                    ItemType = ci.ItemType,
                    ItemSubType = ci.ItemSubType,
                    ProductName = ci.ProductName,
                    Sku = sku,
                    ProductImageUrl = ci.ProductImageUrl,
                    UnitPrice = ci.UnitPrice,
                    Quantity = ci.Quantity,
                    Subtotal = ci.Subtotal,
                    Currency = orderCurrency
                };
            }).ToList(),
            Subtotal = cart.Subtotal,
            Tax = tax,
            ShippingCost = shippingCost,
            PaymentFee = paymentFee,
            PaymentFeeTax = paymentFeeTax,
            Total = cart.Subtotal + tax + shippingCost + paymentFee + paymentFeeTax,
            CustomProperties = request.CustomProperties,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _store.AddOrder(order);

        // DON'T clear cart here - payment might fail due to stock validation
        // Cart will be cleared when order is successfully paid
        // Delete the "new" status cart-order though (it's been replaced by this pending order)
        var cartOrderId = $"cart-{request.SessionId}";
        var cartOrder = _store.GetOrder(cartOrderId);
        if (cartOrder != null && cartOrder.Status == "new")
        {
            _store.DeleteOrder(cartOrderId);
        }

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

        // Stock validation, tracking number and stock reserve/release all live in OrderStatusService
        // so the payment webhook gets exactly the same behaviour.
        var error = OrderStatusService.ApplyStatus(order, request.Status, _store.GetMarket(order.MarketId));
        if (error != null)
        {
            return BadRequest(error);
        }

        _store.UpdateOrder(order);
        return Ok(order);
    }
}
