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
    public async Task<IActionResult> GetOptionPresets([FromQuery] string? marketId = null)
    {
        var presets = await _apiClient.GetOptionPresetsAsync(marketId);
        return Ok(presets);
    }

    // NOTE: GET "attributes" / "attribute-presets" are served by CommerceAdminApiController
    // (same ecomm-commerce route group). Do NOT redeclare them here — duplicate routes cause an
    // AmbiguousMatchException (500) on every GET. The workspace view calls the same URLs.

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
    /// Creates a new category (for the category picker's inline "create" popup).
    /// </summary>
    [HttpPost("categories")]
    [ProducesResponseType(typeof(Category), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Category name is required");

        var category = new Category
        {
            Name = request.Name,
            ParentId = string.IsNullOrWhiteSpace(request.ParentId) ? null : request.ParentId,
        };

        var created = await _apiClient.CreateCategoryAsync(category, request.MarketId);
        if (created == null)
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to create category. Check that the eCommerce API is running.");

        return StatusCode(StatusCodes.Status201Created, created);
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

        // Sibling store/market picker on the category node, falling back up the ancestor chain -
        // same lookup category-picker.js and products-workspace-view.js use via effective-store -
        // so the picker loads from whichever market the category (or one of its ancestors) belongs
        // to, instead of silently falling back to the global default market.
        var marketId = GetValueWithAncestorFallback(parent, storeIdPropertyAlias);

        var result = await _apiClient.GetProductsAsync(categoryId, page: 1, pageSize: 100, marketId);
        // Return the resolved categoryId/marketId alongside the products so the picker can send
        // them back verbatim when creating a product — avoids re-resolving from the node key at
        // create time (which drifts: ctx.unique is unreliable, umbraco/Umbraco-CMS#19213) and
        // guarantees a created product lands in exactly the category/market the list came from.
        return Ok(new { categoryId, marketId, products = result.Products, totalCount = result.TotalCount });
    }

    /// <summary>
    /// Resolves the effective store/market for a node by walking up to the nearest ancestor
    /// (or itself) with a non-empty storeId. Lets backoffice pickers (category-picker.js,
    /// products-workspace-view.js) on a node with no store of its own inherit whichever
    /// ancestor - e.g. the shop root - has one set.
    /// </summary>
    [HttpGet("nodes/{nodeKey}/effective-store")]
    [ProducesResponseType(typeof(EffectiveStoreDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEffectiveStore(Guid nodeKey)
    {
        var content = _contentService.GetById(nodeKey);
        if (content == null) return NotFound("Node not found");

        var settings = await _settingsService.GetSettingsAsync();
        var storeIdPropertyAlias = settings?.StoreIdPropertyAlias ?? "storeId";

        return Ok(new EffectiveStoreDto { StoreId = GetValueWithAncestorFallback(content, storeIdPropertyAlias) });
    }

    /// <summary>
    /// Walks self-then-ancestors for the first non-empty value of the given alias - lets a
    /// single storeId set higher in the tree (e.g. on the shop root) scope every descendant
    /// category/product instead of requiring it on every node.
    /// </summary>
    private string? GetValueWithAncestorFallback(IContent? content, string alias)
    {
        while (content != null)
        {
            var value = GetValueAnyCulture(content, alias);
            if (!string.IsNullOrEmpty(value)) return value;
            content = _contentService.GetParent(content);
        }

        return null;
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

        // When the product picker posts its node key, resolve categoryId + market from the
        // parent node the same way products-for-node does, so "create" and "list" always
        // agree (a category whose storeId differs from the global default market would
        // otherwise create the product in a market the picker never lists).
        // Prefer the categoryId/marketId the picker captured from products-for-node (the exact
        // context the visible product list came from). Only re-resolve from the node key as a
        // fallback — that path drifts because ctx.unique is unreliable (umbraco/Umbraco-CMS#19213).
        var categoryId = request.CategoryId;
        var marketId = request.MarketId;
        if (string.IsNullOrEmpty(categoryId) && request.NodeKey.HasValue)
        {
            var content = _contentService.GetById(request.NodeKey.Value);
            var parent = content == null ? null : _contentService.GetParent(content);
            if (parent != null)
            {
                var settings = await _settingsService.GetSettingsAsync();
                categoryId = GetValueAnyCulture(parent, settings?.CategoryIdPropertyAlias ?? "categoryId");
                marketId ??= GetValueWithAncestorFallback(parent, settings?.StoreIdPropertyAlias ?? "storeId");
            }
        }

        var product = new Product
        {
            Name = request.Name,
            Sku = request.Sku,
            Price = request.Price ?? 0,
            SalePrice = request.SalePrice,
            StockQuantity = request.StockQuantity ?? 0,
            Status = request.Status ?? "active",
            Description = request.Description,
            // Populate the CategoryIds collection (not just the legacy singular CategoryId): the
            // API filters the product list by CategoryIds, and because the DTO serializes
            // categoryId before categoryIds[], a trailing empty categoryIds[] would otherwise wipe
            // the value the categoryId setter added on the API side — leaving the product unlisted.
            CategoryIds = string.IsNullOrEmpty(categoryId) ? new List<string>() : new List<string> { categoryId },
            HasVariants = hasVariants,
            VariantOptions = request.VariantOptions,
            Variants = request.Variants,
            VersionCreatedBy = request.VersionCreatedBy ?? "system",
            Images = request.Images ?? new List<ProductImage>(),
            Highlights = request.Highlights ?? new List<string>(),
            LeasingFactor = request.LeasingFactor,
            HidePrice = request.HidePrice ?? false,
            HiddenPriceDescription = request.HiddenPriceDescription,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
        };

        var created = await _apiClient.CreateProductAsync(product, marketId);
        if (created == null)
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to create product. Check that the eCommerce API is running.");

        return StatusCode(StatusCodes.Status201Created, created);
    }
}

/// <summary>
/// DTO for the effective-store lookup
/// </summary>
public class EffectiveStoreDto
{
    public string? StoreId { get; set; }
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
/// DTO for category creation from the picker's inline create popup.
/// </summary>
public class CreateCategoryRequest
{
    public string? Name { get; set; }
    public string? ParentId { get; set; }
    /// <summary>Market the picker resolved (storeId) — the category is created in this market.</summary>
    public string? MarketId { get; set; }
}

/// <summary>
/// DTO for product creation — all nullable to avoid implicit [Required] from NRT + [ApiController]
/// </summary>
public class CreateProductRequest
{
    public string? Name { get; set; }
    public string? Sku { get; set; }
    /// <summary>categoryId the picker captured from products-for-node — used verbatim so the created product lands in the listed category.</summary>
    public string? MarketId { get; set; }
    /// <summary>Picker's own node key — fallback to resolve categoryId + market server-side when not supplied explicitly.</summary>
    public Guid? NodeKey { get; set; }
    public decimal? Price { get; set; }
    public int? StockQuantity { get; set; }
    public string? Status { get; set; }
    public string? Description { get; set; }
    public string? CategoryId { get; set; }
    public string? VersionCreatedBy { get; set; }
    public List<ProductImage>? Images { get; set; }
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
