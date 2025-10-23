/**
 * Checkout Store
 *
 * Zustand store for managing checkout flow state.
 * Tracks current step, form data, and validation state.
 */

import { create } from 'zustand';
import type { ShippingAddress, BillingAddress } from '../types/address';

export type CheckoutStep = 'shipping' | 'billing' | 'payment' | 'review';

interface CheckoutState {
  currentStep: CheckoutStep;
  shippingAddress: ShippingAddress | null;
  billingAddress: BillingAddress | null;
  sameAsShipping: boolean;
  isProcessing: boolean;
  error: string | null;
}

interface CheckoutActions {
  setCurrentStep: (step: CheckoutStep) => void;
  setShippingAddress: (address: ShippingAddress) => void;
  setBillingAddress: (address: BillingAddress) => void;
  setSameAsShipping: (sameAsShipping: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  resetCheckout: () => void;
  nextStep: () => void;
  previousStep: () => void;
}

export type CheckoutStore = CheckoutState & CheckoutActions;

const STEP_ORDER: CheckoutStep[] = ['shipping', 'billing', 'payment', 'review'];

const initialState: CheckoutState = {
  currentStep: 'shipping',
  shippingAddress: null,
  billingAddress: null,
  sameAsShipping: true,
  isProcessing: false,
  error: null,
};

/**
 * Checkout flow store
 * Manages multi-step checkout process state
 */
export const useCheckoutStore = create<CheckoutStore>()((set, get) => ({
  ...initialState,

  setCurrentStep: (step: CheckoutStep) => {
    set({ currentStep: step, error: null });
  },

  setShippingAddress: (address: ShippingAddress) => {
    set({ shippingAddress: address });
  },

  setBillingAddress: (address: BillingAddress) => {
    set({ billingAddress: address });
  },

  setSameAsShipping: (sameAsShipping: boolean) => {
    set({ sameAsShipping });
  },

  setProcessing: (isProcessing: boolean) => {
    set({ isProcessing });
  },

  setError: (error: string | null) => {
    set({ error, isProcessing: false });
  },

  resetCheckout: () => {
    set(initialState);
  },

  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[currentIndex + 1], error: null });
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEP_ORDER[currentIndex - 1], error: null });
    }
  },
}));
