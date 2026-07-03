using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateLeasingPeriodsRequest
{
    public List<LeasingPeriod> Periods { get; set; } = new();
}
