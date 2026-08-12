namespace EComm.Data.Entities;

/// <summary>
/// An order status belonging to one market (store): its own names, colors and ordering. Statuses used
/// to be tenant-wide, which meant deleting one in a store deleted it in every sibling store, and a
/// status was "in use" if *any* of the tenant's orders used the code.
/// </summary>
public class OrderStatus
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;

    /// <summary>The market (store) this status belongs to. Scoped like products, categories and orders.</summary>
    public string MarketId { get; set; } = string.Empty;

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
    /// Seeded with the tenant. Deletable like any other status — this only marks which ones
    /// <c>reset-defaults</c> restores.
    /// </summary>
    public bool IsSystemDefault { get; set; }

    /// <summary>
    /// Whether this status is active and available for use
    /// </summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
