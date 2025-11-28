namespace EComm.Api.DTOs.Responses.ApiKeys;

public class ApiKeyCreationResponse
{
    public string Id { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty; // Full key - shown only once!
    public string Name { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
