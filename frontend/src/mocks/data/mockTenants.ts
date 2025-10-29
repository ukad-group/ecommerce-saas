/**
 * Hardcoded Tenant Data (MVP/Development Only)
 *
 * These tenants represent different businesses/organizations in the multi-tenant system.
 * In production, this data will come from a real database.
 */

import type { Tenant } from '../../types/tenant';

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'tenant-a',
    name: 'demo-retail-group',
    displayName: 'Demo Retail Group',
    status: 'active',
    contactEmail: 'admin@demoretail.com',
    contactPhone: '+1-555-0100',
    address: {
      street: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA'
    },
    settings: {
      maxMarkets: 10,
      maxUsers: 50,
      features: ['inventory', 'analytics', 'api_access']
    },
    marketCount: 3,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-10-28'),
  },
  {
    id: 'tenant-b',
    name: 'test-retail-chain',
    displayName: 'Test Retail Chain',
    status: 'active',
    contactEmail: 'contact@testretail.com',
    contactPhone: '+1-555-0200',
    address: {
      street: '456 Commerce St',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'USA'
    },
    settings: {
      maxMarkets: 5,
      maxUsers: 25,
      features: ['inventory', 'api_access']
    },
    marketCount: 2,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-10-25'),
  },
  {
    id: 'tenant-c',
    name: 'sample-corp',
    displayName: 'Sample Corp',
    status: 'active',
    contactEmail: 'info@samplecorp.com',
    settings: {
      maxMarkets: 3,
      maxUsers: 10,
      features: ['api_access']
    },
    marketCount: 2,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-10-26'),
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
  return MOCK_TENANTS.filter((t) => t.status === 'active');
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
