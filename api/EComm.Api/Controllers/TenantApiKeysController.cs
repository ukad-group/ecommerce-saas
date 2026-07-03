using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.ApiKey;
using EComm.Api.DTOs.Requests.ApiKeys;
using EComm.Api.DTOs.Responses.ApiKeys;

namespace EComm.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin/tenants/{tenantId}/api-keys")]
public class TenantApiKeysController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;
    private readonly ILogger<TenantApiKeysController> _logger;

    public TenantApiKeysController(ILogger<TenantApiKeysController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public ActionResult GetApiKeys(string tenantId)
    {
        var tenant = _store.GetTenant(tenantId);
        if (tenant == null) return NotFound(new { error = "Tenant not found" });

        var keys = _store.GetTenantLevelApiKeys(tenantId).Select(k => new ApiKeyListItem
        {
            Id = k.Id,
            Name = k.Name,
            LastFourChars = k.LastFourChars,
            Status = k.Status,
            CreatedAt = k.CreatedAt,
            LastUsedAt = k.LastUsedAt,
            ExpiresAt = k.ExpiresAt
        }).ToList();

        return Ok(keys);
    }

    [HttpPost]
    public ActionResult CreateApiKey(string tenantId, [FromBody] CreateApiKeyRequest request)
    {
        var tenant = _store.GetTenant(tenantId);
        if (tenant == null) return NotFound(new { error = "Tenant not found" });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required" });

        if (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTime.UtcNow)
            return BadRequest(new { error = "Expiration date must be in the future" });

        var fullKey = DataStore.GenerateApiKey();
        var newKey = new ApiKey
        {
            Id = $"key-{DateTime.UtcNow.Ticks}",
            TenantId = tenantId,
            MarketId = "",  // empty = tenant-level key
            Name = request.Name,
            KeyHash = DataStore.HashApiKey(fullKey),
            LastFourChars = DataStore.GetLastFourChars(fullKey),
            Status = "active",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = request.ExpiresAt,
            CreatedBy = "current-user"
        };

        _store.AddApiKey(newKey);
        _logger.LogInformation("Created tenant-level API key {KeyId} for tenant {TenantId}", newKey.Id, tenantId);

        return CreatedAtAction(nameof(GetApiKeys), new { tenantId }, new ApiKeyCreationResponse
        {
            Id = newKey.Id,
            Key = fullKey,
            Name = newKey.Name,
            MarketId = "",
            CreatedAt = newKey.CreatedAt
        });
    }

    [HttpDelete("{keyId}")]
    public ActionResult RevokeApiKey(string tenantId, string keyId)
    {
        var tenant = _store.GetTenant(tenantId);
        if (tenant == null) return NotFound(new { error = "Tenant not found" });

        var apiKey = _store.GetApiKey(keyId);
        if (apiKey == null || apiKey.TenantId != tenantId || !string.IsNullOrEmpty(apiKey.MarketId))
            return NotFound(new { error = "API key not found" });

        if (apiKey.Status == "revoked")
            return BadRequest(new { error = "API key is already revoked" });

        _store.RevokeApiKey(keyId);
        _logger.LogInformation("Revoked tenant-level API key {KeyId} for tenant {TenantId}", keyId, tenantId);

        return Ok(new RevokeApiKeyResponse { Message = "API key revoked successfully" });
    }
}
