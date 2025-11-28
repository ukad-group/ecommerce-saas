namespace EComm.Api.DTOs.Requests.OrderStatuses;

public class CreateOrderStatusRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Color { get; set; } = "#6B7280";
    public int SortOrder { get; set; }
}
