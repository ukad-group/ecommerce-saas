/**
 * Tenant Management Types
 * Defines the structure for tenants (business entities) in the multi-tenant system
 */

import type { Address } from './address';

export type TenantStatus = 'active' | 'inactive';

export interface TenantSettings {
  maxMarkets?: number;    // Limit on number of markets
  maxUsers?: number;      // Limit on number of users
  features?: string[];    // Enabled feature flags
}

export interface Tenant {
  id: string;
  name: string;           // Unique identifier (slug)
  displayName: string;    // Human-readable name
  status: TenantStatus;
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  settings?: TenantSettings;
  marketCount?: number;   // Number of associated markets
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;     // User ID
  updatedBy?: string;     // User ID
}

export interface CreateTenantInput {
  name: string;
  displayName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  settings?: TenantSettings;
}

export interface UpdateTenantInput {
  displayName?: string;
  status?: TenantStatus;
  contactEmail?: string;
  contactPhone?: string;
  address?: Address;
  settings?: TenantSettings;
}

export interface TenantFilters {
  search?: string;
  status?: TenantStatus;
  page?: number;
  limit?: number;
}

export interface TenantsResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
}