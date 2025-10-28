/**
 * useCart Hook
 *
 * TanStack Query hook for fetching the shopping cart.
 */

import { useQuery } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';

/**
 * Hook to fetch the current shopping cart
 *
 * @returns TanStack Query result with cart data
 *
 * @example
 * const { data: cart, isLoading, error } = useCart();
 */
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    staleTime: 1000 * 60, // 1 minute
    retry: 1, // Retry once on failure
  });
}
