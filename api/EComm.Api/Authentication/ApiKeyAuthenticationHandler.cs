using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using EComm.Data;

namespace EComm.Api.Authentication;

/// <summary>
/// Custom authentication handler for API Key authentication
/// Validates X-API-Key header and creates claims principal
/// </summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly ECommDbContext _context;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ECommDbContext context)
        : base(options, logger, encoder)
    {
        _context = context;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check if X-API-Key header exists
        if (!Request.Headers.ContainsKey("X-API-Key"))
        {
            return AuthenticateResult.NoResult();
        }

        string apiKey = Request.Headers["X-API-Key"].ToString();

        if (string.IsNullOrEmpty(apiKey))
        {
            return AuthenticateResult.NoResult();
        }

        // Validate API key against database
        // In production, use proper hashing. For MVP, we'll use simple string comparison
        // Fetch all active keys and validate in memory (EF Core can't translate ValidateKey method)
        var activeKeys = await _context.ApiKeys
            .Where(k => k.Status == "active")
            .ToListAsync();

        var validKey = activeKeys.FirstOrDefault(k => ValidateKey(k.KeyHash, apiKey));

        if (validKey == null)
        {
            return AuthenticateResult.Fail("Invalid API key");
        }

        // Update last used timestamp
        validKey.LastUsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Create claims identity with API key information
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, validKey.Id),
            new Claim(ClaimTypes.Name, validKey.Name),
            new Claim("AuthType", "ApiKey"),
            new Claim("TenantId", validKey.TenantId),
            new Claim("MarketId", validKey.MarketId),
            new Claim("ApiKeyId", validKey.Id)
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }

    /// <summary>
    /// Validates the provided API key against the stored hash
    /// Supports both seed format (hash_of_<key>) and SHA256 hashed keys
    /// </summary>
    private bool ValidateKey(string storedKeyHash, string providedKey)
    {
        // Check seed format first (for backwards compatibility)
        if (storedKeyHash.StartsWith("hash_of_"))
        {
            string expectedKey = storedKeyHash.Substring("hash_of_".Length);
            return expectedKey == providedKey;
        }

        // Check SHA256 hash (for keys created through admin UI)
        string providedKeyHash = HashApiKey(providedKey);
        return storedKeyHash.Equals(providedKeyHash, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Hash API key using SHA256 (matches DataStore.HashApiKey)
    /// </summary>
    private string HashApiKey(string key)
    {
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(key));
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }
    }
}

/// <summary>
/// Authentication scheme constants
/// </summary>
public static class ApiKeyAuthenticationDefaults
{
    public const string AuthenticationScheme = "ApiKey";
}
