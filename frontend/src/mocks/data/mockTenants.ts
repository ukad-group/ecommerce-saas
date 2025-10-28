/**
 * Hardcoded Tenant Data (MVP/Development Only)
 *
 * These tenants represent different businesses/organizations in the multi-tenant system.
 * In production, this data will come from a real database.
 */

import type { Tenant } from '../../types/auth';

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'tenant-a',
    name: 'demo-store',
    displayName: 'Demo Store',
    active: true,
  },
  {
    id: 'tenant-b',
    name: 'fashion-boutique',
    displayName: 'Fashion Boutique',
    active: true,
  },
  {
    id: 'tenant-c',
    name: 'electronics-hub',
    displayName: 'Electronics Hub',
    active: true,
  },
];

/**
 * Get tenant by ID
 */
export function getTenantById(tenantId: string): Tenant | undefined {
  return MOCK_TENANTS.find((t) => t.id === tenantId);
}

/**
 * Get all active tenants
 */
export function getActiveTenants(): Tenant[] {
  return MOCK_TENANTS.filter((t) => t.active);
}

/**
 * Get tenants accessible by a specific profile
 * - Superadmin: all tenants
 * - Other roles: only their default tenant(s)
 */
export function getTenantsByProfileId(profileId: string): Tenant[] {
  if (profileId === 'superadmin-1') {
    return MOCK_TENANTS;
  }
  // For MVP, non-superadmin users have access to only their default tenant
  // This is hardcoded but could be expanded in future
  if (profileId === 'tenant-admin-1' || profileId === 'tenant-user-1') {
    return MOCK_TENANTS.filter((t) => t.id === 'tenant-a');
  }
  return [];
}
