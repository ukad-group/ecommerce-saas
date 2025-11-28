using EComm.Data.Entities;

namespace EComm.Api.DTOs.Responses.Markets;

public class MarketsResponse
{
    public List<Market> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int Limit { get; set; }
}
