namespace EComm.Api.DTOs.Requests.OrderStatuses;

public class UpdateOrderStatusDefinitionRequest
{
    public string? Name { get; set; }
    public string? Color { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
}
