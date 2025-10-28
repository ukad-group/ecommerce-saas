/**
 * User Store (Zustand)
 *
 * Global state management for current user and tenant context
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer } from '../types/customer';

/**
 * User store state
 */
interface UserState {
  currentUser: Customer | null;
  tenantId: string;
  setCurrentUser: (user: Customer) => void;
  logout: () => void;
}

/**
 * User store for managing current user context
 *
 * Features:
 * - Persists user data to localStorage
 * - Provides login/logout actions
 * - Tracks tenant context
 *
 * @example
 * // In a component
 * const { currentUser, setCurrentUser, logout } = useUserStore();
 *
 * // Login
 * setCurrentUser(userData);
 *
 * // Logout
 * logout();
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: null,
      tenantId: '',

      /**
       * Sets the current user and tenant ID
       */
      setCurrentUser: (user: Customer) => {
        set({
          currentUser: user,
          tenantId: user.tenantId,
        });
      },

      /**
       * Clears the current user and logs out
       */
      logout: () => {
        set({
          currentUser: null,
          tenantId: '',
        });
      },
    }),
    {
      name: 'user-storage', // localStorage key
      // Only persist these fields
      partialize: (state) => ({
        currentUser: state.currentUser,
        tenantId: state.tenantId,
      }),
    }
  )
);

/**
 * Selector hook for getting just the current user
 *
 * @example
 * const user = useCurrentUser();
 */
export const useCurrentUser = () => useUserStore((state) => state.currentUser);

/**
 * Selector hook for getting just the tenant ID
 *
 * @example
 * const tenantId = useTenantId();
 */
export const useTenantId = () => useUserStore((state) => state.tenantId);

/**
 * Selector hook for checking if user is logged in
 *
 * @example
 * const isLoggedIn = useIsLoggedIn();
 */
export const useIsLoggedIn = () => useUserStore((state) => state.currentUser !== null);
