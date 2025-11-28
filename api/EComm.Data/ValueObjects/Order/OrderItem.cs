using System.Text.Json.Serialization;

namespace EComm.Data.ValueObjects.Order;

public class OrderItem
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }

    [JsonPropertyName("lineTotal")]
    public decimal Subtotal { get; set; }

    public string Currency { get; set; } = "USD";
}
