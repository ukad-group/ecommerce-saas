using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;
using EComm.Api.DTOs.Requests.Orders;

namespace EComm.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

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
                    ProductName = ci.ProductName,
                    Sku = sku,
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

        var oldStatus = order.Status;
        var newStatus = request.Status.ToLower();

        // CRITICAL: Validate stock availability before transitioning to "paid"
        // This prevents overselling when stock changes between cart creation and payment
        if (newStatus == "paid" && oldStatus != "paid")
        {
            foreach (var item in order.Items)
            {
                var product = _store.GetProducts().FirstOrDefault(p => p.Id == item.ProductId && p.IsCurrentVersion);
                if (product == null)
                {
                    return BadRequest($"Product '{item.ProductName}' not found");
                }

                int availableStock;
                string itemIdentifier;

                // Check variant stock if variant is specified
                if (!string.IsNullOrEmpty(item.VariantId))
                {
                    var variant = product.Variants?.FirstOrDefault(v => v.Id == item.VariantId);
                    if (variant == null)
                    {
                        return BadRequest($"Variant for product '{item.ProductName}' not found");
                    }
                    availableStock = variant.StockQuantity;
                    itemIdentifier = $"{item.ProductName} (SKU: {variant.Sku})";
                }
                else
                {
                    // Check product stock
                    if (!product.StockQuantity.HasValue)
                    {
                        return BadRequest($"Product '{item.ProductName}' has no stock information");
                    }
                    availableStock = product.StockQuantity.Value;
                    itemIdentifier = $"{item.ProductName} (SKU: {product.Sku})";
                }

                // Validate sufficient stock
                if (item.Quantity > availableStock)
                {
                    return BadRequest($"Insufficient stock for {itemIdentifier}. Requested: {item.Quantity}, Available: {availableStock}. Please return to cart to adjust quantities.");
                }
            }
        }

        order.Status = request.Status;

        // Generate tracking number when marked as paid
        if (newStatus == "paid" && string.IsNullOrEmpty(order.TrackingNumber))
        {
            order.TrackingNumber = $"TRACK-{order.Id.Substring(0, Math.Min(8, order.Id.Length)).ToUpper()}";
        }

        // Automatic stock adjustment based on status changes
        // Decrease stock when order is paid (inventory reserved)
        if (newStatus == "paid" && oldStatus != "paid")
        {
            foreach (var item in order.Items)
            {
                var product = _store.GetProducts().FirstOrDefault(p => p.Id == item.ProductId && p.IsCurrentVersion);
                if (product != null)
                {
                    if (!string.IsNullOrEmpty(item.VariantId))
                    {
                        // Reduce variant stock
                        _store.UpdateVariantStock(item.ProductId, item.VariantId, item.Quantity, decrease: true);
                    }
                    else if (product.StockQuantity.HasValue)
                    {
                        // Reduce product stock
                        var newStock = Math.Max(0, product.StockQuantity.Value - item.Quantity);
                        _store.UpdateProductStock(item.ProductId, newStock);
                    }
                }
            }

            // Clear the cart now that payment succeeded
            // Extract session ID from order ID if it follows the pattern
            // For showcase orders, we need to clear by session somehow
            // For now, this is handled by the showcase calling Clear after successful payment
        }

        // Increase stock back when order is cancelled (inventory released)
        // Note: Refunded items are NOT returned to stock as they may be damaged/lost
        if (newStatus == "cancelled" && oldStatus == "paid")
        {
            foreach (var item in order.Items)
            {
                var product = _store.GetProducts().FirstOrDefault(p => p.Id == item.ProductId && p.IsCurrentVersion);
                if (product != null)
                {
                    if (!string.IsNullOrEmpty(item.VariantId))
                    {
                        // Restore variant stock
                        _store.UpdateVariantStock(item.ProductId, item.VariantId, item.Quantity, decrease: false);
                    }
                    else if (product.StockQuantity.HasValue)
                    {
                        // Restore product stock
                        var newStock = product.StockQuantity.Value + item.Quantity;
                        _store.UpdateProductStock(item.ProductId, newStock);
                    }
                }
            }
        }

        _store.UpdateOrder(order);
        return Ok(order);
    }
}
