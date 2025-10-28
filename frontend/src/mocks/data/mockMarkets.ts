import { Market } from '../../types/market';

export const mockMarkets: Market[] = [
  // Tenant A: Demo Retail Group
  {
    id: 'market-1',
    tenantId: 'tenant-a',
    name: 'Downtown Store',
    code: 'DT-001',
    type: 'physical',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'America/New_York',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-10-20'),
  },
  {
    id: 'market-2',
    tenantId: 'tenant-a',
    name: 'Airport Location',
    code: 'AP-001',
    type: 'physical',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'America/New_York',
      address: {
        street: 'JFK Airport Terminal 4',
        city: 'New York',
        state: 'NY',
        postalCode: '11430',
        country: 'USA',
      },
    },
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-10-18'),
  },
  {
    id: 'market-3',
    tenantId: 'tenant-a',
    name: 'Online Store',
    code: 'ONL-001',
    type: 'online',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'America/New_York',
    },
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-10-25'),
  },

  // Tenant B: Test Retail Chain
  {
    id: 'market-4',
    tenantId: 'tenant-b',
    name: 'Mall Store',
    code: 'MALL-001',
    type: 'physical',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'America/Chicago',
      address: {
        street: 'Westfield Mall, Unit 205',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      },
    },
    createdAt: new Date('2024-04-05'),
    updatedAt: new Date('2024-10-22'),
  },
  {
    id: 'market-5',
    tenantId: 'tenant-b',
    name: 'Outlet Store',
    code: 'OUT-001',
    type: 'physical',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'America/Chicago',
      address: {
        street: 'Premium Outlets, Store 42',
        city: 'Aurora',
        state: 'IL',
        postalCode: '60502',
        country: 'USA',
      },
    },
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-10-20'),
  },

  // Tenant C: Sample Corp
  {
    id: 'market-6',
    tenantId: 'tenant-c',
    name: 'Online Store',
    code: 'WEB-001',
    type: 'online',
    isActive: true,
    settings: {
      currency: 'USD',
      timezone: 'America/Los_Angeles',
    },
    createdAt: new Date('2024-05-01'),
    updatedAt: new Date('2024-10-26'),
  },
  {
    id: 'market-7',
    tenantId: 'tenant-c',
    name: 'Pop-up Store',
    code: 'POP-001',
    type: 'physical',
    isActive: false, // Seasonal/inactive
    settings: {
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      address: {
        street: 'Venice Beach Boardwalk',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90291',
        country: 'USA',
      },
    },
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-09-15'),
  },
];

// Helper functions
export const getMarketsByTenant = (tenantId: string): Market[] => {
  return mockMarkets.filter(m => m.tenantId === tenantId && m.isActive);
};

export const getMarketById = (marketId: string): Market | undefined => {
  return mockMarkets.find(m => m.id === marketId);
};

export const getActiveMarkets = (): Market[] => {
  return mockMarkets.filter(m => m.isActive);
};
