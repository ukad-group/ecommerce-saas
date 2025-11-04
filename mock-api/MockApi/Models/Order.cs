using System.Text.Json.Serialization;

namespace MockApi.Models;

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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class OrderItem
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }

    [JsonPropertyName("lineTotal")]
    public decimal Subtotal { get; set; }

    public string Currency { get; set; } = "USD";
}

public class CustomerInfo
{
    public string? CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class Address
{
    public string Street { get; set; } = string.Empty;
    public string? Street2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class CreateOrderRequest
{
    public string SessionId { get; set; } = string.Empty;
    public CustomerInfo Customer { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Address? BillingAddress { get; set; }
    public List<OrderItemRequest> Items { get; set; } = new();
}

public class OrderItemRequest
{
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
