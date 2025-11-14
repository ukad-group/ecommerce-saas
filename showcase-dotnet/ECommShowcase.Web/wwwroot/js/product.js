/**
 * Product Detail Page JavaScript
 * Handles image gallery and variant selection
 */

// Image Gallery Functionality
function changeMainImage(mediumUrl, largeUrl, thumbnailElement) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        // Check if we're already showing this image
        const currentSrc = mainImage.src.split('?')[0]; // Compare base URL without params
        const newSrc = mediumUrl.split('?')[0];

        if (currentSrc === newSrc) {
            // Just update the active thumbnail without re-loading the image
            updateActiveThumbnail(thumbnailElement);
            return;
        }

        // Add fade effect for image transition
        mainImage.style.opacity = '0.5';

        // Update src and remove srcset to use only the medium version
        // This prevents the browser from trying to load the large version
        mainImage.src = mediumUrl;
        mainImage.removeAttribute('srcset');
        mainImage.removeAttribute('sizes');
        mainImage.setAttribute('data-large', largeUrl);

        // Use cached image if available
        if (window.imageCache && window.imageCache[mediumUrl]) {
            mainImage.style.opacity = '1';
        } else {
            mainImage.onload = function() {
                mainImage.style.opacity = '1';
            };
        }
    }

    // Update active thumbnail styling
    updateActiveThumbnail(thumbnailElement);
}

// Helper function to update active thumbnail
function updateActiveThumbnail(thumbnailElement) {
    document.querySelectorAll('.thumbnail-item').forEach(item => {
        item.classList.remove('active');
        item.style.border = '';
    });

    if (thumbnailElement && thumbnailElement.parentElement) {
        thumbnailElement.parentElement.classList.add('active');
        thumbnailElement.parentElement.style.border = '2px solid #0d6efd';
    }
}

// Preload all product images
function preloadProductImages(imageUrls) {
    window.imageCache = window.imageCache || {};

    imageUrls.forEach(url => {
        if (!window.imageCache[url]) {
            const img = new Image();
            img.onload = function() {
                window.imageCache[url] = true;
            };
            img.src = url;
        }
    });
}

// Initialize thumbnail gallery on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial active state for first thumbnail
    const firstThumbnail = document.querySelector('.thumbnail-item.active');
    if (firstThumbnail) {
        firstThumbnail.style.border = '2px solid #0d6efd';
    }

    // Preload all gallery images (medium-sized versions)
    const thumbnails = document.querySelectorAll('.thumbnail-item img');
    const imageUrls = Array.from(thumbnails).map(img => img.getAttribute('data-medium'));
    if (imageUrls.length > 0) {
        preloadProductImages(imageUrls);
    }

    // Add click event listeners to thumbnails using event delegation
    document.querySelectorAll('.gallery-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            const mediumUrl = this.getAttribute('data-medium');
            const largeUrl = this.getAttribute('data-large');
            if (mediumUrl && largeUrl) {
                changeMainImage(mediumUrl, largeUrl, this);
            }
        });
    });
});

// Product Variant Selection
function initializeVariantSelection(variants) {
    if (!variants || !Array.isArray(variants)) {
        return;
    }

    const selectedOptions = {};

    document.querySelectorAll('.variant-option').forEach(button => {
        button.addEventListener('click', function() {
            const option = this.dataset.option;
            const value = this.dataset.value;

            // Remove active class from siblings
            document.querySelectorAll(`[data-option="${option}"]`).forEach(btn => {
                btn.classList.remove('active');
                btn.classList.replace('btn-primary', 'btn-outline-primary');
            });

            // Add active class to clicked button
            this.classList.add('active');
            this.classList.replace('btn-outline-primary', 'btn-primary');

            // Store selection
            selectedOptions[option] = value;

            // Find matching variant
            const matchingVariant = variants.find(v => {
                return Object.keys(selectedOptions).every(key =>
                    v.Options && v.Options[key] === selectedOptions[key]
                );
            });

            // Check if all options are selected
            const variantOptionsCount = document.querySelectorAll('.variant-option[data-option]')
                .length > 0
                ? new Set([...document.querySelectorAll('.variant-option')].map(btn => btn.dataset.option)).size
                : 0;

            const allOptionsSelected = variantOptionsCount === Object.keys(selectedOptions).length;

            if (allOptionsSelected && matchingVariant) {
                updateVariantInfo(matchingVariant);
            } else {
                hideVariantInfo();
            }
        });
    });
}

function updateVariantInfo(variant) {
    // Update variant SKU
    const skuElement = document.getElementById('variant-sku');
    if (skuElement) {
        skuElement.textContent = variant.Sku || 'N/A';
    }

    // Update variant price
    const priceElement = document.getElementById('variant-price');
    if (priceElement) {
        const price = variant.SalePrice || variant.Price || 0;
        priceElement.textContent = '$' + price.toFixed(2);
    }

    // Update stock badge
    const stockBadge = document.getElementById('variant-stock-badge');
    const isInStock = variant.StockQuantity > 0;

    if (stockBadge) {
        stockBadge.innerHTML = isInStock
            ? '<i class="bi bi-check-circle"></i> In Stock (' + variant.StockQuantity + ' available)'
            : '<i class="bi bi-x-circle"></i> Out of Stock';
        stockBadge.className = isInStock ? 'badge bg-success fs-6' : 'badge bg-danger fs-6';
    }

    // Show/hide elements
    const variantInfo = document.getElementById('variant-info');
    const variantPrompt = document.getElementById('variant-prompt');
    const addToCartSection = document.getElementById('add-to-cart-section');

    if (variantInfo) variantInfo.style.display = 'block';
    if (variantPrompt) variantPrompt.style.display = 'none';

    // Show add to cart if in stock
    if (isInStock && addToCartSection) {
        addToCartSection.style.display = 'block';

        const quantityInput = document.getElementById('variant-quantity');
        if (quantityInput) {
            quantityInput.max = variant.StockQuantity;
        }

        const variantIdInput = document.getElementById('selected-variant-id');
        if (variantIdInput) {
            variantIdInput.value = variant.Id;
        }
    } else if (addToCartSection) {
        addToCartSection.style.display = 'none';
    }
}

function hideVariantInfo() {
    const variantInfo = document.getElementById('variant-info');
    const variantPrompt = document.getElementById('variant-prompt');
    const addToCartSection = document.getElementById('add-to-cart-section');

    if (variantInfo) variantInfo.style.display = 'none';
    if (variantPrompt) variantPrompt.style.display = 'block';
    if (addToCartSection) addToCartSection.style.display = 'none';
}
