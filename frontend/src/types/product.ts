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
 * Product entity
 * Represents a sellable item in the catalog
 */
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  salePrice?: number;
  status: ProductStatus;
  stockQuantity: number;
  lowStockThreshold: number;
  currency: string;
  images: string[];
  categoryIds: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  metadata?: Record<string, any>;
}

/**
 * Product category entity
 * Represents a grouping for product organization
 */
export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
