/**
 * useCheckout Hooks
 *
 * TanStack Query hooks for checkout operations.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checkoutApi } from '../api/checkoutApi';
import type { ShippingAddress, BillingAddress } from '../../types/address';

/**
 * Hook to validate cart before checkout
 */
export function useValidateCart() {
  return useMutation({
    mutationFn: () => checkoutApi.validateCart(),
  });
}

/**
 * Hook to set shipping address
 */
export function useSetShippingAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (address: ShippingAddress) =>
      checkoutApi.setShippingAddress(address),
    onSuccess: () => {
      // Invalidate cart to get updated order with shipping address
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * Hook to set billing address
 */
export function useSetBillingAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      address,
      sameAsShipping,
    }: {
      address: BillingAddress;
      sameAsShipping?: boolean;
    }) => checkoutApi.setBillingAddress(address, sameAsShipping),
    onSuccess: () => {
      // Invalidate cart to get updated order with billing address
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * Hook to submit order
 */
export function useSubmitOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkoutApi.submitOrder(),
    onSuccess: () => {
      // Invalidate cart and orders
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * Hook to process payment
 */
export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentData: {
      cardNumber: string;
      cardholderName: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
    }) => checkoutApi.processPayment(paymentData),
    onSuccess: () => {
      // Invalidate cart and orders
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
