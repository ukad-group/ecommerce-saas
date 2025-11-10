namespace MockApi.Models;

public class Product
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; } // Optional when product has variants
    public decimal? Price { get; set; } // Optional when product has variants
    public decimal? SalePrice { get; set; }
    public string Status { get; set; } = "active";
    public int? StockQuantity { get; set; } // Optional when product has variants
    public int? LowStockThreshold { get; set; } // Optional when product has variants
    public string Currency { get; set; } = "USD";
    public List<string> Images { get; set; } = new();
    public List<string> CategoryIds { get; set; } = new(); // Multiple categories
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public bool HasVariants { get; set; } = false;
    public List<VariantOption>? VariantOptions { get; set; }
    public List<ProductVariant>? Variants { get; set; }
    public List<CustomProperty>? CustomProperties { get; set; }

    // Versioning fields
    public int Version { get; set; } = 1;
    public bool IsCurrentVersion { get; set; } = true;
    public DateTime VersionCreatedAt { get; set; }
    public string VersionCreatedBy { get; set; } = string.Empty; // User ID who created this version
    public string? ChangeNotes { get; set; } // Optional notes about what changed

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

    // Legacy property for backwards compatibility (maps to Images[0])
    public string? ImageUrl
    {
        get => Images.Count > 0 ? Images[0] : null;
        set
        {
            if (!string.IsNullOrEmpty(value) && !Images.Contains(value))
            {
                Images.Add(value);
            }
        }
    }
}

public class VariantOption
{
    public string Name { get; set; } = string.Empty;
    public List<string> Values { get; set; } = new();
}

public class ProductVariant
{
    public string Id { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? SalePrice { get; set; }
    public int StockQuantity { get; set; }
    public int LowStockThreshold { get; set; }
    public List<string>? Images { get; set; }
    public Dictionary<string, string> Options { get; set; } = new();
    public string Status { get; set; } = "active";
    public bool IsDefault { get; set; } = false;
}

public class CustomProperty
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class ProductListResponse
{
    public List<Product> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class Category
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ParentId { get; set; }
    public int DisplayOrder { get; set; }
    public int ProductCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CategoryListResponse
{
    public List<Category> Data { get; set; } = new();
}
