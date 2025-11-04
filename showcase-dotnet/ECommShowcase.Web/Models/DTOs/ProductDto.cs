namespace ECommShowcase.Web.Models.DTOs;

public class ProductDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public decimal? Price { get; set; }
    public decimal? SalePrice { get; set; }
    public string? ImageUrl { get; set; }
    public List<string> CategoryIds { get; set; } = new();
    public List<string> Images { get; set; } = new();
    public string Status { get; set; } = "active";
    public int? StockQuantity { get; set; }
    public int? LowStockThreshold { get; set; }
    public string Currency { get; set; } = "USD";
    public bool HasVariants { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Legacy property for backwards compatibility (maps to CategoryIds[0])
    public string CategoryId
    {
        get => CategoryIds.Count > 0 ? CategoryIds[0] : string.Empty;
        set
        {
            if (!string.IsNullOrEmpty(value) && !CategoryIds.Contains(value))
            {
                CategoryIds.Add(value);
            }
        }
    }
}

public class ProductListResponse
{
    public List<ProductDto> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
