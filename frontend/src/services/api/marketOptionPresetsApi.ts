import { apiClient } from './client';
import type { OptionPreset } from '../../types/product';

export interface OptionPresetsResponse {
  presets: OptionPreset[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getMarketOptionPresets(
  marketId: string,
  params: { search?: string; page?: number; pageSize?: number } = {}
): Promise<OptionPresetsResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
  const query = qs.toString() ? `?${qs}` : '';
  return apiClient.get<OptionPresetsResponse>(`/admin/markets/${marketId}/option-presets${query}`);
}

export async function addOptionPreset(marketId: string, preset: OptionPreset): Promise<OptionPreset> {
  return apiClient.post<OptionPreset>(`/admin/markets/${marketId}/option-presets`, preset);
}

export async function updateOptionPreset(
  marketId: string,
  presetId: string,
  preset: OptionPreset
): Promise<OptionPreset> {
  return apiClient.put<OptionPreset>(`/admin/markets/${marketId}/option-presets/${presetId}`, preset);
}

export async function deleteOptionPreset(marketId: string, presetId: string): Promise<void> {
  await apiClient.delete(`/admin/markets/${marketId}/option-presets/${presetId}`);
}

/** Full replace — kept for Umbraco plugin / bulk imports. */
export async function replaceMarketOptionPresets(
  marketId: string,
  presets: OptionPreset[]
): Promise<OptionPreset[]> {
  const r = await apiClient.put<{ presets: OptionPreset[] }>(
    `/admin/markets/${marketId}/option-presets`,
    { presets }
  );
  return r.presets;
}
