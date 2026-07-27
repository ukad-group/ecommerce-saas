/**
 * Market Tax Classes API
 *
 * Named tax rates, market-scoped, feeding the payment-surcharge-fee's tax calculation. Whole-list
 * bulk replace, same shape as shipping methods / leasing periods.
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

interface TaxClassesResponse {
  taxClasses: TaxClass[];
}

export async function getMarketTaxClasses(marketId: string): Promise<TaxClass[]> {
  const r = await apiClient.get<TaxClassesResponse>(`/admin/markets/${marketId}/tax-classes`);
  return r.taxClasses;
}

export async function updateMarketTaxClasses(marketId: string, taxClasses: TaxClass[]): Promise<TaxClass[]> {
  const r = await apiClient.put<TaxClassesResponse>(`/admin/markets/${marketId}/tax-classes`, { taxClasses });
  return r.taxClasses;
}
