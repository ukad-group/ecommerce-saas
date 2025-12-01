namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Configuration settings for connecting to the eCommerce API.
/// Stored in Umbraco's key-value store.
/// </summary>
public class CommerceSettings
{
    /// <summary>
    /// Base URL of the eCommerce API (e.g., "https://api.yourplatform.com/api/v1")
    /// </summary>
    public string ApiBaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Tenant ID for multi-tenant isolation
    /// </summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Market ID for market-specific catalog
    /// </summary>
    public string MarketId { get; set; } = string.Empty;

    /// <summary>
    /// API key for authentication
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Validates that all required settings are configured
    /// </summary>
    public bool IsValid =>
        !string.IsNullOrWhiteSpace(ApiBaseUrl) &&
        !string.IsNullOrWhiteSpace(TenantId) &&
        !string.IsNullOrWhiteSpace(MarketId);
}
