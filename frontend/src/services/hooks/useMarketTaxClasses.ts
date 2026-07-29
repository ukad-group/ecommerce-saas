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

/** taxRate is optional — omit it to edit classes without touching the flat fallback rate. */
export function useUpdateMarketTaxClasses(marketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { taxClasses: TaxClass[]; taxRate?: number }) =>
      updateMarketTaxClasses(marketId as string, vars.taxClasses, vars.taxRate),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY(marketId) }),
  });
}
