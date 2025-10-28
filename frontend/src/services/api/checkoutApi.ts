/**
 * Checkout API
 *
 * API methods for checkout operations.
 * Uses the shared apiClient for HTTP requests.
 */

import { apiClient } from './client';
import type { Order } from '../../types/order';
import type { ShippingAddress, BillingAddress } from '../../types/address';
import type { PaymentTransaction } from '../../types/payment';

/**
 * Validate cart before checkout
 * Checks product availability, prices, and cart totals
 */
export async function validateCart(): Promise<{
  valid: boolean;
  errors?: string[];
}> {
  return apiClient.post<{ valid: boolean; errors?: string[] }>(
    '/checkout/validate',
    {}
  );
}

/**
 * Set shipping address for the order
 *
 * @param address - Shipping address details
 * @returns Updated order
 */
export async function setShippingAddress(
  address: ShippingAddress
): Promise<Order> {
  return apiClient.post<Order>('/checkout/shipping', address);
}

/**
 * Set billing address for the order
 *
 * @param address - Billing address details
 * @param sameAsShipping - Whether billing address is same as shipping
 * @returns Updated order
 */
export async function setBillingAddress(
  address: BillingAddress,
  sameAsShipping: boolean = false
): Promise<Order> {
  return apiClient.post<Order>('/checkout/billing', {
    ...address,
    sameAsShipping,
  });
}

/**
 * Submit order (transition from 'new' to 'submitted')
 * Locks in the order for processing
 *
 * @returns Submitted order
 */
export async function submitOrder(): Promise<Order> {
  return apiClient.post<Order>('/checkout/submit', {});
}

/**
 * Process payment for the order
 * Transitions order from 'submitted' to 'paid'
 *
 * @param paymentData - Payment information
 * @returns Payment transaction and updated order
 */
export async function processPayment(paymentData: {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}): Promise<{
  transaction: PaymentTransaction;
  order: Order;
}> {
  return apiClient.post<{ transaction: PaymentTransaction; order: Order }>(
    '/checkout/payment',
    paymentData
  );
}

/**
 * Export all checkout API methods as a namespace
 */
export const checkoutApi = {
  validateCart,
  setShippingAddress,
  setBillingAddress,
  submitOrder,
  processPayment,
};
