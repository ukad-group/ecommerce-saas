using Microsoft.AspNetCore.Mvc;
using MockApi.Data;
using MockApi.Models;

namespace MockApi.Controllers;

[ApiController]
[Route("api/v1/markets/{marketId}/api-keys")]
public class ApiKeysController : ControllerBase
{
    private readonly MockDataStore _store = MockDataStore.Instance;
    private readonly ILogger<ApiKeysController> _logger;

    public ApiKeysController(ILogger<ApiKeysController> logger)
    {
        _logger = logger;
    }

    // GET /api/v1/markets/{marketId}/api-keys - List keys for market
    [HttpGet]
    public ActionResult<List<ApiKeyListItem>> GetApiKeys(string marketId)
    {
        // Check if market exists
        var market = _store.GetMarket(marketId);
        if (market == null)
        {
            return NotFound(new { error = "Market not found" });
        }

        // Get keys for this market
        var marketKeys = _store.GetApiKeysByMarket(marketId);

        // Return list items (without full key hash for security)
        var keyListItems = marketKeys.Select(k => new ApiKeyListItem
        {
            Id = k.Id,
            Name = k.Name,
            LastFourChars = k.LastFourChars,
            Status = k.Status,
            CreatedAt = k.CreatedAt,
            LastUsedAt = k.LastUsedAt,
            ExpiresAt = k.ExpiresAt
        }).ToList();

        return Ok(keyListItems);
    }

    // POST /api/v1/markets/{marketId}/api-keys - Generate new key
    [HttpPost]
    public ActionResult<ApiKeyCreationResponse> CreateApiKey(string marketId, [FromBody] CreateApiKeyRequest request)
    {
        // Check if market exists
        var market = _store.GetMarket(marketId);
        if (market == null)
        {
            return NotFound(new { error = "Market not found" });
        }

        // Validate required fields
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Name is required" });
        }

        // Validate expiration date if provided
        if (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTime.UtcNow)
        {
            return BadRequest(new { error = "Expiration date must be in the future" });
        }

        // Generate new API key
        var fullKey = MockDataStore.GenerateApiKey();
        var newApiKey = new ApiKey
        {
            Id = $"key-{DateTime.UtcNow.Ticks}",
            TenantId = market.TenantId,
            MarketId = marketId,
            Name = request.Name,
            KeyHash = MockDataStore.HashApiKey(fullKey),
            LastFourChars = MockDataStore.GetLastFourChars(fullKey),
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = request.ExpiresAt,
            CreatedBy = "current-user" // In production, get from auth
        };

        // Add to storage
        _store.AddApiKey(newApiKey);

        _logger.LogInformation("Created API key {KeyId} for market {MarketId}", newApiKey.Id, marketId);

        // Return the full key (only time it's shown)
        var response = new ApiKeyCreationResponse
        {
            Id = newApiKey.Id,
            Key = fullKey,
            Name = newApiKey.Name,
            MarketId = marketId,
            CreatedAt = newApiKey.CreatedAt
        };

        return CreatedAtAction(nameof(GetApiKeys), new { marketId }, response);
    }

    // DELETE /api/v1/markets/{marketId}/api-keys/{keyId} - Revoke key
    [HttpDelete("{keyId}")]
    public ActionResult<RevokeApiKeyResponse> RevokeApiKey(string marketId, string keyId)
    {
        // Check if market exists
        var market = _store.GetMarket(marketId);
        if (market == null)
        {
            return NotFound(new { error = "Market not found" });
        }

        // Find the key
        var apiKey = _store.GetApiKey(keyId);
        if (apiKey == null || apiKey.MarketId != marketId)
        {
            return NotFound(new { error = "API key not found" });
        }

        // Check if already revoked
        if (apiKey.Status == "revoked")
        {
            return BadRequest(new { error = "API key is already revoked" });
        }

        // Revoke the key
        _store.RevokeApiKey(keyId);

        _logger.LogInformation("Revoked API key {KeyId} for market {MarketId}", keyId, marketId);

        return Ok(new RevokeApiKeyResponse
        {
            Message = "API key revoked successfully"
        });
    }
}
