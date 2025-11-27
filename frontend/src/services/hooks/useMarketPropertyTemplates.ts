/**
 * useMarketPropertyTemplates Hook
 *
 * React Query hooks for managing market property templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMarketPropertyTemplates,
  updateMarketPropertyTemplates,
} from '../api/marketSettingsApi';
import type { CustomPropertyTemplate } from '../../types/market';
import { useAuthStore } from '../../store/authStore';

/**
 * Hook to fetch property templates for the current market
 */
export function useMarketPropertyTemplates() {
  const marketId = useAuthStore((state) => state.getMarketId());

  return useQuery({
    queryKey: ['market-property-templates', marketId],
    queryFn: () => getMarketPropertyTemplates(marketId!),
    enabled: !!marketId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to update property templates for the current market
 */
export function useUpdateMarketPropertyTemplates() {
  const queryClient = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId());

  return useMutation({
    mutationFn: (templates: CustomPropertyTemplate[]) =>
      updateMarketPropertyTemplates(marketId!, templates),
    onSuccess: (updatedTemplates) => {
      // Update the cache with new templates
      queryClient.setQueryData(
        ['market-property-templates', marketId],
        updatedTemplates
      );
    },
  });
}
