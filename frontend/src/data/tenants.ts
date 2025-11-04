/**
 * Tenant Data
 *
 * Temporary hardcoded tenant/market data for auth selectors.
 * TODO: Replace with API calls when tenant/market management is fully implemented.
 */

export interface TenantRef {
  id: string;
  name: string;
  displayName: string;
  contactEmail: string;
}

export interface MarketRef {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: string;
}

const tenants: TenantRef[] = [
  {
    id: 'tenant-a',
    name: 'demo-retail-group',
    displayName: 'Demo Retail Group',
    contactEmail: 'admin@demoretail.com',
  },
  {
    id: 'tenant-b',
    name: 'test-retail-chain',
    displayName: 'Test Retail Chain',
    contactEmail: 'contact@testretail.com',
  },
  {
    id: 'tenant-c',
    name: 'sample-corp',
    displayName: 'Sample Corp',
    contactEmail: 'info@samplecorp.com',
  },
];

const markets: MarketRef[] = [
  { id: 'market-1', tenantId: 'tenant-a', name: 'Downtown Store', code: 'DT', type: 'physical' },
  { id: 'market-2', tenantId: 'tenant-a', name: 'Airport Location', code: 'AP', type: 'physical' },
  { id: 'market-3', tenantId: 'tenant-a', name: 'Online Store', code: 'WEB', type: 'online' },
  { id: 'market-4', tenantId: 'tenant-b', name: 'Mall Store', code: 'ML', type: 'physical' },
  { id: 'market-5', tenantId: 'tenant-b', name: 'Web Store', code: 'WB', type: 'online' },
  { id: 'market-6', tenantId: 'tenant-c', name: 'Flagship', code: 'FG', type: 'hybrid' },
  { id: 'market-7', tenantId: 'tenant-c', name: 'Outlet', code: 'OT', type: 'physical' },
];

export function getActiveTenants(): TenantRef[] {
  return tenants;
}

export function getTenantById(id: string): TenantRef | undefined {
  return tenants.find(t => t.id === id);
}

export function getMarketsByTenant(tenantId: string): MarketRef[] {
  return markets.filter(m => m.tenantId === tenantId);
}

export function getTenantsByProfileId(_profileId: string): TenantRef[] {
  // For now, return all tenants (superadmin can see all)
  return tenants;
}
