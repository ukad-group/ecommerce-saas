using System.ComponentModel.DataAnnotations.Schema;
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

    /// <summary>Flat surcharge fee snapshotted from the market's active payment provider at
    /// order-creation time (MarketSettings.PaymentSurcharges). 0 when none configured.</summary>
    public decimal PaymentFee { get; set; }

    /// <summary>Tax on PaymentFee, computed from the surcharge's TaxClass at order-creation time.</summary>
    public decimal PaymentFeeTax { get; set; }

    /// <summary>Subtotal + Tax + ShippingCost + PaymentFee + PaymentFeeTax.</summary>
    public decimal Total { get; set; }
    public CustomerInfo Customer { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Address? BillingAddress { get; set; }

    [JsonPropertyName("lineItems")]
    public List<OrderItem> Items { get; set; } = new();

    /// <summary>Order currency (ISO 4217), from the market. Single currency per market, so it's
    /// derived from the line items rather than persisted as its own column (keeps EnsureCreated happy).</summary>
    [NotMapped]
    [JsonPropertyName("currency")]
    public string Currency => Items.Count > 0 ? Items[0].Currency : "USD";

    public string? TrackingNumber { get; set; }

    /// <summary>Free-form order-level fields (e.g. trailerComment, leasingPeriodId,
    /// message) that don't warrant a dedicated column each. Per-line classifiers like itemType/
    /// itemSubType live on OrderItem instead — see OrderItem.ItemType.</summary>
    public List<CustomProperty>? CustomProperties { get; set; }

    /// <summary>Payment lifecycle set by the market's payment provider: "Initialized" (payment created)
    /// → "Authorized" (funds reserved) → "Captured" (charged). Null until a payment is started.</summary>
    public string? PaymentStatus { get; set; }

    /// <summary>The provider's payment id for this order's payment, once one has been created.</summary>
    public string? PaymentReference { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
