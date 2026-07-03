using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Product;

namespace EComm.Api.DTOs.Requests.Orders;

public class CreateOrderRequest
{
    public string SessionId { get; set; } = string.Empty;
    public CustomerInfo Customer { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Address? BillingAddress { get; set; }
    public List<OrderItemRequest> Items { get; set; } = new();

    /// <summary>Id of the chosen shipping method (see GET /markets/{id}/shipping-methods). Defaults to
    /// the market's first configured method if omitted.</summary>
    public string? ShippingMethodId { get; set; }

    /// <summary>Free-form order-level fields (trailerComment, leasingPeriodId, message, etc) —
    /// per-line classifiers like itemType/itemSubType come from the cart items instead.</summary>
    public List<CustomProperty>? CustomProperties { get; set; }
}
