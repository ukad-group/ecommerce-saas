namespace EComm.Data.Entities;

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
