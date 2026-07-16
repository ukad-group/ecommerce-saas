using EComm.Umbraco.Commerce.Models;
using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Web.Common.Authorization;

namespace EComm.Umbraco.Commerce.Controllers;

/// <summary>
/// Backoffice API for configuring and browsing the external photo provider
/// </summary>
[ApiController]
[MapToApi("ecomm-commerce")]
[Route("umbraco/management/api/ecomm-commerce")]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class PhotoProviderApiController : ManagementApiControllerBase
{
    private readonly PhotoProviderSettingsService _settingsService;
    private readonly IEnumerable<IPhotoStorageProvider> _providers;

    public PhotoProviderApiController(
        PhotoProviderSettingsService settingsService,
        IEnumerable<IPhotoStorageProvider> providers)
    {
        _settingsService = settingsService;
        _providers = providers;
    }

    [HttpGet("photo-provider/settings")]
    [ProducesResponseType(typeof(PhotoProviderSettingsDto), StatusCodes.Status200OK)]
    public IActionResult GetSettings() => Ok(_settingsService.GetPublicSettings());

    [HttpPost("photo-provider/settings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult SaveSettings([FromBody] PhotoProviderSettings settings)
    {
        if (!string.IsNullOrEmpty(settings.ProviderKey) && settings.ProviderKey != "none")
        {
            if (ResolveProvider(settings.ProviderKey) is null)
            {
                return BadRequest($"Unknown provider '{settings.ProviderKey}'");
            }
            if (string.IsNullOrWhiteSpace(settings.ContainerName))
            {
                return BadRequest("Container name is required");
            }
            if (string.IsNullOrEmpty(settings.ConnectionString)
                && string.IsNullOrEmpty(_settingsService.GetSettings()?.ConnectionString))
            {
                return BadRequest("Connection string is required");
            }
        }

        _settingsService.SaveSettings(settings);
        return Ok(new { message = "Photo provider settings saved" });
    }

    [HttpPost("photo-provider/test")]
    [ProducesResponseType(typeof(PhotoTestResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> TestConnection([FromBody] PhotoProviderSettings settings)
    {
        var provider = ResolveProvider(settings.ProviderKey);
        if (provider is null)
        {
            return Ok(new PhotoTestResult { Success = false, Message = "No provider selected" });
        }

        // Blank connection string falls back to the stored one, so the admin can re-test saved settings
        if (string.IsNullOrEmpty(settings.ConnectionString))
        {
            settings.ConnectionString = _settingsService.GetSettings()?.ConnectionString;
        }
        if (string.IsNullOrEmpty(settings.ConnectionString))
        {
            return Ok(new PhotoTestResult { Success = false, Message = "No connection string provided or stored" });
        }

        return Ok(await provider.TestConnectionAsync(settings));
    }

    [HttpGet("photo-provider/photos")]
    [ProducesResponseType(typeof(PhotoPage), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetPhotos([FromQuery] string? continuationToken = null, [FromQuery] int pageSize = 24)
    {
        var (provider, settings, error) = ResolveActive();
        if (provider is null || settings is null)
        {
            return BadRequest(error);
        }

        return Ok(await provider.ListPhotosAsync(settings, continuationToken, Math.Clamp(pageSize, 1, 100)));
    }

    [HttpPost("photo-provider/upload")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("No file provided");
        }
        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only image files are allowed");
        }

        var (provider, settings, error) = ResolveActive();
        if (provider is null || settings is null)
        {
            return BadRequest(error);
        }

        await using var stream = file.OpenReadStream();
        var url = await provider.UploadAsync(settings, stream, Path.GetFileName(file.FileName), file.ContentType);
        return Ok(new { url });
    }

    private IPhotoStorageProvider? ResolveProvider(string? key)
        => _providers.FirstOrDefault(p => p.Key == key);

    private (IPhotoStorageProvider? Provider, PhotoProviderSettings? Settings, string Error) ResolveActive()
    {
        var settings = _settingsService.GetSettings();
        if (settings is null || string.IsNullOrEmpty(settings.ConnectionString))
        {
            return (null, null, "No photo provider is configured");
        }

        var provider = ResolveProvider(settings.ProviderKey);
        return provider is null
            ? (null, null, $"Configured provider '{settings.ProviderKey}' is not available")
            : (provider, settings, string.Empty);
    }
}
