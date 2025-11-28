namespace EComm.Api.DTOs.Requests.Orders;

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
