using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateMarketCountriesRequest
{
    public List<MarketCountry> Countries { get; set; } = new();
}
