/**
 * API Client
 *
 * Core HTTP client for all API communication.
 * Handles authentication, tenant context, and error handling.
 */

import type { ApiError } from '../../types/api';
import { useAuthStore } from '../../store/authStore';

/**
 * Custom error class for API errors
 */
export class ApiErrorClass extends Error {
  statusCode: number;
  error: string;
  details?: Record<string, any>;

  constructor(
    statusCode: number,
    error: string,
    details?: Record<string, any>
  ) {
    super(error);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
  }
}

/**
 * Configuration for ApiClient
 */
interface ApiClientConfig {
  baseURL: string;
  getAuthToken: () => string | null;
  getTenantId: () => string | null;
  getMarketId: () => string | null;
}

/**
 * API Client class
 * Provides methods for making HTTP requests with automatic header injection
 */
export class ApiClient {
  private baseURL: string;
  private getAuthToken: () => string | null;
  private getTenantId: () => string | null;
  private getMarketId: () => string | null;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.getAuthToken = config.getAuthToken;
    this.getTenantId = config.getTenantId;
    this.getMarketId = config.getMarketId;
  }

  /**
   * Core request method
   * Adds authentication, tenant, and market headers to all requests
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add tenant ID header if available
    const tenantId = this.getTenantId();
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // Add market ID header if available
    const marketId = this.getMarketId();
    if (marketId) {
      headers['X-Market-ID'] = marketId;
    }

    // Add authorization header if token is available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge with provided headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Make request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        // Fallback if response is not JSON
        errorData = {
          error: 'Request failed',
          message: response.statusText,
          statusCode: response.status,
        };
      }

      throw new ApiErrorClass(
        errorData.statusCode || response.status,
        errorData.message || errorData.error,
        errorData.details
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

/**
 * Singleton API client instance
 * Dynamically retrieves tenant/market context from auth store
 */
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  getAuthToken: () => {
    // TODO: Integrate with real auth token when backend is ready
    return localStorage.getItem('authToken');
  },
  getTenantId: () => {
    // Get tenant ID from auth store
    const state = useAuthStore.getState();
    return state.getTenantId();
  },
  getMarketId: () => {
    // Get market ID from auth store
    const state = useAuthStore.getState();
    return state.getMarketId();
  },
});
