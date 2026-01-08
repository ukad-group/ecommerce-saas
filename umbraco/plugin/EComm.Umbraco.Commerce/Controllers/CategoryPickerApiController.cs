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

    /// <summary>
    /// Updates a product (creates new version)
    /// </summary>
    [HttpPut("products/{id}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] UpdateProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest("Product ID is required");
        }

        if (request?.Product == null)
        {
            return BadRequest("Product data is required");
        }

        // Basic validation
        if (string.IsNullOrWhiteSpace(request.Product.Name))
        {
            return BadRequest("Product name is required");
        }

        // For products with variants, skip master product price/stock validation
        if (!request.Product.HasVariants)
        {
            if (request.Product.Price == null || request.Product.Price < 0)
            {
                return BadRequest("Valid price is required");
            }

            if (request.Product.StockQuantity == null || request.Product.StockQuantity < 0)
            {
                return BadRequest("Stock quantity must be 0 or greater");
            }
        }
        else
        {
            // Validate variants if product has them
            if (request.Product.Variants != null && request.Product.Variants.Any())
            {
                foreach (var variant in request.Product.Variants)
                {
                    if (variant.Price < 0)
                    {
                        return BadRequest($"Variant {variant.Sku}: Valid price is required");
                    }

                    if (variant.StockQuantity < 0)
                    {
                        return BadRequest($"Variant {variant.Sku}: Stock quantity must be 0 or greater");
                    }
                }
            }
        }

        // Extract user ID from product for version tracking
        var userId = request.Product.VersionCreatedBy ?? "system";

        var updated = await _apiClient.UpdateProductAsync(id, request.Product, userId, request.ChangeNotes);

        if (updated == null)
        {
            return NotFound($"Product {id} not found or update failed");
        }

        return Ok(updated);
    }
}

/// <summary>
/// DTO for product update requests
/// </summary>
public class UpdateProductRequest
{
    public Product Product { get; set; } = null!;
    public string? ChangeNotes { get; set; }
}
