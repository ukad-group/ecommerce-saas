import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMarketAttributes,
  addAttribute,
  updateAttribute,
  deleteAttribute,
  getMarketAttributePresets,
  addAttributePreset,
  updateAttributePreset,
  deleteAttributePreset,
} from '../api/marketAttributesApi';
import type { ProductAttribute, ProductAttributePreset } from '../../types/product';
import { useAuthStore } from '../../store/authStore';

const ATTR_KEY = (marketId: string | null | undefined, search: string, page: number, pageSize: number) =>
  ['market-attributes', marketId, search, page, pageSize];
const PRESET_KEY = (marketId: string | null | undefined, search: string, page: number, pageSize: number) =>
  ['market-attribute-presets', marketId, search, page, pageSize];

// ----- Attributes -----

export function useMarketAttributes(search = '', page = 1, pageSize = 10) {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useQuery({
    queryKey: ATTR_KEY(marketId, search, page, pageSize),
    queryFn: () => getMarketAttributes(marketId as string, { search, page, pageSize }),
    enabled: !!marketId,
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });
}

/** Load all attributes (no pagination) for the product editor's attribute picker. */
export function useAllAttributes() {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useQuery({
    queryKey: ['market-attributes-all', marketId],
    queryFn: async () => {
      const r = await getMarketAttributes(marketId!, { pageSize: 0 });
      return r.attributes;
    },
    enabled: !!marketId,
    staleTime: 30000,
  });
}

function invalidateAttrs(qc: ReturnType<typeof useQueryClient>, marketId: string | null | undefined) {
  qc.invalidateQueries({ queryKey: ['market-attributes', marketId] });
  qc.invalidateQueries({ queryKey: ['market-attributes-all', marketId] });
}

export function useAddAttribute() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (attribute: ProductAttribute) => addAttribute(marketId!, attribute),
    onSuccess: () => invalidateAttrs(qc, marketId),
  });
}

export function useUpdateAttribute() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: ({ id, attribute }: { id: string; attribute: ProductAttribute }) =>
      updateAttribute(marketId!, id, attribute),
    onSuccess: () => invalidateAttrs(qc, marketId),
  });
}

export function useDeleteAttribute() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (id: string) => deleteAttribute(marketId!, id),
    onSuccess: () => invalidateAttrs(qc, marketId),
  });
}

// ----- Attribute Presets -----

export function useMarketAttributePresets(search = '', page = 1, pageSize = 10) {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useQuery({
    queryKey: PRESET_KEY(marketId, search, page, pageSize),
    queryFn: () => getMarketAttributePresets(marketId as string, { search, page, pageSize }),
    enabled: !!marketId,
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });
}

/** Load all attribute presets (no pagination) for the product editor's preset picker. */
export function useAllAttributePresets() {
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useQuery({
    queryKey: ['market-attribute-presets-all', marketId],
    queryFn: async () => {
      const r = await getMarketAttributePresets(marketId!, { pageSize: 0 });
      return r.presets;
    },
    enabled: !!marketId,
    staleTime: 30000,
  });
}

function invalidatePresets(qc: ReturnType<typeof useQueryClient>, marketId: string | null | undefined) {
  qc.invalidateQueries({ queryKey: ['market-attribute-presets', marketId] });
  qc.invalidateQueries({ queryKey: ['market-attribute-presets-all', marketId] });
}

export function useAddAttributePreset() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (preset: ProductAttributePreset) => addAttributePreset(marketId!, preset),
    onSuccess: () => invalidatePresets(qc, marketId),
  });
}

export function useUpdateAttributePreset() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: ({ id, preset }: { id: string; preset: ProductAttributePreset }) =>
      updateAttributePreset(marketId!, id, preset),
    onSuccess: () => invalidatePresets(qc, marketId),
  });
}

export function useDeleteAttributePreset() {
  const qc = useQueryClient();
  const marketId = useAuthStore((state) => state.getMarketId()) ?? undefined;
  return useMutation({
    mutationFn: (id: string) => deleteAttributePreset(marketId!, id),
    onSuccess: () => invalidatePresets(qc, marketId),
  });
}
