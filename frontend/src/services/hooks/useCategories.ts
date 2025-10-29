/**
 * useCategories Hook
 *
 * React Query hooks for category operations.
 * Provides data fetching, caching, and mutations for categories.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../api/productsApi';
import type { Category } from '../../types/product';
import { useAuthStore } from '../../store/authStore';

/**
 * Hook to fetch all categories
 * Automatically filters by selected tenant and market from auth context
 */
export function useCategories() {
  const tenantId = useAuthStore((state) => state.getTenantId());
  const marketId = useAuthStore((state) => state.getMarketId());

  return useQuery({
    queryKey: ['categories', tenantId, marketId],
    queryFn: () => getCategories(),
    staleTime: 60000, // 1 minute
    enabled: !!tenantId && !!marketId, // Only fetch when both are selected
  });
}

/**
 * Hook to fetch a specific category by ID
 */
export function useCategory(categoryId: string) {
  return useQuery({
    queryKey: ['categories', categoryId],
    queryFn: () => getCategoryById(categoryId),
    enabled: !!categoryId,
  });
}

/**
 * Hook to create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryData: Partial<Category>) => createCategory(categoryData),
    onSuccess: () => {
      // Invalidate and refetch categories list
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

/**
 * Hook to update an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      categoryData,
    }: {
      categoryId: string;
      categoryData: Partial<Category>;
    }) => updateCategory(categoryId, categoryData),
    onSuccess: (updatedCategory) => {
      // Invalidate and refetch categories list
      queryClient.invalidateQueries({ queryKey: ['categories'] });

      // Update the specific category in cache
      queryClient.setQueryData(['categories', updatedCategory.id], updatedCategory);
    },
  });
}

/**
 * Hook to delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId),
    onSuccess: () => {
      // Invalidate and refetch categories list
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
