/**
 * useRemoveCartItem Hook
 *
 * TanStack Query mutation hook for removing items from the cart.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';

/**
 * Hook to remove an item from the shopping cart
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * const removeCartItem = useRemoveCartItem();
 * removeCartItem.mutate('line-1');
 */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lineItemId: string) => cartApi.removeCartItem(lineItemId),
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
