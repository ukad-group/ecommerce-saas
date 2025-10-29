/**
 * Authentication and Authorization Types
 * Defines user profiles, roles, sessions, and tenants for role-based access control
 */

/**
 * User roles in the system
 * - SUPERADMIN: Full access to all tenants and markets
 * - TENANT_ADMIN: Full access within selected tenant across all markets
 * - TENANT_USER: Market-specific access within tenant (edit products/categories only)
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
  /** Assigned markets for tenant users (null for superadmin/tenant admin) */
  assignedMarketIds?: string[] | null;
}

/**
 * Active user session
 * Stored in Zustand + localStorage for persistence
 */
export interface UserSession {
  profile: UserProfile;
  /** Selected tenant for this session (null for superadmin) */
  selectedTenantId: string | null;
  /** Selected markets for this session (null for superadmin, all markets for tenant admin) */
  selectedMarketIds?: string[] | null;
  /** Timestamp when session was created */
  createdAt: string;
}

/**
 * Simple Tenant reference for auth
 * Full tenant details are in types/tenant.ts
 */
export interface TenantRef {
  id: string;
  name: string;
  displayName: string;
}

/**
 * Permission types for granular access control
 */
export type Permission =
  | 'viewAllTenants'
  | 'viewAllMarkets'
  | 'editOrders'
  | 'createTenants'
  | 'createMarkets'
  | 'editProducts'
  | 'editCategories'
  | 'manageInventory';

