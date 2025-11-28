namespace EComm.Data.Common;

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
