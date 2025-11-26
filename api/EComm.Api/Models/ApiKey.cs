namespace EComm.Api.Models;

public class ApiKey
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;
    public string LastFourChars { get; set; } = string.Empty;
    public string Status { get; set; } = "active"; // active, revoked
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedBy { get; set; }
}

public class ApiKeyListItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LastFourChars { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class ApiKeyCreationResponse
{
    public string Id { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty; // Full key - shown only once!
    public string Name { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateApiKeyRequest
{
    public string Name { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}

public class RevokeApiKeyResponse
{
    public string Message { get; set; } = string.Empty;
}
