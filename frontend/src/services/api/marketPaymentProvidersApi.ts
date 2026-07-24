/**
 * Market Payment Providers API
 *
 * Per-market payment provider configuration. The provider catalog is schema-driven, so the UI
 * renders each provider's settings form from `fields` without hardcoding any gateway.
 */

import { apiClient } from './client';

export type PaymentFieldType = 'Text' | 'Secret' | 'Bool' | 'Number';

export interface PaymentSettingField {
  key: string;
  label: string;
  type: PaymentFieldType;
  required: boolean;
  helpText?: string | null;
  defaultValue?: string | null;
}

export interface PaymentProviderDescriptor {
  alias: string;
  displayName: string;
  fields: PaymentSettingField[];
}

export interface MarketPaymentProvider {
  alias: string;
  displayName: string;
  known: boolean;
  settings: Record<string, unknown>;
}

export interface MarketPaymentProvidersResponse {
  active: string | null;
  providers: MarketPaymentProvider[];
}

/** The catalog of every registered provider + its settings schema. */
export async function getPaymentProviderCatalog(): Promise<PaymentProviderDescriptor[]> {
  return apiClient.get<PaymentProviderDescriptor[]>('/payments/providers');
}

/** Providers configured for a market (secrets masked). */
export async function getMarketPaymentProviders(
  marketId: string
): Promise<MarketPaymentProvidersResponse> {
  return apiClient.get<MarketPaymentProvidersResponse>(
    `/admin/markets/${marketId}/payment-providers`
  );
}

/** Add or update a provider's settings. Blank/masked secrets keep the stored value. */
export async function upsertMarketPaymentProvider(
  marketId: string,
  alias: string,
  settings: Record<string, unknown>
): Promise<MarketPaymentProvider> {
  return apiClient.put<MarketPaymentProvider>(
    `/admin/markets/${marketId}/payment-providers/${alias}`,
    settings
  );
}

/** Remove a provider's configuration (also clears it as active). */
export async function deleteMarketPaymentProvider(marketId: string, alias: string): Promise<void> {
  await apiClient.delete(`/admin/markets/${marketId}/payment-providers/${alias}`);
}

/** Set (alias) or clear (null) the market's active provider. */
export async function setActivePaymentProvider(
  marketId: string,
  alias: string | null
): Promise<{ active: string | null }> {
  return apiClient.put<{ active: string | null }>(
    `/admin/markets/${marketId}/active-payment-provider`,
    { alias }
  );
}
