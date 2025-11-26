namespace EComm.Api.Models;

/// <summary>
/// Represents a custom order status for a tenant.
/// Each tenant can define their own order statuses with custom names, colors, and ordering.
/// </summary>
public class OrderStatus
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Display name for the status (e.g., "Pending Payment", "Ready to Ship")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// URL-safe code for the status (e.g., "pending-payment", "ready-to-ship")
    /// Used in API calls and database queries
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Hex color code for UI display (e.g., "#3B82F6")
    /// </summary>
    public string Color { get; set; } = "#6B7280"; // Default gray

    /// <summary>
    /// Display order for sorting (lower numbers appear first)
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// System default statuses cannot be deleted
    /// </summary>
    public bool IsSystemDefault { get; set; }

    /// <summary>
    /// Whether this status is active and available for use
    /// </summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Request to create a new order status
/// </summary>
public class CreateOrderStatusRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Color { get; set; } = "#6B7280";
    public int SortOrder { get; set; }
}

/// <summary>
/// Request to update an existing order status definition
/// </summary>
public class UpdateOrderStatusDefinitionRequest
{
    public string? Name { get; set; }
    public string? Color { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
}

/// <summary>
/// Default order status presets for new tenants
/// </summary>
public static class DefaultOrderStatuses
{
    public static List<(string Name, string Code, string Color, int SortOrder)> GetDefaults() => new()
    {
        ("New", "new", "#6B7280", 1),                    // Gray
        ("Submitted", "submitted", "#3B82F6", 2),        // Blue
        ("Paid", "paid", "#10B981", 3),                  // Green
        ("Processing", "processing", "#F59E0B", 4),      // Orange
        ("Completed", "completed", "#059669", 5),        // Dark Green
        ("Cancelled", "cancelled", "#EF4444", 6),        // Red
        ("On Hold", "on-hold", "#F59E0B", 7),           // Yellow/Orange
        ("Refunded", "refunded", "#8B5CF6", 8)          // Purple
    };
}
