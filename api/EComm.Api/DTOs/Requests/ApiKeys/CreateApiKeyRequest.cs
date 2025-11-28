namespace EComm.Api.DTOs.Requests.ApiKeys;

public class CreateApiKeyRequest
{
    public string Name { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}
