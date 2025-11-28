namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateMarketRequest
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Type { get; set; }
    public string? Currency { get; set; }
    public string? Timezone { get; set; }
}
