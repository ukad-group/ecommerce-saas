using System.Text.Json.Serialization;

namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Product DTO from the eCommerce API
/// </summary>
public class Product
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Description { get; set; }

    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal? Price { get; set; }

    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal? SalePrice { get; set; }

    public string? CategoryId { get; set; }
    public List<string> CategoryIds { get; set; } = new();

    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? StockQuantity { get; set; }

    public List<ProductImage> Images { get; set; } = new();
    public List<CustomProperty>? CustomProperties { get; set; }
    public List<string> Highlights { get; set; } = new();
    // Free-form editorial values (one list per product) shown on customize/summary/email surfaces.
    public List<string> FreeOptions { get; set; } = new();

    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal? LeasingFactor { get; set; }
    public bool HidePrice { get; set; } = false;
    public string? HiddenPriceDescription { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    // Product metadata
    public string? Sku { get; set; }
    public string Status { get; set; } = "active";
    public string Currency { get; set; } = "USD";

    // Variant support
    public bool HasVariants { get; set; } = false;
    public List<VariantOption>? VariantOptions { get; set; }
    public List<ProductVariant>? Variants { get; set; }

    // Add-on options
    public List<ProductOption>? Options { get; set; }

    // Versioning fields
    public int Version { get; set; } = 1;
    public bool IsCurrentVersion { get; set; } = true;
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? VersionCreatedAt { get; set; }
    public string? VersionCreatedBy { get; set; }
    public string? ChangeNotes { get; set; }

    // Timestamps
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? CreatedAt { get; set; }
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? UpdatedAt { get; set; }
}

public class CustomProperty
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
