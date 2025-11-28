using EComm.Data.Entities;

namespace EComm.Api.DTOs.Responses.Tenants;

public class TenantsResponse
{
    public List<Tenant> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
}
