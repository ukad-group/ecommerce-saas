import { apiClient } from './client';
import type { ProductAttribute, ProductAttributePreset } from '../../types/product';

export interface AttributesResponse {
  attributes: ProductAttribute[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AttributePresetsResponse {
  presets: ProductAttributePreset[];
  total: number;
  page: number;
  pageSize: number;
}

function buildQuery(params: { search?: string; page?: number; pageSize?: number }): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize));
  return qs.toString() ? `?${qs}` : '';
}

// ----- Attributes -----

export async function getMarketAttributes(
  marketId: string,
  params: { search?: string; page?: number; pageSize?: number } = {}
): Promise<AttributesResponse> {
  return apiClient.get<AttributesResponse>(`/admin/markets/${marketId}/attributes${buildQuery(params)}`);
}

export async function addAttribute(marketId: string, attribute: ProductAttribute): Promise<ProductAttribute> {
  return apiClient.post<ProductAttribute>(`/admin/markets/${marketId}/attributes`, attribute);
}

export async function updateAttribute(
  marketId: string,
  attributeId: string,
  attribute: ProductAttribute
): Promise<ProductAttribute> {
  return apiClient.put<ProductAttribute>(`/admin/markets/${marketId}/attributes/${attributeId}`, attribute);
}

export async function deleteAttribute(marketId: string, attributeId: string): Promise<void> {
  await apiClient.delete(`/admin/markets/${marketId}/attributes/${attributeId}`);
}

// ----- Attribute Presets -----

export async function getMarketAttributePresets(
  marketId: string,
  params: { search?: string; page?: number; pageSize?: number } = {}
): Promise<AttributePresetsResponse> {
  return apiClient.get<AttributePresetsResponse>(`/admin/markets/${marketId}/attribute-presets${buildQuery(params)}`);
}

export async function addAttributePreset(marketId: string, preset: ProductAttributePreset): Promise<ProductAttributePreset> {
  return apiClient.post<ProductAttributePreset>(`/admin/markets/${marketId}/attribute-presets`, preset);
}

export async function updateAttributePreset(
  marketId: string,
  presetId: string,
  preset: ProductAttributePreset
): Promise<ProductAttributePreset> {
  return apiClient.put<ProductAttributePreset>(`/admin/markets/${marketId}/attribute-presets/${presetId}`, preset);
}

export async function deleteAttributePreset(marketId: string, presetId: string): Promise<void> {
  await apiClient.delete(`/admin/markets/${marketId}/attribute-presets/${presetId}`);
}
