/**
 * Authentication and Authorization Types
 * Defines user profiles, roles, sessions, and tenants for role-based access control
 */

/**
 * User roles in the system
 * - SUPERADMIN: Full access to all tenants and system functions
 * - TENANT_ADMIN: Full access within selected tenant
 * - TENANT_USER: Read-all access, edit products/categories only within tenant
 */
export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  TENANT_USER = 'TENANT_USER',
}

/**
 * User profile (hardcoded for MVP)
 * Represents a pre-configured user that can log in
 */
export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  /** Default tenant for this profile (null for superadmin) */
  defaultTenantId: string | null;
}

/**
 * Active user session
 * Stored in Zustand + localStorage for persistence
 */
export interface UserSession {
  profile: UserProfile;
  /** Selected tenant for this session (null for superadmin) */
  selectedTenantId: string | null;
  /** Timestamp when session was created */
  createdAt: string;
}

/**
 * Tenant entity
 * Represents a business/organization in the multi-tenant system
 */
export interface Tenant {
  id: string;
  name: string;
  displayName: string;
  /** Whether this tenant is active */
  active: boolean;
}

/**
 * Permission types for granular access control
 */
export type Permission =
  | 'viewAllTenants'
  | 'editOrders'
  | 'createTenants'
  | 'createCustomerShops'
  | 'editProducts'
  | 'editCategories';
