/**
 * API Client Tests
 *
 * Tests for the API client functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient, ApiErrorClass } from './client';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({
      baseURL: 'http://localhost:3000/api',
      getAuthToken: () => 'test-token',
      getTenantId: () => 'test-tenant',
      getMarketId: () => 'test-market',
      getUserId: () => 'test-user',
    });
  });

  it('should create an instance', () => {
    expect(client).toBeDefined();
  });

  it('should create ApiErrorClass with correct properties', () => {
    const error = new ApiErrorClass(404, 'Not Found', { detail: 'test' });
    expect(error.statusCode).toBe(404);
    expect(error.error).toBe('Not Found');
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.name).toBe('ApiError');
  });
});
