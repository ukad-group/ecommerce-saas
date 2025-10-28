/**
 * Auth Store (Zustand)
 *
 * Global state management for admin authentication and authorization
 * Separate from userStore (which handles customer/shopping context)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role } from '../types/auth';
import type { UserSession, Permission } from '../types/auth';

/**
 * Auth store state
 */
interface AuthState {
  session: UserSession | null;
  isAuthenticated: boolean;

  // Actions
  setSession: (session: UserSession) => void;
  clearSession: () => void;
  logout: () => void;

  // Getters/helpers
  getRole: () => Role | null;
  getTenantId: () => string | null;
  isSuperadmin: () => boolean;
  hasPermission: (permission: Permission) => boolean;
}

/**
 * Permission matrix by role
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPERADMIN]: [
    'viewAllTenants',
    'editOrders',
    'createTenants',
    'createMarkets',
    'editProducts',
    'editCategories',
  ],
  [Role.TENANT_ADMIN]: [
    'editOrders',
    'createMarkets',
    'editProducts',
    'editCategories',
  ],
  [Role.TENANT_USER]: [
    'editProducts',
    'editCategories',
  ],
};

/**
 * Auth store for managing admin authentication and authorization
 *
 * Features:
 * - Persists session to localStorage
 * - Provides login/logout actions
 * - Role-based permission checks
 * - Tenant context management
 *
 * @example
 * // In a component
 * const { session, isAuthenticated, logout, hasPermission } = useAuthStore();
 *
 * // Check if user can edit orders
 * const canEditOrders = useAuthStore((state) => state.hasPermission('editOrders'));
 *
 * // Get current tenant ID
 * const tenantId = useAuthStore((state) => state.getTenantId());
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isAuthenticated: false,

      /**
       * Sets the current session after successful login
       */
      setSession: (session: UserSession) => {
        set({
          session,
          isAuthenticated: true,
        });
      },

      /**
       * Clears the current session
       */
      clearSession: () => {
        set({
          session: null,
          isAuthenticated: false,
        });
      },

      /**
       * Logs out and clears session
       * Note: Redirect to /login should be handled by the component calling this
       */
      logout: () => {
        get().clearSession();
      },

      /**
       * Gets the current user's role
       */
      getRole: () => {
        return get().session?.profile.role ?? null;
      },

      /**
       * Gets the current tenant ID
       * Returns null for superadmin (has access to all tenants)
       */
      getTenantId: () => {
        return get().session?.selectedTenantId ?? null;
      },

      /**
       * Checks if current user is superadmin
       */
      isSuperadmin: () => {
        return get().session?.profile.role === Role.SUPERADMIN;
      },

      /**
       * Checks if current user has a specific permission
       */
      hasPermission: (permission: Permission): boolean => {
        const role = get().getRole();
        if (!role) return false;
        return ROLE_PERMISSIONS[role].includes(permission);
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      // Only persist session and isAuthenticated
      partialize: (state) => ({
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Selector hook for getting just the session
 *
 * @example
 * const session = useSession();
 */
export const useSession = () => useAuthStore((state) => state.session);

/**
 * Selector hook for checking authentication status
 *
 * @example
 * const isAuthenticated = useIsAuthenticated();
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);

/**
 * Selector hook for getting current role
 *
 * @example
 * const role = useCurrentRole();
 */
export const useCurrentRole = () => useAuthStore((state) => state.getRole());

/**
 * Selector hook for getting current tenant ID
 *
 * @example
 * const tenantId = useCurrentTenantId();
 */
export const useCurrentTenantId = () => useAuthStore((state) => state.getTenantId());

/**
 * Selector hook for checking if user is superadmin
 *
 * @example
 * const isSuperadmin = useIsSuperadmin();
 */
export const useIsSuperadmin = () => useAuthStore((state) => state.isSuperadmin());
