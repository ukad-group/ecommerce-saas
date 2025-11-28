using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Tenant;

namespace EComm.Data.Entities;

public class Market
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Type { get; set; } = "physical";  // physical, online, hybrid
    public string Status { get; set; } = "active";
    public string Currency { get; set; } = "USD";
    public string Timezone { get; set; } = string.Empty;
    public Address? Address { get; set; }
    public MarketSettings? Settings { get; set; }
    public int ApiKeyCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
