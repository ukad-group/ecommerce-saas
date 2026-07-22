using System.Text.Json.Serialization;

namespace EComm.Umbraco.Commerce.Models;

public class Order
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }

    [JsonPropertyName("shipping")]
    public decimal ShippingCost { get; set; }

    public decimal Total { get; set; }
    public OrderCustomer Customer { get; set; } = new();
    public OrderAddress ShippingAddress { get; set; } = new();
    public OrderAddress? BillingAddress { get; set; }

    [JsonPropertyName("lineItems")]
    public List<OrderItem> Items { get; set; } = new();

    public string? TrackingNumber { get; set; }

    /// <summary>Free-form order-level fields (e.g. trailerComment, leasingPeriodId,
    /// message) that don't warrant a dedicated column each. Per-line classifiers like itemType/
    /// itemSubType live on OrderItem instead — see OrderItem.ItemType.</summary>
    public List<CustomProperty>? CustomProperties { get; set; }

    /// <summary>Nets Easy payment lifecycle: "Initialized" → "Authorized" → "Captured".</summary>
    public string? PaymentStatus { get; set; }

    /// <summary>The Nets Easy paymentId for this order's payment, once one has been created.</summary>
    public string? PaymentReference { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePaymentResult
{
    public string PaymentId { get; set; } = string.Empty;
    public string? RedirectUrl { get; set; }
}

public class OrderItem
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }

    /// <summary>Caller-supplied line classifier, e.g. "Trailer"/"TrailerOption"/"Accessory".</summary>
    public string? ItemType { get; set; }
    public string? ItemSubType { get; set; }

    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }

    [JsonPropertyName("lineTotal")]
    public decimal Subtotal { get; set; }

    public string Currency { get; set; } = "USD";
}

public class OrderCustomer
{
    public string? CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class OrderAddress
{
    public string Street { get; set; } = string.Empty;
    public string? Street2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class OrderListResult
{
    public List<Order> Orders { get; set; } = new();
    public int TotalCount { get; set; }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class OrderStatusDefinition
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Color { get; set; } = "#6B7280";
    public int SortOrder { get; set; }
    public bool IsSystemDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
