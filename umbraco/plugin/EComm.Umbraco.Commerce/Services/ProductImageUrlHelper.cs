using System.Globalization;
using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Builds the storefront image URL for a product image, applying the globally configured crop
/// (Settings → Commerce Settings → Images) + the image's focal point at render time. Because the
/// crop is applied on read (not baked into storage), changing the crop setting updates every
/// product image with no re-save.
/// </summary>
public interface IProductImageUrlHelper
{
    /// <summary>Crop-and-focal-point URL for a product image (empty string if the image is null/blank).</summary>
    string CropUrl(ProductImage? image);
}

public class ProductImageUrlHelper : IProductImageUrlHelper
{
    private readonly ICommerceSettingsService _settingsService;
    private ImageCropPreset? _crop;
    private bool _loaded;

    public ProductImageUrlHelper(ICommerceSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    public string CropUrl(ProductImage? image)
    {
        if (image is null || string.IsNullOrEmpty(image.Url))
        {
            return string.Empty;
        }

        var crop = GetCrop();

        // No crop configured, or this isn't an Umbraco library image (external URLs can't be
        // processed by ImageSharp) → return as-is.
        if (crop is null || crop.Width <= 0 || crop.Height <= 0 || string.IsNullOrEmpty(image.MediaKey))
        {
            return image.Url;
        }

        // Strip any existing querystring (e.g. a legacy baked crop) and apply the CURRENT crop, so
        // changing the setting always wins and we never double-append params.
        var qIndex = image.Url.IndexOf('?');
        var baseUrl = qIndex >= 0 ? image.Url[..qIndex] : image.Url;

        var rxy = image.FocalPoint is null
            ? string.Empty
            : $"&rxy={image.FocalPoint.Left.ToString(CultureInfo.InvariantCulture)}," +
              $"{image.FocalPoint.Top.ToString(CultureInfo.InvariantCulture)}";

        return $"{baseUrl}?width={crop.Width}&height={crop.Height}&rmode=crop{rxy}";
    }

    // Settings reads are synchronous under the hood (IKeyValueService); cache per request/instance.
    private ImageCropPreset? GetCrop()
    {
        if (_loaded)
        {
            return _crop;
        }

        _crop = _settingsService.GetSettingsAsync().GetAwaiter().GetResult()?.ProductImageCrop;
        _loaded = true;
        return _crop;
    }
}
