namespace EComm.Umbraco.Commerce.Models;

public class Discount
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "percentage";
    public decimal Value { get; set; }
    public decimal MinOrderValue { get; set; }
    public int? MaxUses { get; set; }
    public int UsesCount { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
