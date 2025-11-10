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
}

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
  images: string[];
  categoryIds: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  metadata?: Record<string, any>;
  hasVariants?: boolean; // Indicates if product uses variants
  variantOptions?: VariantOption[]; // Defines available variant options (e.g., Size, Color)
  variants?: ProductVariant[]; // Array of product variants
  customProperties?: CustomProperty[]; // Additional specification fields

  // Versioning fields
  version: number; // Version number (increments with each update)
  isCurrentVersion: boolean; // True only for the latest version
  versionCreatedAt: string; // ISO 8601 - When this specific version was created
  versionCreatedBy: string; // User ID who created this version
  changeNotes?: string; // Optional notes about what changed in this version
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
