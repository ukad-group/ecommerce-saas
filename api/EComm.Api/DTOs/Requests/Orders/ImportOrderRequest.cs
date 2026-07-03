using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Product;

namespace EComm.Api.DTOs.Requests.Orders;

/// <summary>
/// Verbatim historical order import/upsert (data migration). Unlike
/// CreateOrderRequest, this writes the supplied Id, totals, and timestamps
/// as-is — no cart, no number/date generation, no stock side-effects.
/// </summary>
public class ImportOrderRequest
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string? Status { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal ShippingCost { get; set; }
    public decimal Total { get; set; }
    public CustomerInfo Customer { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Address? BillingAddress { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public string? TrackingNumber { get; set; }
    public List<CustomProperty>? CustomProperties { get; set; }
    public string? PaymentStatus { get; set; }
    public string? PaymentReference { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
