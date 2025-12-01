using EComm.Umbraco.Commerce.Models;
using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Web.Common.Authorization;

namespace EComm.Umbraco.Commerce.Controllers;

/// <summary>
/// API controller for managing eCommerce settings in the backoffice
/// </summary>
[ApiController]
[MapToApi("ecomm-commerce")]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
[Route("api/v1/commerce/settings")]
public class CommerceSettingsApiController : ControllerBase
{
    private readonly ICommerceSettingsService _settingsService;

    public CommerceSettingsApiController(ICommerceSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    /// <summary>
    /// Gets the current commerce settings
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(CommerceSettings), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _settingsService.GetSettingsAsync();
        return Ok(settings ?? new CommerceSettings());
    }

    /// <summary>
    /// Saves commerce settings
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveSettings([FromBody] CommerceSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiBaseUrl))
        {
            return BadRequest("API Base URL is required");
        }

        await _settingsService.SaveSettingsAsync(settings);
        return Ok(new { message = "Settings saved successfully" });
    }

    /// <summary>
    /// Tests the connection to the eCommerce API
    /// </summary>
    [HttpPost("test")]
    [ProducesResponseType(typeof(ConnectionTestResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> TestConnection([FromBody] CommerceSettings settings)
    {
        var result = await _settingsService.TestConnectionAsync(settings);
        return Ok(result);
    }
}
