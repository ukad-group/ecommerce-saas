import { Address } from './address';

export type MarketType = 'physical' | 'online' | 'hybrid';
export type MarketStatus = 'active' | 'inactive';

export interface MarketSettings {
  orderPrefix?: string;   // Prefix for order numbers
  taxRate?: number;       // Default tax rate
  shippingZones?: string[];
}

export interface Market {
  id: string;
  tenantId: string;
  name: string;
  code: string;           // Unique within tenant
  type: MarketType;
  status: MarketStatus;
  currency: string;
  timezone: string;
  address?: Address;
  settings?: MarketSettings;
  apiKeyCount: number;    // Count of active API keys
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateMarketInput {
  tenantId: string;
  name: string;
  code: string;
  type: MarketType;
  currency: string;
  timezone: string;
  address?: Address;
  settings?: MarketSettings;
}

export interface UpdateMarketInput {
  name?: string;
  code?: string;
  type?: MarketType;
  status?: MarketStatus;
  currency?: string;
  timezone?: string;
  address?: Address;
  settings?: MarketSettings;
}

export interface MarketFilters {
  tenantId?: string;
  search?: string;
  type?: MarketType;
  status?: MarketStatus;
  page?: number;
  limit?: number;
}
