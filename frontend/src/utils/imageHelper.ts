/**
 * Image Helper Utilities
 *
 * Generates optimized image URLs with automatic resizing
 */

/**
 * Generate a resized image URL from an original image URL
 */
export function getResizedImageUrl(
  imageUrl: string | undefined | null,
  options: { width?: number; height?: number } = {}
): string {
  if (!imageUrl) {
    return '';
  }

  const { width, height } = options;

  // If no dimensions specified, return original URL
  if (!width && !height) {
    return imageUrl;
  }

  // Check if it's a local uploaded image (contains /uploads/)
  if (imageUrl.includes('/uploads/')) {
    // Extract tenant, market, and filename from URL
    // Format: http://localhost:5180/uploads/{tenantId}/{marketId}/{fileName}
    const parts = imageUrl.split('/uploads/');
    if (parts.length === 2) {
      const pathParts = parts[1].split('/');
      if (pathParts.length === 3) {
        const tenantId = pathParts[0];
        const marketId = pathParts[1];
        const fileName = pathParts[2];
        const baseUrl = parts[0];

        const queryParams: string[] = [];
        if (width) queryParams.push(`width=${width}`);
        if (height) queryParams.push(`height=${height}`);

        return `${baseUrl}/api/v1/files/resize/${tenantId}/${marketId}/${fileName}?${queryParams.join('&')}`;
      }
    }
  }

  // Return original URL if it's not a local uploaded image
  return imageUrl;
}

/**
 * Generate thumbnail URL (small size for lists and cards)
 */
export function getThumbnailUrl(imageUrl: string | undefined | null): string {
  return getResizedImageUrl(imageUrl, { width: 100, height: 100 });
}

/**
 * Generate small image URL (for product cards)
 */
export function getSmallImageUrl(imageUrl: string | undefined | null): string {
  return getResizedImageUrl(imageUrl, { width: 200, height: 200 });
}

/**
 * Generate medium-sized image URL
 */
export function getMediumImageUrl(imageUrl: string | undefined | null): string {
  return getResizedImageUrl(imageUrl, { width: 600, height: 600 });
}

/**
 * Generate large-sized image URL
 */
export function getLargeImageUrl(imageUrl: string | undefined | null): string {
  return getResizedImageUrl(imageUrl, { width: 1200, height: 1200 });
}
