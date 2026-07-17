using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateAttributesRequest
{
    public List<ProductAttribute> Attributes { get; set; } = new();
}
