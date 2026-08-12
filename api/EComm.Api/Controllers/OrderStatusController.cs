using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using EComm.Data;
using EComm.Data.Common;
using EComm.Data.Entities;
using EComm.Api.DTOs.Requests.OrderStatuses;

namespace EComm.Api.Controllers;

/// <summary>
/// API controller for managing a market's order status definitions. Statuses are **market-scoped**
/// like products, categories and orders — every request carries <c>X-Tenant-ID</c> + <c>X-Market-ID</c>,
/// and each store owns its own set (deleting one in a store leaves its siblings alone).
/// Writes use "AdminOrApiKey" (not "AdminOnly", which is JWT-only) so the Umbraco plugin can manage
/// statuses with its API key, like the market sub-resources in <see cref="MarketsController"/>.
/// </summary>
[Authorize]  // default policy: JWT or API key for reads
[ApiController]
[Route("api/v1/order-statuses")]
public class OrderStatusController : ControllerBase
{
    private readonly ECommDbContext _context;

    public OrderStatusController(ECommDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all order statuses for a market
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<OrderStatus>>> GetOrderStatuses(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var error)) return error!;

        var statuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && s.MarketId == marketId)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        return Ok(statuses);
    }

    /// <summary>
    /// Get active order statuses only (for dropdowns)
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<List<OrderStatus>>> GetActiveOrderStatuses(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var error)) return error!;

        var statuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && s.MarketId == marketId && s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        return Ok(statuses);
    }

    /// <summary>
    /// Get a specific order status by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderStatus>> GetOrderStatus(
        string id,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var error)) return error!;

        var status = await _context.OrderStatuses
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId && s.MarketId == marketId);

        if (status == null)
        {
            return NotFound(new { error = "Order status not found" });
        }

        return Ok(status);
    }

    /// <summary>
    /// Create a new order status
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AdminOrApiKey")]
    public async Task<ActionResult<OrderStatus>> CreateOrderStatus(
        [FromBody] CreateOrderStatusRequest request,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var error)) return error!;

        // Validate required fields
        if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Code))
        {
            return BadRequest(new { error = "Name and Code are required" });
        }

        // Only this market's codes collide — a sibling store having "awaiting-pickup" is fine
        var existingStatus = await _context.OrderStatuses
            .AnyAsync(s => s.TenantId == tenantId && s.MarketId == marketId && s.Code == request.Code);

        if (existingStatus)
        {
            return Conflict(new { error = "A status with this code already exists" });
        }

        var newStatus = new OrderStatus
        {
            Id = $"status-{Guid.NewGuid()}",
            TenantId = tenantId,
            MarketId = marketId!,
            Name = request.Name,
            Code = request.Code,
            Color = request.Color,
            SortOrder = request.SortOrder,
            IsSystemDefault = false, // Custom statuses are not system defaults
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.OrderStatuses.Add(newStatus);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetOrderStatus),
            new { id = newStatus.Id },
            newStatus
        );
    }

    /// <summary>
    /// Update an existing order status
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public async Task<ActionResult<OrderStatus>> UpdateOrderStatus(
        string id,
        [FromBody] UpdateOrderStatusDefinitionRequest request,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var error)) return error!;

        var status = await _context.OrderStatuses
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId && s.MarketId == marketId);

        if (status == null)
        {
            return NotFound(new { error = "Order status not found" });
        }

        // Apply updates
        if (request.Name != null) status.Name = request.Name;
        if (request.Color != null) status.Color = request.Color;
        if (request.SortOrder.HasValue) status.SortOrder = request.SortOrder.Value;
        if (request.IsActive.HasValue) status.IsActive = request.IsActive.Value;

        status.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(status);
    }

    /// <summary>
    /// Delete an order status. Refused while something still points at its code: an order, or a
    /// market's checkout settings. System defaults are deletable — a tenant that never puts an order
    /// "On Hold" shouldn't be stuck with the status forever; <c>IsSystemDefault</c> stays as the marker
    /// <c>reset-defaults</c> uses.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public async Task<IActionResult> DeleteOrderStatus(
        string id,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var scopeError)) return scopeError!;

        var status = await _context.OrderStatuses
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId && s.MarketId == marketId);

        if (status == null)
        {
            return NotFound(new { error = "Order status not found" });
        }

        // Only *this* store's orders count. A sibling store using the code is its own business — that
        // store has its own copy of the status.
        var isInUse = await _context.Orders
            .AnyAsync(o => o.TenantId == tenantId && o.MarketId == marketId && o.Status == status.Code);

        if (isInUse)
        {
            return BadRequest(new
            {
                error = "Cannot delete status that is currently in use by orders",
                suggestion = "You can deactivate the status instead"
            });
        }

        // This store pointing at the code would keep writing a status nothing defines — the payment
        // path sets OrderStatusAfterPayment on every settled order. Settings is a JSON column, so the
        // check runs in memory rather than in SQL.
        var market = await _context.Markets.FirstOrDefaultAsync(m => m.Id == marketId && m.TenantId == tenantId);
        var referencedBy =
            status.Code.Equals(market?.Settings?.OrderStatusAfterPayment, StringComparison.OrdinalIgnoreCase) ? "the status set after payment"
            : status.Code.Equals(market?.Settings?.CartOrderStatus, StringComparison.OrdinalIgnoreCase) ? "the cart status"
            : null;

        if (referencedBy != null)
        {
            return BadRequest(new
            {
                error = $"Cannot delete the status this store uses as {referencedBy}",
                suggestion = "Point the store at another status first"
            });
        }

        _context.OrderStatuses.Remove(status);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Reset this market's statuses to the defaults: drop its unused custom ones, reactivate its
    /// defaults, and re-add any default that was deleted.
    /// </summary>
    [HttpPost("reset-defaults")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<List<OrderStatus>>> ResetToDefaults(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId,
        [FromHeader(Name = "X-Market-ID")] string? marketId)
    {
        if (MissingScope(tenantId, marketId, out var error)) return error!;

        var statuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && s.MarketId == marketId)
            .ToListAsync();

        // Remove this market's custom statuses that none of its orders use
        foreach (var status in statuses.Where(s => !s.IsSystemDefault))
        {
            var isInUse = await _context.Orders
                .AnyAsync(o => o.TenantId == tenantId && o.MarketId == marketId && o.Status == status.Code);

            if (!isInUse)
            {
                _context.OrderStatuses.Remove(status);
            }
        }

        foreach (var status in statuses.Where(s => s.IsSystemDefault))
        {
            status.IsActive = true;
            status.UpdatedAt = DateTime.UtcNow;
        }

        // Put back any default that was deleted — this is the way back from deleting one, now that
        // defaults are deletable. (The seeder only backfills markets with no statuses at all.)
        var existingCodes = statuses.Select(s => s.Code).ToList();

        foreach (var (name, code, color, sortOrder) in DefaultOrderStatuses.GetDefaults())
        {
            if (existingCodes.Contains(code)) continue;

            _context.OrderStatuses.Add(new OrderStatus
            {
                Id = $"status-{marketId}-{code}",
                TenantId = tenantId,
                MarketId = marketId!,
                Name = name,
                Code = code,
                Color = color,
                SortOrder = sortOrder,
                IsSystemDefault = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        var allStatuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && s.MarketId == marketId)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        return Ok(allStatuses);
    }

    /// <summary>Both scoping headers are mandatory — a status belongs to one store.</summary>
    private bool MissingScope(string? tenantId, string? marketId, out ActionResult? error)
    {
        error = string.IsNullOrEmpty(tenantId) ? BadRequest(new { error = "X-Tenant-ID header is required" })
              : string.IsNullOrEmpty(marketId) ? BadRequest(new { error = "X-Market-ID header is required" })
              : null;
        return error != null;
    }
}
