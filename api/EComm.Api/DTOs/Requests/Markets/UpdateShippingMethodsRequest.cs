using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateShippingMethodsRequest
{
    public List<ShippingMethod> Methods { get; set; } = new();
}
