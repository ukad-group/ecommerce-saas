using EComm.Umbraco.Commerce.Models;
using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Web.Common.Authorization;

namespace EComm.Umbraco.Commerce.Controllers;

/// <summary>
/// API controller for category picker property editor
/// </summary>
[ApiController]
[MapToApi("ecomm-commerce")]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
[Route("api/v1/commerce/categories")]
public class CategoryPickerApiController : ControllerBase
{
    private readonly ICommerceApiClient _apiClient;

    public CategoryPickerApiController(ICommerceApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    /// <summary>
    /// Gets all categories from the eCommerce API
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<Category>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _apiClient.GetCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>
    /// Gets a specific category by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Category), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCategory(string id)
    {
        var category = await _apiClient.GetCategoryAsync(id);

        if (category == null)
        {
            return NotFound();
        }

        return Ok(category);
    }
}
