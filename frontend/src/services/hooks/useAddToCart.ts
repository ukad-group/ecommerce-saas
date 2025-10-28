/**
 * useAddToCart Hook
 *
 * TanStack Query mutation hook for adding products to the cart.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';

interface AddToCartParams {
  productId: string;
  quantity: number;
}

/**
 * Hook to add a product to the shopping cart
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * const addToCart = useAddToCart();
 * addToCart.mutate({ productId: 'prod-1', quantity: 2 });
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: AddToCartParams) =>
      cartApi.addToCart(productId, quantity),
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
