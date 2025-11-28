using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdatePropertyTemplatesRequest
{
    public List<CustomPropertyTemplate> Templates { get; set; } = new();
}
