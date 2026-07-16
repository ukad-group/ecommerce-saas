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
    /// Document type alias for category nodes (default: "categoryPage")
    /// </summary>
    public string CategoryPageAlias { get; set; } = "categoryPage";

    /// <summary>
    /// Comma-separated document type aliases for product nodes (default: "productPage")
    /// </summary>
    public string ProductPageAliases { get; set; } = "productPage";

    /// <summary>
    /// Parsed, trimmed list of <see cref="ProductPageAliases"/>
    /// </summary>
    public string[] ProductPageAliasList =>
        ProductPageAliases.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    /// <summary>
    /// Property alias for storing category ID on category nodes (default: "categoryId")
    /// </summary>
    public string CategoryIdPropertyAlias { get; set; } = "categoryId";

    /// <summary>
    /// Property alias for the store/market picker sibling property on category nodes
    /// (default: "storeId") - drives which market categories/products are fetched from.
    /// </summary>
    public string StoreIdPropertyAlias { get; set; } = "storeId";

    /// <summary>
    /// Property alias for storing the selected product ID on product pages (default: "productId")
    /// </summary>
    public string ProductIdPropertyAlias { get; set; } = "productId";

    /// <summary>
    /// Whether the product image editor exposes Umbraco's focal-point picker (default: true).
    /// Passed to the native &lt;umb-input-rich-media&gt; element as focalPointEnabled.
    /// </summary>
    public bool EnableFocalPoint { get; set; } = true;

    /// <summary>
    /// The single crop preset applied to every product image added via the media picker
    /// (null = no crop). Passed to the native editor as the one entry in preselectedCrops.
    /// </summary>
    public ImageCropPreset? ProductImageCrop { get; set; }

    /// <summary>
    /// Validates that all required settings are configured
    /// </summary>
    public bool IsValid =>
        !string.IsNullOrWhiteSpace(ApiBaseUrl) &&
        !string.IsNullOrWhiteSpace(TenantId);
}

/// <summary>
/// A crop preset (alias + target dimensions), matching Umbraco's UmbCropModel.
/// </summary>
public class ImageCropPreset
{
    public string Alias { get; set; } = "product";
    public string? Label { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}
