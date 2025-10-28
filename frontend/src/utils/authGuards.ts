/**
 * Auth Guards Utility
 *
 * Helper functions for role-based permission checks and route guards
 */

import { Role } from '../types/auth';
import type { Permission, UserSession } from '../types/auth';

/**
 * Permission matrix - defines which permissions each role has
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
  [Role.TENANT_USER]: ['editProducts', 'editCategories'],
};

/**
 * Checks if a role has a specific permission
 *
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns True if role has the permission
 *
 * @example
 * hasRolePermission(Role.TENANT_ADMIN, 'editOrders') // true
 * hasRolePermission(Role.TENANT_USER, 'editOrders') // false
 */
export function hasRolePermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Checks if a session has a specific permission
 *
 * @param session - User session to check (null if not authenticated)
 * @param permission - Permission to verify
 * @returns True if session has the permission
 *
 * @example
 * hasPermission(session, 'editOrders')
 */
export function hasPermission(session: UserSession | null, permission: Permission): boolean {
  if (!session) return false;
  return hasRolePermission(session.profile.role, permission);
}

/**
 * Checks if session belongs to a superadmin
 *
 * @param session - User session to check
 * @returns True if superadmin
 */
export function isSuperadmin(session: UserSession | null): boolean {
  return session?.profile.role === Role.SUPERADMIN;
}

/**
 * Checks if session belongs to a tenant admin
 *
 * @param session - User session to check
 * @returns True if tenant admin
 */
export function isTenantAdmin(session: UserSession | null): boolean {
  return session?.profile.role === Role.TENANT_ADMIN;
}

/**
 * Checks if session belongs to a tenant user
 *
 * @param session - User session to check
 * @returns True if tenant user
 */
export function isTenantUser(session: UserSession | null): boolean {
  return session?.profile.role === Role.TENANT_USER;
}

/**
 * Gets the tenant ID for data filtering
 * Returns null for superadmin (can see all tenants)
 *
 * @param session - User session
 * @returns Tenant ID or null for superadmin
 */
export function getTenantIdForFiltering(session: UserSession | null): string | null {
  if (!session || isSuperadmin(session)) {
    return null; // Superadmin sees all tenants
  }
  return session.selectedTenantId;
}

/**
 * Checks if user can edit orders
 * (Shorthand for hasPermission(session, 'editOrders'))
 *
 * @param session - User session
 * @returns True if can edit orders
 */
export function canEditOrders(session: UserSession | null): boolean {
  return hasPermission(session, 'editOrders');
}

/**
 * Checks if user can create tenants
 * (Only superadmin)
 *
 * @param session - User session
 * @returns True if can create tenants
 */
export function canCreateTenants(session: UserSession | null): boolean {
  return hasPermission(session, 'createTenants');
}

/**
 * Checks if user can create markets
 * (Superadmin and tenant admin)
 *
 * @param session - User session
 * @returns True if can create markets
 */
export function canCreateMarkets(session: UserSession | null): boolean {
  return hasPermission(session, 'createMarkets');
}

/**
 * Checks if user can edit products
 * (All roles)
 *
 * @param session - User session
 * @returns True if can edit products
 */
export function canEditProducts(session: UserSession | null): boolean {
  return hasPermission(session, 'editProducts');
}

/**
 * Checks if user can edit categories
 * (All roles)
 *
 * @param session - User session
 * @returns True if can edit categories
 */
export function canEditCategories(session: UserSession | null): boolean {
  return hasPermission(session, 'editCategories');
}
