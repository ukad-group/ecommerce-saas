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
/// API controller for category picker property editor
/// </summary>
[ApiController]
[MapToApi("ecomm-commerce")]
[Route("umbraco/management/api/ecomm-commerce")]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class CategoryPickerApiController : ManagementApiControllerBase
{
    private readonly ICommerceApiClient _apiClient;

    public CategoryPickerApiController(ICommerceApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    /// <summary>
    /// Gets all categories from the eCommerce API as a hierarchical tree
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(List<Category>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories()
    {
        var flatCategories = await _apiClient.GetCategoriesAsync();

        // Build hierarchical tree structure
        var categoryTree = BuildCategoryTree(flatCategories);

        return Ok(categoryTree);
    }

    /// <summary>
    /// Converts flat category list to hierarchical tree structure
    /// </summary>
    private List<Category> BuildCategoryTree(List<Category> flatCategories)
    {
        // Clear children collections to avoid accumulation from cached objects
        foreach (var category in flatCategories)
        {
            category.Children.Clear();
        }

        var lookup = flatCategories.ToDictionary(c => c.Id);
        var rootCategories = new List<Category>();

        foreach (var category in flatCategories)
        {
            if (string.IsNullOrEmpty(category.ParentId))
            {
                // Root level category
                rootCategories.Add(category);
            }
            else if (lookup.TryGetValue(category.ParentId, out var parent))
            {
                // Add to parent's children
                parent.Children.Add(category);
            }
        }

        return rootCategories.OrderBy(c => c.DisplayOrder).ToList();
    }

    /// <summary>
    /// Gets a specific category by ID
    /// </summary>
    [HttpGet("categories/{id}")]
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

    /// <summary>
    /// Gets products for a specific category (for workspace view)
    /// </summary>
    [HttpGet("products/{categoryId}")]
    [ProducesResponseType(typeof(ProductListResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductsForCategory(string categoryId)
    {
        var result = await _apiClient.GetProductsAsync(categoryId, page: 1, pageSize: 100);
        return Ok(result);
    }
}
