/**
 * Market Settings API
 *
 * API methods for managing market-level settings like property templates.
 */

import { apiClient } from './client';
import type { CustomPropertyTemplate } from '../../types/market';

interface PropertyTemplatesResponse {
  templates: CustomPropertyTemplate[];
}

/**
 * Get property templates for a market
 */
export async function getMarketPropertyTemplates(
  marketId: string
): Promise<CustomPropertyTemplate[]> {
  const response = await apiClient.get<PropertyTemplatesResponse>(
    `/admin/markets/${marketId}/property-templates`
  );
  return response.templates;
}

/**
 * Update property templates for a market
 */
export async function updateMarketPropertyTemplates(
  marketId: string,
  templates: CustomPropertyTemplate[]
): Promise<CustomPropertyTemplate[]> {
  const response = await apiClient.put<PropertyTemplatesResponse>(
    `/admin/markets/${marketId}/property-templates`,
    { templates }
  );
  return response.templates;
}
