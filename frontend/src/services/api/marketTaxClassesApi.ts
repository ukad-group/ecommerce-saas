/**
 * Market Tax Classes API
 *
 * Named tax rates, market-scoped. The class named by the active payment provider's surcharge sets
 * both the goods rate and that fee's own tax; `taxRate` is the flat fallback when none is named.
 * Whole-list bulk replace, same shape as shipping methods / leasing periods.
 */

import { apiClient } from './client';

export interface CountryTaxRate {
  countryCode: string;
  rate: number;
}

export interface TaxClass {
  id: string;
  name: string;
  defaultRate: number;
  countryRates?: CountryTaxRate[];
}

export interface TaxClassesResponse {
  taxClasses: TaxClass[];
  /** Flat fallback rate as a fraction (0.25 = 25%). */
  taxRate: number;
}

export async function getMarketTaxClasses(marketId: string): Promise<TaxClassesResponse> {
  return apiClient.get<TaxClassesResponse>(`/admin/markets/${marketId}/tax-classes`);
}

/** Omit taxRate to leave the stored fallback rate untouched. */
export async function updateMarketTaxClasses(
  marketId: string,
  taxClasses: TaxClass[],
  taxRate?: number,
): Promise<TaxClassesResponse> {
  return apiClient.put<TaxClassesResponse>(`/admin/markets/${marketId}/tax-classes`, { taxClasses, taxRate });
}
