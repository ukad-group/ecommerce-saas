/**
 * Countries API
 *
 * The static ISO 3166-1 reference list, optionally filtered to a market's shipping zones.
 */

import { apiClient } from './client';

export interface Country {
  code: string;
  name: string;
}

export async function getCountries(marketId?: string): Promise<Country[]> {
  const qs = marketId ? `?marketId=${encodeURIComponent(marketId)}` : '';
  return apiClient.get<Country[]>(`/countries${qs}`);
}
