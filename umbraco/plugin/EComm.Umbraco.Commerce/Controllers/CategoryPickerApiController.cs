using EComm.Umbraco.Commerce.Models;
using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
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
    private readonly IContentService _contentService;
    private readonly ICommerceSettingsService _settingsService;

    public CategoryPickerApiController(ICommerceApiClient apiClient, IContentService contentService, ICommerceSettingsService settingsService)
    {
        _apiClient = apiClient;
        _contentService = contentService;
        _settingsService = settingsService;
    }

    /// <summary>
    /// Gets all categories from the eCommerce API as a hierarchical tree
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(List<Category>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories([FromQuery] string? marketId = null)
    {
        var flatCategories = await _apiClient.GetCategoriesAsync(marketId);

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
    /// Gets the store-global option presets library (the "prefilled options"
    /// picked into product option blocks).
    /// </summary>
    [HttpGet("option-presets")]
    [ProducesResponseType(typeof(List<OptionPreset>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOptionPresets()
    {
        var presets = await _apiClient.GetOptionPresetsAsync();
        return Ok(presets);
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
    public async Task<IActionResult> GetProductsForCategory(string categoryId, [FromQuery] string? marketId = null)
    {
        var result = await _apiClient.GetProductsAsync(categoryId, page: 1, pageSize: 100, marketId);
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

    /// <summary>
    /// Deletes a product permanently (POST action avoids HTTP method routing issues)
    /// </summary>
    [HttpPost("products/{id}/delete")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest("Product ID is required");

        var success = await _apiClient.DeleteProductAsync(id);
        if (!success)
            return StatusCode(StatusCodes.Status500InternalServerError,
                $"Failed to delete product {id}. Check that the eCommerce API is running and the product exists.");

        return NoContent();
    }

    /// <summary>
    /// Gets products for a node by resolving the parent node's categoryId server-side (for product
    /// picker property editor). Takes the node's own key rather than trusting the client-side
    /// UmbDocumentWorkspaceContext.parentUnique, which is unreliable (umbraco/Umbraco-CMS#19213).
    /// </summary>
    [HttpGet("products-for-node/{nodeKey}")]
    [ProducesResponseType(typeof(ProductListResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductsForNode(Guid nodeKey)
    {
        var content = _contentService.GetById(nodeKey);
        if (content == null) return NotFound("Node not found");

        var parent = _contentService.GetParent(content);
        if (parent == null) return BadRequest("Node has no parent");

        var settings = await _settingsService.GetSettingsAsync();
        var categoryIdPropertyAlias = settings?.CategoryIdPropertyAlias ?? "categoryId";
        var storeIdPropertyAlias = settings?.StoreIdPropertyAlias ?? "storeId";

        var categoryId = GetValueAnyCulture(parent, categoryIdPropertyAlias);
        if (string.IsNullOrEmpty(categoryId))
            return BadRequest($"Parent node has no {categoryIdPropertyAlias} property");

        // Sibling store/market picker on the category node - same one products-workspace-view.js
        // and category-picker.js use - so the picker loads from whichever market the category
        // actually belongs to, instead of silently falling back to the global default market.
        var marketId = GetValueAnyCulture(parent, storeIdPropertyAlias);

        var result = await _apiClient.GetProductsAsync(categoryId, page: 1, pageSize: 100, marketId);
        return Ok(result);
    }

    /// <summary>
    /// Reads a property value regardless of whether the content type has culture variance
    /// turned on - it varies inconsistently across content types (e.g. trailerCategoryPage
    /// is variant, accessoriesCategoryPage is invariant), and GetValue(alias) alone only
    /// checks the invariant slot, silently missing variant values.
    /// </summary>
    private static string? GetValueAnyCulture(IContent content, string alias)
    {
        if (!content.Properties.Contains(alias)) return null;

        var property = content.Properties[alias];

        foreach (var propertyValue in property.Values)
        {
            if (propertyValue.EditedValue is string { Length: > 0 } value)
                return value;
        }

        return null;
    }

    /// <summary>
    /// Gets a single product by ID (for product page workspace view)
    /// </summary>
    [HttpGet("product/{productId}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProduct(string productId)
    {
        var product = await _apiClient.GetProductAsync(productId);
        if (product == null) return NotFound();
        return Ok(product);
    }

    /// <summary>
    /// Creates a new product
    /// </summary>
    [HttpPost("products")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        if (request == null)
            return BadRequest("Product data is required");

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Product name is required");

        var hasVariants = request.HasVariants ?? false;

        if (!hasVariants && string.IsNullOrWhiteSpace(request.Sku))
            return BadRequest("SKU is required");

        if (!hasVariants && (request.Price == null || request.Price < 0))
            return BadRequest("Valid price is required");

        var product = new Product
        {
            Name = request.Name,
            Sku = request.Sku,
            Price = request.Price ?? 0,
            SalePrice = request.SalePrice,
            StockQuantity = request.StockQuantity ?? 0,
            Status = request.Status ?? "active",
            Description = request.Description,
            CategoryId = request.CategoryId,
            HasVariants = hasVariants,
            VariantOptions = request.VariantOptions,
            Variants = request.Variants,
            VersionCreatedBy = request.VersionCreatedBy ?? "system",
            Images = request.Images ?? new List<string>(),
            Highlights = request.Highlights ?? new List<string>(),
            LeasingFactor = request.LeasingFactor,
            HidePrice = request.HidePrice ?? false,
            HiddenPriceDescription = request.HiddenPriceDescription,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
        };

        var created = await _apiClient.CreateProductAsync(product);
        if (created == null)
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to create product. Check that the eCommerce API is running.");

        return StatusCode(StatusCodes.Status201Created, created);
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

/// <summary>
/// DTO for product creation — all nullable to avoid implicit [Required] from NRT + [ApiController]
/// </summary>
public class CreateProductRequest
{
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public decimal? Price { get; set; }
    public int? StockQuantity { get; set; }
    public string? Status { get; set; }
    public string? Description { get; set; }
    public string? CategoryId { get; set; }
    public string? VersionCreatedBy { get; set; }
    public List<string>? Images { get; set; }
    public bool? HasVariants { get; set; }
    public List<VariantOption>? VariantOptions { get; set; }
    public List<ProductVariant>? Variants { get; set; }
    public decimal? SalePrice { get; set; }
    public List<string>? Highlights { get; set; }
    public decimal? LeasingFactor { get; set; }
    public bool? HidePrice { get; set; }
    public string? HiddenPriceDescription { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}
