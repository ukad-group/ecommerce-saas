using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Tenant;

namespace EComm.Data.Entities;

public class Tenant
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public Address? Address { get; set; }
    public TenantSettings? Settings { get; set; }
    public int MarketCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
