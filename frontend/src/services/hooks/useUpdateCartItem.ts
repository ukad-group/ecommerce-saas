/**
 * useUpdateCartItem Hook
 *
 * TanStack Query mutation hook for updating cart item quantities.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';

interface UpdateCartItemParams {
  lineItemId: string;
  quantity: number;
}

/**
 * Hook to update a cart item's quantity
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * const updateCartItem = useUpdateCartItem();
 * updateCartItem.mutate({ lineItemId: 'line-1', quantity: 3 });
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lineItemId, quantity }: UpdateCartItemParams) =>
      cartApi.updateCartItem(lineItemId, quantity),
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
