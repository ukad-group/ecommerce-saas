using Microsoft.AspNetCore.Mvc;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Cart;
using EComm.Data.ValueObjects.Tenant;
using EComm.Api.DTOs.Requests.Cart;

namespace EComm.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CartController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

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

        // Store-global option presets used to refresh option line-item stock
        var optionPresets = _store.GetMarket(marketId ?? "market-1")?.Settings?.OptionPresets;

        // Populate AvailableStock for each cart item for client-side validation
        foreach (var item in cart.Items)
        {
            var product = _store.GetProduct(item.ProductId);
            if (product != null)
            {
                if (!string.IsNullOrEmpty(item.OptionId))
                {
                    item.AvailableStock = optionPresets?.FirstOrDefault(p => p.Id == item.OptionId)?.StockQuantity;
                }
                else if (!string.IsNullOrEmpty(item.VariantId))
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

    // Clears the whole cart for a session (e.g. after a paid order — QA F-CART-1).
    [HttpDelete]
    public IActionResult ClearCart([FromHeader(Name = "X-Session-ID")] string? sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
        {
            return BadRequest("Session ID is required");
        }

        _store.ClearCart(sessionId);
        return NoContent();
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

        // Resolve the store-global option preset (sub-option) if this is an add-on.
        // A block may reference a preset directly, or reference a "group" preset
        // whose SubOptionIds list the single presets the customer can pick.
        OptionPreset? optionPreset = null;
        OptionPreset? optionGroup = null;
        if (!string.IsNullOrEmpty(request.OptionId))
        {
            var presets = _store.GetMarket(marketId ?? "market-1")?.Settings?.OptionPresets
                ?? new List<OptionPreset>();
            var presetById = presets.ToDictionary(p => p.Id);

            optionPreset = presets.FirstOrDefault(p => p.Id == request.OptionId);
            if (optionPreset == null)
                return NotFound("Option not found");

            // A group is a display bundle, not a buyable line — only its sub-options are.
            if (optionPreset.Kind == "group")
                return BadRequest("Option group is not directly purchasable; pick one of its options");

            // Valid if a non-disabled block references this option directly, or via a
            // referenced group whose sub-options include it.
            bool ReferencesOption(string id) =>
                id == request.OptionId ||
                (presetById.TryGetValue(id, out var g) && g.Kind == "group" &&
                 (g.SubOptionIds?.Contains(request.OptionId) ?? false));

            var referenced = product.Options?.Any(b => !b.Disabled && b.OptionIds.Any(ReferencesOption)) ?? false;
            if (!referenced)
                return BadRequest("Option is not available for this product");

            // Identify the owning group (if reached via one) for the cart line label.
            optionGroup = product.Options?
                .Where(b => !b.Disabled)
                .SelectMany(b => b.OptionIds)
                .Select(id => presetById.TryGetValue(id, out var g) ? g : null)
                .FirstOrDefault(g => g != null && g.Kind == "group"
                    && (g.SubOptionIds?.Contains(request.OptionId) ?? false));
        }

        // Check if item already exists (match by productId, variantId, optionId)
        var existingItem = cart.Items.FirstOrDefault(i =>
            i.ProductId == request.ProductId &&
            i.VariantId == request.VariantId &&
            i.OptionId == request.OptionId &&
            i.ItemType == request.ItemType);

        // Calculate the requested total quantity (existing + new)
        int requestedTotalQuantity = request.Quantity + (existingItem?.Quantity ?? 0);

        // Validate stock availability
        int availableStock;
        string itemIdentifier;

        if (optionPreset != null)
        {
            availableStock = optionPreset.StockQuantity;
            itemIdentifier = $"{product.Name} — {optionPreset.Name}";
        }
        else if (!string.IsNullOrEmpty(request.VariantId))
        {
            var variant = product.Variants?.FirstOrDefault(v => v.Id == request.VariantId);
            if (variant == null)
                return NotFound("Variant not found");
            availableStock = variant.StockQuantity;
            itemIdentifier = product.Name;
        }
        else
        {
            if (!product.StockQuantity.HasValue)
                return BadRequest($"Product '{product.Name}' has no stock information");
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
            string? itemImage = product.Images?.FirstOrDefault();

            if (optionPreset != null)
            {
                // Option add-on: snapshot name/price/image from the preset at add-time
                effectivePrice = optionPreset.Price;
                productName = optionGroup != null
                    ? $"{product.Name} — {optionGroup.Name} — {optionPreset.Name}"
                    : $"{product.Name} — {optionPreset.Name}";
                itemImage = optionPreset.ImageUrl ?? itemImage;
            }
            else if (!string.IsNullOrEmpty(request.VariantId))
            {
                var variant = product.Variants!.First(v => v.Id == request.VariantId);
                effectivePrice = variant.SalePrice ?? variant.Price;
                if (variant.Options != null && variant.Options.Any())
                {
                    var optionsText = string.Join(", ", variant.Options.Values);
                    productName = $"{product.Name} - {optionsText}";
                }
            }
            else
            {
                effectivePrice = product.SalePrice ?? product.Price ?? 0m;
            }

            var newItem = new CartItem
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = product.Id,
                VariantId = request.VariantId,
                OptionId = request.OptionId,
                ItemType = request.ItemType,
                ItemSubType = request.ItemSubType,
                ProductName = productName,
                ProductImageUrl = itemImage,
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
