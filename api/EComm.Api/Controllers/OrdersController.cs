using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Tenant;
using EComm.Api.DTOs.Requests.Orders;
using EComm.Api.Services;
using EComm.Payment;

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
        [FromQuery] int pageSize = 20,
        [FromQuery] OrderFilterRequest? filter = null)
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

        // The advanced filter (customer / order / order-line criteria) narrows before paging, so it
        // applies to the whole result set rather than whichever page the caller happens to be on.
        if (filter != null)
        {
            query = filter.Apply(query);
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

        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = cart.TenantId,
            MarketId = cart.MarketId,
            OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };
        ApplyCartAndPricing(order, request, cart, _store.GetMarket(cart.MarketId));

        _store.AddOrder(order);

        // DON'T clear cart here - payment might fail due to stock validation
        // Cart will be cleared when order is successfully paid
        return Ok(order);
    }

    /// <summary>
    /// Rebuilds an existing unpaid order from the session's current cart plus fresh customer/address/
    /// custom-property data, keeping its Id, OrderNumber and CreatedAt. Exists so a storefront that
    /// re-submits checkout (customer backed out at the payment provider) updates the order it already
    /// created instead of minting a second one.
    /// </summary>
    [Authorize]
    [HttpPut("{id}")]
    public ActionResult<Order> UpdateOrder(string id, [FromBody] CreateOrderRequest request)
    {
        var order = _store.GetOrder(id);
        if (order == null)
        {
            return NotFound();
        }

        var market = _store.GetMarket(order.MarketId);

        // Never rewrite a settled order's totals — that would corrupt a real sale. Money already
        // moved counts as settled too, even if the status hasn't caught up yet.
        var paymentSettled = PaymentStates.Parse(order.PaymentStatus) is PaymentState.Authorized or PaymentState.Captured;
        if (paymentSettled || OrderStatusService.IsSettled(order.Status, market?.Settings?.OrderStatusAfterPayment))
        {
            return Conflict($"Order '{id}' is no longer updatable (status '{order.Status}', payment '{order.PaymentStatus ?? "none"}')");
        }

        // Scope the cart to the ORDER's tenant/market, not the request headers, so an update can never
        // move an order between markets.
        var cart = _store.GetOrCreateCart(request.SessionId, order.TenantId, order.MarketId);
        if (cart.Items.Count == 0)
        {
            return BadRequest("Cart is empty");
        }

        // Deliberately not routed through OrderStatusService.ApplyStatus: that reserves/releases stock
        // on settle transitions, and an update is not a status change. Status, PaymentStatus,
        // PaymentReference and TrackingNumber are left exactly as they were.
        ApplyCartAndPricing(order, request, cart, market);
        _store.UpdateOrder(order); // stamps UpdatedAt

        return Ok(order);
    }

    /// <summary>
    /// Writes the cart's lines and the market's pricing (goods tax from the shipping country,
    /// shipping, payment surcharge + its tax, total) onto an order, along with the caller's customer
    /// details. Shared by POST and PUT so a re-submitted checkout re-prices exactly like a first one.
    /// Never touches Id / OrderNumber / Status / CreatedAt / Payment* / TrackingNumber.
    /// </summary>
    private void ApplyCartAndPricing(Order order, CreateOrderRequest request, Cart cart, Market? market)
    {
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

        order.Customer = request.Customer;
        order.ShippingAddress = request.ShippingAddress;
        order.BillingAddress = request.BillingAddress;
        order.Items = cart.Items.Select(ci =>
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
        }).ToList();
        order.Subtotal = cart.Subtotal;
        order.Tax = tax;
        order.ShippingCost = shippingCost;
        order.PaymentFee = paymentFee;
        order.PaymentFeeTax = paymentFeeTax;
        order.Total = cart.Subtotal + tax + shippingCost + paymentFee + paymentFeeTax;
        order.CustomProperties = request.CustomProperties;
        order.UpdatedAt = DateTime.UtcNow;
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
