/**
 * Product Type Definitions
 *
 * Defines types for products, categories, and inventory.
 * Based on specs/001-product-catalog/spec.md
 */

/**
 * Product status type union
 * Represents the lifecycle stage of a product
 */
export type ProductStatus = 'active' | 'inactive' | 'draft';

/**
 * Custom property for products
 * Allows adding dynamic specification fields
 */
export interface CustomProperty {
  name: string;
  value: string;
  sortOrder: number;
}

/**
 * Focal point (0..1 fractions of width/height), mirrors Umbraco's image cropper.
 */
export interface FocalPoint {
  left: number;
  top: number;
}

/**
 * A named crop captured from Umbraco (stored for future use, not yet consumed by rendering).
 */
export interface ImageCrop {
  alias: string;
  width?: number;
  height?: number;
  coordinates?: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * A product image with optional metadata. The API always returns this object shape, but a bare
 * URL string is still accepted (legacy / hand-entered), hence {@link ProductImageEntry}.
 */
export interface ProductImage {
  url: string;
  altText?: string;
  focalPoint?: FocalPoint;
  crops?: ImageCrop[];
  /** Source Umbraco media GUID (set by the Umbraco plugin); ignored by the admin UI. */
  mediaKey?: string;
}

/** A product image is either a rich object or a bare URL string. */
export type ProductImageEntry = string | ProductImage;

/**
 * Product entity
 * Represents a sellable item in the catalog (market-specific)
 */
export interface Product {
  id: string;
  tenantId: string;
  marketId: string; // NEW: Products are market-specific
  name: string;
  sku?: string; // Optional when product has variants, unique within market
  description: string;
  price?: number; // Optional when product has variants
  salePrice?: number;
  status: ProductStatus;
  stockQuantity?: number; // Optional when product has variants
  lowStockThreshold?: number; // Optional when product has variants
  currency: string;
  images: ProductImageEntry[];
  categoryIds: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  metadata?: Record<string, any>;
  hasVariants?: boolean; // Indicates if product uses variants
  variantOptions?: VariantOption[]; // Defines available variant options (e.g., Size, Color)
  variants?: ProductVariant[]; // Array of product variants
  customProperties?: CustomProperty[]; // Additional specification fields
  options?: ProductOption[];
  highlights?: string[]; // Short bullet-point feature highlights
  freeOptions?: string[]; // Free-form editorial values shown on the customize/summary/email surfaces
  leasingFactor?: number; // Monthly leasing multiplier (e.g. 0.0219)
  hidePrice?: boolean; // When true, price is hidden on the storefront
  hiddenPriceDescription?: string; // Text shown instead of price when hidePrice is true
  seoTitle?: string; // Page title override for SEO
  seoDescription?: string; // Meta description for SEO

  // Versioning fields
  version: number; // Version number (increments with each update)
  isCurrentVersion: boolean; // True only for the latest version
  versionCreatedAt: string; // ISO 8601 - When this specific version was created
  versionCreatedBy: string; // User ID who created this version
  changeNotes?: string; // Optional notes about what changed in this version
}

/**
 * Product option block.
 * A titled group on a product that references store-global option presets
 * by id (the "sub options" picker). Resolved against the market's
 * OptionPreset library at display/cart time.
 */
export interface ProductOption {
  id: string;
  title: string;
  description?: string;
  optionIds: string[]; // references OptionPreset.id
  disabled?: boolean;
}

export type OptionPresetKind = 'single' | 'group';

/**
 * Store-global option preset (the "prefilled option" picked into blocks).
 * Lives in the market settings library; shared across products.
 *
 * Two kinds:
 *   - 'single' (default): a buyable add-on with its own sku/price/stock.
 *   - 'group': an "option with sub-options" — name/description/image plus
 *     `subOptionIds` referencing single presets. A group has no own price;
 *     price/stock come from whichever sub-option the customer picks.
 */
export interface OptionPreset {
  id: string;
  name: string; // Display name
  sku?: string;
  price: number;
  description?: string;
  imageUrl?: string; // Main image
  stockQuantity: number;
  status: ProductStatus;
  kind?: OptionPresetKind; // defaults to 'single' when absent
  subOptionIds?: string[]; // group only: ids of the single presets it bundles
}

/**
 * Variant option definition
 * Defines a type of variant attribute (e.g., "Size", "Color")
 */
export interface VariantOption {
  name: string; // e.g., "Size", "Color"
  values: string[]; // e.g., ["Small", "Medium", "Large"]
}

/**
 * Product variant
 * Represents a specific combination of variant options
 */
export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  images?: string[]; // Variant-specific images
  options: Record<string, string>; // e.g., { "Size": "Medium", "Color": "Blue" }
  status: ProductStatus;
  isDefault?: boolean; // Marks the default variant for display
}

/**
 * Product category entity
 * Represents a grouping for product organization (market-specific)
 */
export interface Category {
  id: string;
  tenantId: string;
  marketId: string; // NEW: Categories are market-specific
  name: string;
  description?: string;
  parentId?: string;
  productCount?: number; // Number of products in this category
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
