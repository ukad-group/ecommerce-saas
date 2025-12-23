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

    public string? CategoryId { get; set; }

    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public int? StockQuantity { get; set; }

    public List<string> Images { get; set; } = new();
    public List<CustomProperty>? CustomProperties { get; set; }

    // Product metadata
    public string? Sku { get; set; }
    public string Status { get; set; } = "active";
    public string Currency { get; set; } = "USD";

    // Versioning fields
    public int Version { get; set; } = 1;
    public bool IsCurrentVersion { get; set; } = true;
    public DateTime? VersionCreatedAt { get; set; }
    public string? VersionCreatedBy { get; set; }
    public string? ChangeNotes { get; set; }

    // Timestamps
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CustomProperty
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
