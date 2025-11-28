namespace EComm.Api.DTOs.Requests.Tenants;

public class UpdateTenantRequest
{
    public string? DisplayName { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
}
