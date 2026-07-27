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

export interface PaymentSurcharge {
  sku: string | null;
  taxClassId: string | null;
  amount: number;
}

export interface MarketPaymentProvidersResponse {
  active: string | null;
  orderStatusAfterPayment: string | null;
  providers: MarketPaymentProvider[];
  surcharges: Record<string, PaymentSurcharge>;
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

/** Set (code) or clear (null) the order status to apply when a payment succeeds. */
export async function setOrderStatusAfterPayment(
  marketId: string,
  code: string | null
): Promise<{ orderStatusAfterPayment: string | null }> {
  return apiClient.put<{ orderStatusAfterPayment: string | null }>(
    `/admin/markets/${marketId}/order-status-after-payment`,
    { code }
  );
}

/** Set a provider's surcharge fee. */
export async function setPaymentSurcharge(
  marketId: string,
  alias: string,
  surcharge: PaymentSurcharge
): Promise<PaymentSurcharge> {
  return apiClient.put<PaymentSurcharge>(
    `/admin/markets/${marketId}/payment-providers/${alias}/surcharge`,
    surcharge
  );
}

/** Remove a provider's surcharge fee. */
export async function deletePaymentSurcharge(marketId: string, alias: string): Promise<void> {
  await apiClient.delete(`/admin/markets/${marketId}/payment-providers/${alias}/surcharge`);
}
