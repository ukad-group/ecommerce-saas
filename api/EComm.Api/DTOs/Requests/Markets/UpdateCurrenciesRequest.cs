using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateCurrenciesRequest
{
    public List<Currency> Currencies { get; set; } = new();
}
