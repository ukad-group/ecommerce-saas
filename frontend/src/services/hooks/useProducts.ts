/**
 * useProducts Hook
 *
 * React Query hooks for product catalog operations.
 * Provides data fetching, caching, and mutations for products.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductsQueryParams,
} from '../api/productsApi';
import type { Product } from '../../types/product';
import { useAuthStore } from '../../store/authStore';

/**
 * Hook to fetch all products with optional filtering
 * Automatically filters by selected tenant and market from auth context
 */
export function useProducts(params?: ProductsQueryParams) {
  const tenantId = useAuthStore((state) => state.getTenantId());
  const marketId = useAuthStore((state) => state.getMarketId());

  return useQuery({
    queryKey: ['products', tenantId, marketId, params],
    queryFn: () => getProducts(params),
    staleTime: 30000, // 30 seconds
    enabled: !!tenantId && !!marketId, // Only fetch when both are selected
  });
}

/**
 * Hook to fetch a specific product by ID
 */
export function useProduct(productId: string) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
  });
}

/**
 * Hook to create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData: Partial<Product>) => createProduct(productData),
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to update an existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      productData,
    }: {
      productId: string;
      productData: Partial<Product>;
    }) => updateProduct(productId, productData),
    onSuccess: (updatedProduct) => {
      // Invalidate all product-related queries
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // Invalidate version history for this product
      queryClient.invalidateQueries({ queryKey: ['product-versions', updatedProduct.id] });

      // Update the specific product in cache with new data
      queryClient.setQueryData(['products', updatedProduct.id], updatedProduct);
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to update product stock quantity
 * Convenience hook for quick stock updates
 */
export function useUpdateProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      stockQuantity,
    }: {
      productId: string;
      stockQuantity: number;
    }) => updateProduct(productId, { stockQuantity }),
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
