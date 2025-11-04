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

        // Check if item already exists
        var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
            existingItem.Subtotal = existingItem.Quantity * existingItem.UnitPrice;
        }
        else
        {
            // Get the effective price (use sale price if available, otherwise regular price)
            var effectivePrice = product.SalePrice ?? product.Price ?? 0m;

            var newItem = new CartItem
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = product.Id,
                ProductName = product.Name,
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
