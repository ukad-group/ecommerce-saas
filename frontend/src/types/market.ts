export type MarketType = 'physical' | 'online' | 'hybrid';

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface MarketSettings {
  currency?: string;
  timezone?: string;
  address?: Address;
}

export interface Market {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: MarketType;
  isActive: boolean;
  settings?: MarketSettings;
  createdAt: Date;
  updatedAt: Date;
}
