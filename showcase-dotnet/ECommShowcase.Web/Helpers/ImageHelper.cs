namespace ECommShowcase.Web.Helpers;

/// <summary>
/// Helper class for generating responsive image URLs with resizing support
/// </summary>
public static class ImageHelper
{
    /// <summary>
    /// Generate a resized image URL from an original image URL
    /// </summary>
    /// <param name="imageUrl">Original image URL</param>
    /// <param name="width">Maximum width</param>
    /// <param name="height">Maximum height</param>
    /// <returns>Resized image URL</returns>
    public static string GetResizedUrl(string imageUrl, int? width = null, int? height = null)
    {
        if (string.IsNullOrEmpty(imageUrl) || (!width.HasValue && !height.HasValue))
        {
            return imageUrl;
        }

        // Check if it's a local uploaded image (starts with http://localhost:5180/uploads/)
        if (imageUrl.Contains("/uploads/"))
        {
            // Extract tenant, market, and filename from URL
            // Format: http://localhost:5180/uploads/{tenantId}/{marketId}/{fileName}
            var parts = imageUrl.Split("/uploads/");
            if (parts.Length == 2)
            {
                var pathParts = parts[1].Split('/');
                if (pathParts.Length == 3)
                {
                    var tenantId = pathParts[0];
                    var marketId = pathParts[1];
                    var fileName = pathParts[2];
                    var baseUrl = parts[0];

                    var queryParams = new List<string>();
                    if (width.HasValue) queryParams.Add($"width={width.Value}");
                    if (height.HasValue) queryParams.Add($"height={height.Value}");

                    return $"{baseUrl}/api/v1/files/resize/{tenantId}/{marketId}/{fileName}?{string.Join("&", queryParams)}";
                }
            }
        }

        // Return original URL if it's not a local uploaded image
        return imageUrl;
    }

    /// <summary>
    /// Generate thumbnail URL (small size for gallery)
    /// </summary>
    public static string GetThumbnailUrl(string imageUrl)
    {
        return GetResizedUrl(imageUrl, width: 150, height: 150);
    }

    /// <summary>
    /// Generate medium-sized image URL
    /// </summary>
    public static string GetMediumUrl(string imageUrl)
    {
        return GetResizedUrl(imageUrl, width: 600, height: 600);
    }

    /// <summary>
    /// Generate large-sized image URL
    /// </summary>
    public static string GetLargeUrl(string imageUrl)
    {
        return GetResizedUrl(imageUrl, width: 1200, height: 1200);
    }
}
