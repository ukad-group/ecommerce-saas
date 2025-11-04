namespace MockApi.Models;

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

public class TenantSettings
{
    public int MaxMarkets { get; set; }
    public int MaxUsers { get; set; }
    public List<string>? Features { get; set; }
}

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

public class MarketSettings
{
    public string? OrderPrefix { get; set; }
    public decimal TaxRate { get; set; }
    public List<string>? ShippingZones { get; set; }
}

public class TenantsResponse
{
    public List<Tenant> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
}

public class MarketsResponse
{
    public List<Market> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
}
