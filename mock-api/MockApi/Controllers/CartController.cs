using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CartController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;

    [HttpGet]
    public ActionResult<Cart> GetCart(
        [FromHeader(Name = "X-Session-ID")] string? sessionId,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var cart = _store.GetOrCreateCart(sessionId, tenantId ?? "tenant-a", marketId ?? "market-1");

        // Populate AvailableStock for each cart item for client-side validation
        foreach (var item in cart.Items)
        {
            var product = _store.GetProduct(item.ProductId);
            if (product != null)
            {
                if (!string.IsNullOrEmpty(item.VariantId))
                {
                    var variant = product.Variants?.FirstOrDefault(v => v.Id == item.VariantId);
                    item.AvailableStock = variant?.StockQuantity;
                }
                else
                {
                    item.AvailableStock = product.StockQuantity;
                }
            }
        }

        return Ok(cart);
    }

    [HttpPost("items")]
    public ActionResult<CartItem> AddCartItem(
        [FromHeader(Name = "X-Session-ID")] string? sessionId,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId,
        [FromBody] AddCartItemRequest request)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var product = _store.GetProduct(request.ProductId);
        if (product == null)
        {
            return NotFound("Product not found");
        }

        var cart = _store.GetOrCreateCart(sessionId, tenantId ?? "tenant-a", marketId ?? "market-1");

        // Check if item already exists (match by both productId and variantId)
        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == request.ProductId &&
            i.VariantId == request.VariantId);

        // Calculate the requested total quantity (existing + new)
        int requestedTotalQuantity = request.Quantity + (existingItem?.Quantity ?? 0);

        // Validate stock availability
        int availableStock;
        string itemIdentifier;

        if (!string.IsNullOrEmpty(request.VariantId))
        {
            var variant = product.Variants?.FirstOrDefault(v => v.Id == request.VariantId);
            if (variant == null)
            {
                return NotFound("Variant not found");
            }
            availableStock = variant.StockQuantity;
            itemIdentifier = product.Name;
        }
        else
        {
            if (!product.StockQuantity.HasValue)
            {
                return BadRequest($"Product '{product.Name}' has no stock information");
            }
            availableStock = product.StockQuantity.Value;
            itemIdentifier = product.Name;
        }

        // Check if requested quantity exceeds available stock
        if (requestedTotalQuantity > availableStock)
        {
            return BadRequest($"Insufficient stock for '{itemIdentifier}'. Requested: {requestedTotalQuantity}, Available: {availableStock}");
        }

        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
            existingItem.Subtotal = existingItem.Quantity * existingItem.UnitPrice;
            existingItem.AvailableStock = availableStock;
        }
        else
        {
            decimal effectivePrice;
            string productName = product.Name;

            // If variant is specified, get price from variant
            if (!string.IsNullOrEmpty(request.VariantId))
            {
                var variant = product.Variants?.FirstOrDefault(v => v.Id == request.VariantId);
                if (variant == null)
                {
                    return NotFound("Variant not found");
                }

                // Use variant's sale price if available, otherwise variant's regular price
                effectivePrice = variant.SalePrice ?? variant.Price;

                // Append variant options to product name (e.g., "T-Shirt - Black, Large")
                if (variant.Options != null && variant.Options.Any())
                {
                    var optionsText = string.Join(", ", variant.Options.Values);
                    productName = $"{product.Name} - {optionsText}";
                }
            }
            else
            {
                // No variant specified, use product price
                effectivePrice = product.SalePrice ?? product.Price ?? 0m;
            }

            var newItem = new CartItem
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = product.Id,
                VariantId = request.VariantId,
                ProductName = productName,
                ProductImageUrl = product.Images?.FirstOrDefault(),
                UnitPrice = effectivePrice,
                Quantity = request.Quantity,
                Subtotal = effectivePrice * request.Quantity,
                AvailableStock = availableStock
            };
            cart.Items.Add(newItem);
            existingItem = newItem;
        }

        _store.UpdateCart(cart);

        // Sync cart to order with status "new"
        _store.SyncCartToOrder(cart);

        return Ok(existingItem);
    }

    [HttpPut("items/{itemId}")]
    public ActionResult<CartItem> UpdateCartItem(
        string itemId,
        [FromHeader(Name = "X-Session-ID")] string? sessionId,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId,
        [FromBody] UpdateCartItemRequest request)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var cart = _store.GetOrCreateCart(sessionId, tenantId ?? "tenant-a", marketId ?? "market-1");
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            return NotFound("Cart item not found");
        }

        // Validate stock availability before updating quantity
        var product = _store.GetProduct(item.ProductId);
        if (product == null)
        {
            return NotFound("Product not found");
        }

        int availableStock;
        string itemIdentifier;

        if (!string.IsNullOrEmpty(item.VariantId))
        {
            var variant = product.Variants?.FirstOrDefault(v => v.Id == item.VariantId);
            if (variant == null)
            {
                return NotFound("Variant not found");
            }
            availableStock = variant.StockQuantity;
            itemIdentifier = item.ProductName;
        }
        else
        {
            if (!product.StockQuantity.HasValue)
            {
                return BadRequest($"Product '{item.ProductName}' has no stock information");
            }
            availableStock = product.StockQuantity.Value;
            itemIdentifier = item.ProductName;
        }

        // Check if requested quantity exceeds available stock
        if (request.Quantity > availableStock)
        {
            return BadRequest($"Insufficient stock for '{itemIdentifier}'. Requested: {request.Quantity}, Available: {availableStock}");
        }

        item.Quantity = request.Quantity;
        item.Subtotal = item.Quantity * item.UnitPrice;
        item.AvailableStock = availableStock;

        _store.UpdateCart(cart);

        // Sync cart to order with status "new"
        _store.SyncCartToOrder(cart);

        return Ok(item);
    }

    [HttpDelete("items/{itemId}")]
    public IActionResult DeleteCartItem(
        string itemId,
        [FromHeader(Name = "X-Session-ID")] string? sessionId,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var cart = _store.GetOrCreateCart(sessionId, tenantId ?? "tenant-a", marketId ?? "market-1");
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            return NotFound("Cart item not found");
        }

        cart.Items.Remove(item);
        _store.UpdateCart(cart);

        // Sync cart to order with status "new" (or delete if empty)
        _store.SyncCartToOrder(cart);

        return NoContent();
    }
}
