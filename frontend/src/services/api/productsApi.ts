/**
 * Products API
 *
 * API methods for product catalog management.
 * Uses the shared apiClient for HTTP requests.
 */

import { apiClient } from './client';
import type { Product, Category, ProductStatus } from '../../types/product';

/**
 * Query parameters for fetching products
 */
export interface ProductsQueryParams {
  status?: ProductStatus;
  categoryId?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all products with optional filtering
 */
export async function getProducts(params?: ProductsQueryParams): Promise<Product[]> {
  const queryParams = new URLSearchParams();

  // Backoffice should see all products by default (status=all)
  // If status is explicitly provided, use it; otherwise use "all"
  const effectiveStatus = params?.status !== undefined ? params.status : 'all';
  queryParams.append('status', effectiveStatus);

  if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
  if (params?.searchQuery) queryParams.append('search', params.searchQuery);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  const endpoint = `/products${query ? `?${query}` : ''}`;

  return apiClient.get<Product[]>(endpoint);
}

/**
 * Get a specific product by ID
 */
export async function getProductById(productId: string): Promise<Product> {
  return apiClient.get<Product>(`/products/${productId}`);
}

/**
 * Create a new product
 */
export async function createProduct(productData: Partial<Product>): Promise<Product> {
  return apiClient.post<Product>('/products', productData);
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  productData: Partial<Product>
): Promise<Product> {
  return apiClient.put<Product>(`/products/${productId}`, productData);
}

/**
 * Delete a product (soft delete)
 */
export async function deleteProduct(productId: string): Promise<void> {
  return apiClient.delete<void>(`/products/${productId}`);
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/categories');
}

/**
 * Get a specific category by ID
 */
export async function getCategoryById(categoryId: string): Promise<Category> {
  return apiClient.get<Category>(`/categories/${categoryId}`);
}

/**
 * Create a new category
 */
export async function createCategory(categoryData: Partial<Category>): Promise<Category> {
  return apiClient.post<Category>('/categories', categoryData);
}

/**
 * Update an existing category
 */
export async function updateCategory(
  categoryId: string,
  categoryData: Partial<Category>
): Promise<Category> {
  return apiClient.put<Category>(`/categories/${categoryId}`, categoryData);
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  return apiClient.delete<void>(`/categories/${categoryId}`);
}

/**
 * Get all versions of a product
 */
export async function getProductVersions(productId: string): Promise<Product[]> {
  return apiClient.get<Product[]>(`/products/${productId}/versions`);
}

/**
 * Get a specific version of a product
 */
export async function getProductVersion(productId: string, version: number): Promise<Product> {
  return apiClient.get<Product>(`/products/${productId}/versions/${version}`);
}

/**
 * Restore a previous version of a product
 */
export async function restoreProductVersion(productId: string, version: number): Promise<Product> {
  return apiClient.post<Product>(`/products/${productId}/versions/${version}/restore`);
}

/**
 * Export all product API methods as a namespace
 */
export const productsApi = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getProductVersions,
  getProductVersion,
  restoreProductVersion,
};
