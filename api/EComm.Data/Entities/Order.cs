using System.Text.Json.Serialization;
using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Product;

namespace EComm.Data.Entities;

public class Order
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }

    [JsonPropertyName("shipping")]
    public decimal ShippingCost { get; set; }
    public decimal Total { get; set; }
    public CustomerInfo Customer { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Address? BillingAddress { get; set; }

    [JsonPropertyName("lineItems")]
    public List<OrderItem> Items { get; set; } = new();

    public string? TrackingNumber { get; set; }

    /// <summary>Free-form order-level fields (e.g. trailerComment, leasingPeriodId,
    /// message) that don't warrant a dedicated column each. Per-line classifiers like itemType/
    /// itemSubType live on OrderItem instead — see OrderItem.ItemType.</summary>
    public List<CustomProperty>? CustomProperties { get; set; }

    /// <summary>Nets Easy payment lifecycle: "Initialized" (payment created) → "Authorized"
    /// (checkout completed, funds reserved) → "Captured" (charged). Null until a payment is started.</summary>
    public string? PaymentStatus { get; set; }

    /// <summary>The Nets Easy paymentId for this order's payment, once one has been created.</summary>
    public string? PaymentReference { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
