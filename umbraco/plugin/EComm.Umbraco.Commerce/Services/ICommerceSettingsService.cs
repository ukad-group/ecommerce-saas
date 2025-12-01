using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Service for managing eCommerce connection settings
/// </summary>
public interface ICommerceSettingsService
{
    /// <summary>
    /// Gets the current commerce settings
    /// </summary>
    Task<CommerceSettings?> GetSettingsAsync();

    /// <summary>
    /// Saves commerce settings to the database
    /// </summary>
    Task SaveSettingsAsync(CommerceSettings settings);

    /// <summary>
    /// Tests the connection to the eCommerce API
    /// </summary>
    Task<ConnectionTestResult> TestConnectionAsync(CommerceSettings settings);
}

public class ConnectionTestResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? TenantName { get; set; }
    public List<MarketInfo>? Markets { get; set; }
}

public class MarketInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
