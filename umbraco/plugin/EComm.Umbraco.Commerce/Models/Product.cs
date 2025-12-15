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
    public Dictionary<string, string> CustomProperties { get; set; } = new();
}
