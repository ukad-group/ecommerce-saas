/**
 * Mock API Key Data
 *
 * These API keys represent market-specific keys for external integrations.
 * In production, keys would be generated and hashed securely.
 */

import { ApiKey } from '../../types/apiKey';

export const mockApiKeys: ApiKey[] = [
  // Downtown Store (market-1) - 2 keys
  {
    id: 'key-1',
    tenantId: 'tenant-a',
    marketId: 'market-1',
    name: 'Production Storefront Integration',
    keyHash: 'hash_sk_live_abc123...',
    lastFourChars: '7h9k',
    status: 'active',
    createdAt: new Date('2024-06-01'),
    lastUsedAt: new Date('2024-10-29T10:30:00'),
    createdBy: 'user-1',
  },
  {
    id: 'key-2',
    tenantId: 'tenant-a',
    marketId: 'market-1',
    name: 'Mobile App Integration',
    keyHash: 'hash_sk_live_def456...',
    lastFourChars: '3m5n',
    status: 'active',
    createdAt: new Date('2024-07-15'),
    lastUsedAt: new Date('2024-10-29T09:15:00'),
    createdBy: 'user-1',
  },

  // Airport Location (market-2) - 1 key
  {
    id: 'key-3',
    tenantId: 'tenant-a',
    marketId: 'market-2',
    name: 'Kiosk System',
    keyHash: 'hash_sk_live_ghi789...',
    lastFourChars: '8p2q',
    status: 'active',
    createdAt: new Date('2024-08-01'),
    lastUsedAt: new Date('2024-10-28T22:45:00'),
    createdBy: 'user-2',
  },

  // Online Store (market-3) - 3 keys
  {
    id: 'key-4',
    tenantId: 'tenant-a',
    marketId: 'market-3',
    name: 'Main Website',
    keyHash: 'hash_sk_live_jkl012...',
    lastFourChars: '4r7s',
    status: 'active',
    createdAt: new Date('2024-02-01'),
    lastUsedAt: new Date('2024-10-29T11:00:00'),
    createdBy: 'user-1',
  },
  {
    id: 'key-5',
    tenantId: 'tenant-a',
    marketId: 'market-3',
    name: 'Development Environment',
    keyHash: 'hash_sk_test_mno345...',
    lastFourChars: '1t9u',
    status: 'revoked',
    createdAt: new Date('2024-03-15'),
    revokedAt: new Date('2024-09-01'),
    createdBy: 'user-3',
    revokedBy: 'user-1',
  },
  {
    id: 'key-6',
    tenantId: 'tenant-a',
    marketId: 'market-3',
    name: 'Partner Integration',
    keyHash: 'hash_sk_live_pqr678...',
    lastFourChars: '6v3w',
    status: 'active',
    createdAt: new Date('2024-09-10'),
    lastUsedAt: new Date('2024-10-27T14:20:00'),
    expiresAt: new Date('2025-09-10'),
    createdBy: 'user-1',
  },

  // Mall Store (market-4) - 1 key
  {
    id: 'key-7',
    tenantId: 'tenant-b',
    marketId: 'market-4',
    name: 'POS Integration',
    keyHash: 'hash_sk_live_stu901...',
    lastFourChars: '2x8y',
    status: 'active',
    createdAt: new Date('2024-05-20'),
    lastUsedAt: new Date('2024-10-29T08:00:00'),
    createdBy: 'user-4',
  },

  // Sample Corp Online Store (market-6) - 2 keys
  {
    id: 'key-8',
    tenantId: 'tenant-c',
    marketId: 'market-6',
    name: 'E-commerce Platform',
    keyHash: 'hash_sk_live_vwx234...',
    lastFourChars: '5z1a',
    status: 'active',
    createdAt: new Date('2024-05-01'),
    lastUsedAt: new Date('2024-10-29T07:30:00'),
    createdBy: 'user-5',
  },
  {
    id: 'key-9',
    tenantId: 'tenant-c',
    marketId: 'market-6',
    name: 'Analytics Service',
    keyHash: 'hash_sk_live_yza567...',
    lastFourChars: '9b4c',
    status: 'active',
    createdAt: new Date('2024-07-01'),
    lastUsedAt: new Date('2024-10-28T18:00:00'),
    createdBy: 'user-5',
  },
];

// Helper functions
export const getApiKeysByMarket = (marketId: string): ApiKey[] => {
  return mockApiKeys.filter(k => k.marketId === marketId);
};

export const getActiveApiKeysByMarket = (marketId: string): ApiKey[] => {
  return mockApiKeys.filter(k => k.marketId === marketId && k.status === 'active');
};

export const getApiKeyById = (keyId: string): ApiKey | undefined => {
  return mockApiKeys.find(k => k.id === keyId);
};

// Generate a new mock API key
export const generateMockApiKey = (): string => {
  const prefix = 'sk_live_';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Get last 4 characters of a key
export const getLastFourChars = (key: string): string => {
  return key.slice(-4);
};

// Simulate hashing (in production, use proper crypto)
export const hashApiKey = (key: string): string => {
  return 'hash_' + key.substring(0, 20) + '...';
};