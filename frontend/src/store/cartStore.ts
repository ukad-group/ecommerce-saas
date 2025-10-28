/**
 * Cart Store
 *
 * Zustand store for shopping cart state management.
 * Uses persist middleware to sync with localStorage.
 * Cart is represented as an Order with status 'new'.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from '../types/order';

interface CartState {
  cart: Order | null;
  isLoading: boolean;
  error: string | null;
}

interface CartActions {
  addToCart: (productId: string, quantity: number) => void;
  loadCart: () => void;
  clearCart: () => void;
  setCart: (cart: Order | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export type CartStore = CartState & CartActions;

/**
 * Cart store with persistence
 * Automatically syncs with localStorage using key 'ecommerce-cart'
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      // State
      cart: null,
      isLoading: false,
      error: null,

      // Actions
      addToCart: (productId: string, quantity: number) => {
        // This action is mainly for optimistic updates
        // Actual API call is handled by useAddToCart hook
        console.log('Adding to cart:', { productId, quantity });
      },

      loadCart: () => {
        // This action is mainly for triggering a reload
        // Actual API call is handled by useCart hook
        set({ isLoading: true, error: null });
      },

      clearCart: () => {
        set({ cart: null, error: null });
      },

      setCart: (cart: Order | null) => {
        set({ cart, isLoading: false, error: null });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },
    }),
    {
      name: 'ecommerce-cart',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
