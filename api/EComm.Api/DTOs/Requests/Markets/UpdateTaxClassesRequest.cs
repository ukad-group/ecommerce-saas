using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateTaxClassesRequest
{
    public List<TaxClass> TaxClasses { get; set; } = new();
}
