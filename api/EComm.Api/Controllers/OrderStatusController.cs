using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Api.DTOs.Requests.OrderStatuses;

namespace EComm.Api.Controllers;

/// <summary>
/// API controller for managing order status definitions per tenant
/// </summary>
[Authorize(Policy = "AdminOnly")]
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
    /// Get all order statuses for a tenant
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<OrderStatus>>> GetOrderStatuses(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        var statuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        return Ok(statuses);
    }

    /// <summary>
    /// Get active order statuses only (for dropdowns)
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<List<OrderStatus>>> GetActiveOrderStatuses(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        var statuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && s.IsActive)
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
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        var status = await _context.OrderStatuses
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

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
    public async Task<ActionResult<OrderStatus>> CreateOrderStatus(
        [FromBody] CreateOrderStatusRequest request,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        // Validate required fields
        if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Code))
        {
            return BadRequest(new { error = "Name and Code are required" });
        }

        // Check if code already exists for this tenant
        var existingStatus = await _context.OrderStatuses
            .AnyAsync(s => s.TenantId == tenantId && s.Code == request.Code);

        if (existingStatus)
        {
            return Conflict(new { error = "A status with this code already exists" });
        }

        var newStatus = new OrderStatus
        {
            Id = $"status-{Guid.NewGuid()}",
            TenantId = tenantId,
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
    public async Task<ActionResult<OrderStatus>> UpdateOrderStatus(
        string id,
        [FromBody] UpdateOrderStatusDefinitionRequest request,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        var status = await _context.OrderStatuses
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

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
    /// Delete an order status (only if not in use and not a system default)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrderStatus(
        string id,
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        var status = await _context.OrderStatuses
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

        if (status == null)
        {
            return NotFound(new { error = "Order status not found" });
        }

        // Cannot delete system default statuses
        if (status.IsSystemDefault)
        {
            return BadRequest(new { error = "Cannot delete system default statuses" });
        }

        // Check if status is in use by any orders
        var isInUse = await _context.Orders
            .AnyAsync(o => o.TenantId == tenantId && o.Status == status.Code);

        if (isInUse)
        {
            return BadRequest(new
            {
                error = "Cannot delete status that is currently in use by orders",
                suggestion = "You can deactivate the status instead"
            });
        }

        _context.OrderStatuses.Remove(status);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Reset to default statuses for a tenant
    /// </summary>
    [HttpPost("reset-defaults")]
    public async Task<ActionResult<List<OrderStatus>>> ResetToDefaults(
        [FromHeader(Name = "X-Tenant-ID")] string? tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "X-Tenant-ID header is required" });
        }

        // Remove all custom (non-system-default) statuses that are not in use
        var customStatuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && !s.IsSystemDefault)
            .ToListAsync();

        foreach (var status in customStatuses)
        {
            var isInUse = await _context.Orders
                .AnyAsync(o => o.TenantId == tenantId && o.Status == status.Code);

            if (!isInUse)
            {
                _context.OrderStatuses.Remove(status);
            }
        }

        // Reset all system default statuses to active
        var systemStatuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId && s.IsSystemDefault)
            .ToListAsync();

        foreach (var status in systemStatuses)
        {
            status.IsActive = true;
            status.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Return all statuses after reset
        var allStatuses = await _context.OrderStatuses
            .Where(s => s.TenantId == tenantId)
            .OrderBy(s => s.SortOrder)
            .ToListAsync();

        return Ok(allStatuses);
    }
}
