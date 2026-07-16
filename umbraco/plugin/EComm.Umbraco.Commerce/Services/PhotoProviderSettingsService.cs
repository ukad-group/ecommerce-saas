using System.Security.Cryptography;
using EComm.Umbraco.Commerce.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Services;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Stores photo-provider settings in Umbraco's key-value store.
/// The connection string is encrypted at rest with ASP.NET Data Protection and is
/// never logged or returned to callers of <see cref="GetPublicSettings"/>.
/// </summary>
// ponytail: concrete class, no interface — single impl; the pluggable seam is IPhotoStorageProvider
public class PhotoProviderSettingsService
{
    private const string KeyPrefix = "EComm.Commerce.PhotoProvider.";
    private const string ProtectorPurpose = "EComm.Umbraco.Commerce.PhotoProvider.v1";

    private readonly IKeyValueService _keyValueService;
    private readonly IDataProtector _protector;
    private readonly ILogger<PhotoProviderSettingsService> _logger;

    public PhotoProviderSettingsService(
        IKeyValueService keyValueService,
        IDataProtectionProvider dataProtectionProvider,
        ILogger<PhotoProviderSettingsService> logger)
    {
        _keyValueService = keyValueService;
        _protector = dataProtectionProvider.CreateProtector(ProtectorPurpose);
        _logger = logger;
    }

    /// <summary>Settings with the decrypted connection string — for provider calls only, never for API responses.</summary>
    public PhotoProviderSettings? GetSettings()
    {
        var providerKey = _keyValueService.GetValue($"{KeyPrefix}Key");
        if (string.IsNullOrEmpty(providerKey))
        {
            return null;
        }

        var protectedConnectionString = _keyValueService.GetValue($"{KeyPrefix}ConnectionString");
        string? connectionString = null;
        if (!string.IsNullOrEmpty(protectedConnectionString))
        {
            try
            {
                connectionString = _protector.Unprotect(protectedConnectionString);
            }
            catch (CryptographicException ex)
            {
                // Key ring changed (e.g. container rebuilt) — treat as unconfigured, admin re-enters credentials
                _logger.LogWarning(ex, "Stored photo-provider connection string can no longer be decrypted; credentials must be re-entered");
                return null;
            }
        }

        return new PhotoProviderSettings
        {
            ProviderKey = providerKey,
            ConnectionString = connectionString,
            ContainerName = _keyValueService.GetValue($"{KeyPrefix}ContainerName") ?? string.Empty,
        };
    }

    public PhotoProviderSettingsDto GetPublicSettings()
    {
        var settings = GetSettings();
        return new PhotoProviderSettingsDto
        {
            ProviderKey = settings?.ProviderKey,
            ContainerName = settings?.ContainerName ?? string.Empty,
            ConnectionStringSet = !string.IsNullOrEmpty(settings?.ConnectionString),
        };
    }

    public void SaveSettings(PhotoProviderSettings settings)
    {
        if (string.IsNullOrEmpty(settings.ProviderKey) || settings.ProviderKey == "none")
        {
            _keyValueService.SetValue($"{KeyPrefix}Key", string.Empty);
            _keyValueService.SetValue($"{KeyPrefix}ContainerName", string.Empty);
            _keyValueService.SetValue($"{KeyPrefix}ConnectionString", string.Empty);
            _logger.LogInformation("Photo provider disabled");
            return;
        }

        _keyValueService.SetValue($"{KeyPrefix}Key", settings.ProviderKey);
        _keyValueService.SetValue($"{KeyPrefix}ContainerName", settings.ContainerName);

        // Empty incoming connection string means "keep the stored one"
        if (!string.IsNullOrEmpty(settings.ConnectionString))
        {
            _keyValueService.SetValue($"{KeyPrefix}ConnectionString", _protector.Protect(settings.ConnectionString));
        }

        _logger.LogInformation("Photo provider settings saved (provider: {ProviderKey})", settings.ProviderKey);
    }
}
