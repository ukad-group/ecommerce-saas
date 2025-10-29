/**
 * useCart Hook
 *
 * TanStack Query hook for fetching the shopping cart.
 */

import { useQuery } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';
import { useAuthStore } from '../../store/authStore';

/**
 * Hook to fetch the current shopping cart
 * Automatically filters by selected tenant and market from auth context
 *
 * @returns TanStack Query result with cart data
 *
 * @example
 * const { data: cart, isLoading, error } = useCart();
 */
export function useCart() {
  const tenantId = useAuthStore((state) => state.getTenantId());
  const marketId = useAuthStore((state) => state.getMarketId());

  return useQuery({
    queryKey: ['cart', tenantId, marketId],
    queryFn: cartApi.getCart,
    staleTime: 1000 * 60, // 1 minute
    retry: 1, // Retry once on failure
    enabled: !!tenantId && !!marketId, // Only fetch when both are selected
  });
}
