import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMarketOptionPresets,
  addOptionPreset,
  updateOptionPreset,
  deleteOptionPreset,
  replaceMarketOptionPresets,
} from '../api/marketOptionPresetsApi';
import type { OptionPreset } from '../../types/product';
import { useAuthStore } from '../../store/authStore';

const KEY = (marketId: string | null | undefined, search: string, page: number, pageSize: number) =>
  ['market-option-presets', marketId, search, page, pageSize];

export function useMarketOptionPresets(search = '', page = 1, pageSize = 10) {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;

  return useQuery({
    queryKey: KEY(marketId, search, page, pageSize),
    queryFn: () => getMarketOptionPresets(marketId as string, { search, page, pageSize }),
    enabled: !!marketId,
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });
}

/** Load all singles (no pagination) for the sub-options picker inside groups. */
export function useAllSinglePresets() {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;

  return useQuery({
    queryKey: ['market-option-presets-singles', marketId],
    queryFn: async () => {
      const r = await getMarketOptionPresets(marketId!, { pageSize: 0 });
      return r.presets.filter((p) => (p.kind ?? 'single') === 'single');
    },
    enabled: !!marketId,
    staleTime: 30000,
  });
}

/** Load all presets (singles + groups, no pagination) for the product option-block picker. */
export function useAllPresets() {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;

  return useQuery({
    queryKey: ['market-option-presets-all', marketId],
    queryFn: async () => {
      const r = await getMarketOptionPresets(marketId!, { pageSize: 0 });
      return r.presets;
    },
    enabled: !!marketId,
    staleTime: 30000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, marketId: string | null | undefined) {
  qc.invalidateQueries({ queryKey: ['market-option-presets', marketId] });
  qc.invalidateQueries({ queryKey: ['market-option-presets-singles', marketId] });
  qc.invalidateQueries({ queryKey: ['market-option-presets-all', marketId] });
}

export function useAddOptionPreset() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (preset: OptionPreset) => addOptionPreset(marketId!, preset),
    onSuccess: () => invalidate(qc, marketId),
  });
}

export function useUpdateOptionPreset() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: ({ id, preset }: { id: string; preset: OptionPreset }) =>
      updateOptionPreset(marketId!, id, preset),
    onSuccess: () => invalidate(qc, marketId),
  });
}

export function useDeleteOptionPreset() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (id: string) => deleteOptionPreset(marketId!, id),
    onSuccess: () => invalidate(qc, marketId),
  });
}

/** Kept for bulk operations. */
export function useUpdateMarketOptionPresets() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (presets: OptionPreset[]) => replaceMarketOptionPresets(marketId!, presets),
    onSuccess: () => invalidate(qc, marketId),
  });
}
