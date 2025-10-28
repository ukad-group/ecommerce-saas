/**
 * useClearCart Hook
 *
 * TanStack Query mutation hook for clearing the entire shopping cart.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';

/**
 * Hook to clear the entire shopping cart
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * const clearCart = useClearCart();
 * clearCart.mutate();
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
