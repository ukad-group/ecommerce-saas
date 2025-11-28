using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;

namespace EComm.Api.DTOs.Requests.Orders;

public class CreateOrderRequest
{
    public string SessionId { get; set; } = string.Empty;
    public CustomerInfo Customer { get; set; } = new();
    public Address ShippingAddress { get; set; } = new();
    public Address? BillingAddress { get; set; }
    public List<OrderItemRequest> Items { get; set; } = new();
}
