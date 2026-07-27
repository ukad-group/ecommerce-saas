import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarketTaxClasses, updateMarketTaxClasses } from '../api/marketTaxClassesApi';
import type { TaxClass } from '../api/marketTaxClassesApi';

const KEY = (marketId: string | undefined) => ['market-tax-classes', marketId];

export function useMarketTaxClasses(marketId: string | undefined) {
  return useQuery({
    queryKey: KEY(marketId),
    queryFn: () => getMarketTaxClasses(marketId as string),
    enabled: !!marketId,
  });
}

export function useUpdateMarketTaxClasses(marketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taxClasses: TaxClass[]) => updateMarketTaxClasses(marketId as string, taxClasses),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY(marketId) }),
  });
}
