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
    public ActionResult<Cart> GetCart([FromHeader(Name = "X-Session-ID")] string? sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var cart = _store.GetOrCreateCart(sessionId);
        return Ok(cart);
    }

    [HttpPost("items")]
    public ActionResult<CartItem> AddCartItem(
        [FromHeader(Name = "X-Session-ID")] string? sessionId,
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

        var cart = _store.GetOrCreateCart(sessionId);

        // Check if item already exists (match by both productId and variantId)
        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == request.ProductId &&
            i.VariantId == request.VariantId);

        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
            existingItem.Subtotal = existingItem.Quantity * existingItem.UnitPrice;
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
                ProductImageUrl = product.ImageUrl,
                UnitPrice = effectivePrice,
                Quantity = request.Quantity,
                Subtotal = effectivePrice * request.Quantity
            };
            cart.Items.Add(newItem);
            existingItem = newItem;
        }

        _store.UpdateCart(cart);
        return Ok(existingItem);
    }

    [HttpPut("items/{itemId}")]
    public ActionResult<CartItem> UpdateCartItem(
        string itemId,
        [FromHeader(Name = "X-Session-ID")] string? sessionId,
        [FromBody] UpdateCartItemRequest request)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var cart = _store.GetOrCreateCart(sessionId);
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            return NotFound("Cart item not found");
        }

        item.Quantity = request.Quantity;
        item.Subtotal = item.Quantity * item.UnitPrice;

        _store.UpdateCart(cart);
        return Ok(item);
    }

    [HttpDelete("items/{itemId}")]
    public IActionResult DeleteCartItem(
        string itemId,
        [FromHeader(Name = "X-Session-ID")] string? sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        var cart = _store.GetOrCreateCart(sessionId);
        var item = cart.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
        {
            return NotFound("Cart item not found");
        }

        cart.Items.Remove(item);
        _store.UpdateCart(cart);

        return NoContent();
    }
}
