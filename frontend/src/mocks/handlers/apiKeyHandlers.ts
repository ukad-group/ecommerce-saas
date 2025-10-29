/**
 * Mock API Handlers for API Key Management
 *
 * These handlers simulate API key operations for the MVP.
 * In production, these would be replaced by real API endpoints.
 */

import { http, HttpResponse } from 'msw';
import { mockApiKeys, generateMockApiKey, getLastFourChars, hashApiKey } from '../data/mockApiKeys';
import type { ApiKey, ApiKeyCreationResponse, CreateApiKeyInput } from '../../types/apiKey';
import { mockMarkets } from '../data/mockMarkets';

// In-memory storage for API keys (starts with mock data)
let apiKeys = [...mockApiKeys];
// In-memory storage for markets (using the existing mock data)
let markets = [...mockMarkets];

export const apiKeyHandlers = [
  // GET /api/v1/markets/:marketId/api-keys - List keys for market
  http.get('/api/v1/markets/:marketId/api-keys', ({ params }) => {
    const { marketId } = params;

    // Check if market exists
    const market = markets.find(m => m.id === marketId);
    if (!market) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Get keys for this market
    const marketKeys = apiKeys.filter(k => k.marketId === marketId);

    // Return list items (without full key hash for security)
    const keyListItems = marketKeys.map(k => ({
      id: k.id,
      name: k.name,
      lastFourChars: k.lastFourChars,
      status: k.status,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
    }));

    return HttpResponse.json(keyListItems, { status: 200 });
  }),

  // POST /api/v1/markets/:marketId/api-keys - Generate new key
  http.post('/api/v1/markets/:marketId/api-keys', async ({ params, request }) => {
    const { marketId } = params;
    const body = await request.json() as CreateApiKeyInput;

    // Check if market exists
    const market = markets.find(m => m.id === marketId);
    if (!market) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.name) {
      return HttpResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate expiration date if provided
    if (body.expiresAt && new Date(body.expiresAt) <= new Date()) {
      return HttpResponse.json(
        { error: 'Expiration date must be in the future' },
        { status: 400 }
      );
    }

    // Generate new API key
    const fullKey = generateMockApiKey();
    const newApiKey: ApiKey = {
      id: `key-${Date.now()}`,
      tenantId: market.tenantId,
      marketId: marketId as string,
      name: body.name,
      keyHash: hashApiKey(fullKey),
      lastFourChars: getLastFourChars(fullKey),
      status: 'active',
      createdAt: new Date(),
      expiresAt: body.expiresAt,
      createdBy: 'current-user', // In production, get from auth
    };

    // Add to storage
    apiKeys.push(newApiKey);

    // Update market's API key count
    const marketIndex = markets.findIndex(m => m.id === marketId);
    if (marketIndex !== -1) {
      markets[marketIndex].apiKeyCount++;
    }

    // Return the full key (only time it's shown)
    const response: ApiKeyCreationResponse = {
      id: newApiKey.id,
      key: fullKey,
      name: newApiKey.name,
      marketId: marketId as string,
      createdAt: newApiKey.createdAt,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // DELETE /api/v1/markets/:marketId/api-keys/:keyId - Revoke key
  http.delete('/api/v1/markets/:marketId/api-keys/:keyId', ({ params }) => {
    const { marketId, keyId } = params;

    // Check if market exists
    const market = markets.find(m => m.id === marketId);
    if (!market) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Find the key
    const keyIndex = apiKeys.findIndex(
      k => k.id === keyId && k.marketId === marketId
    );

    if (keyIndex === -1) {
      return HttpResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Check if already revoked
    if (apiKeys[keyIndex].status === 'revoked') {
      return HttpResponse.json(
        { error: 'API key is already revoked' },
        { status: 400 }
      );
    }

    // Revoke the key
    apiKeys[keyIndex] = {
      ...apiKeys[keyIndex],
      status: 'revoked',
      revokedAt: new Date(),
      revokedBy: 'current-user', // In production, get from auth
    };

    // Update market's API key count
    const marketIndex = markets.findIndex(m => m.id === marketId);
    if (marketIndex !== -1) {
      markets[marketIndex].apiKeyCount--;
    }

    return HttpResponse.json(
      { message: 'API key revoked successfully' },
      { status: 200 }
    );
  }),

  // POST /api/v1/auth/api-key - Authenticate using API key (for external integrations)
  http.post('/api/v1/auth/api-key', async ({ request }) => {
    const apiKeyHeader = request.headers.get('X-API-Key');

    if (!apiKeyHeader) {
      return HttpResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // In production, we'd hash the provided key and compare with stored hashes
    // For mock, we'll simulate by checking if it looks valid
    const keyHash = hashApiKey(apiKeyHeader);
    const apiKey = apiKeys.find(k => k.keyHash === keyHash && k.status === 'active');

    if (!apiKey) {
      return HttpResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401 }
      );
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return HttpResponse.json(
        { error: 'API key has expired' },
        { status: 401 }
      );
    }

    // Update last used timestamp
    const keyIndex = apiKeys.findIndex(k => k.id === apiKey.id);
    if (keyIndex !== -1) {
      apiKeys[keyIndex].lastUsedAt = new Date();
    }

    // Return authentication context
    return HttpResponse.json({
      tenantId: apiKey.tenantId,
      marketId: apiKey.marketId,
      keyId: apiKey.id,
      scopes: ['read', 'write'], // In production, keys could have different scopes
    }, { status: 200 });
  }),
];