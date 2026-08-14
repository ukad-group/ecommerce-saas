/**
 * API Client Tests
 *
 * Tests for the API client functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, ApiErrorClass } from './client';
import { useAuthStore } from '../../store/authStore';

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

  // Guards the logout-on-401 path every page relies on by going through apiClient
  it('should clear the session on 401', async () => {
    useAuthStore.setState({ session: {} as never, isAuthenticated: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    );

    await expect(client.get('/admin/markets')).rejects.toThrow();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
    vi.unstubAllGlobals();
  });
});
