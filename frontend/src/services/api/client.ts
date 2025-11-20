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
  getUserId: () => string | null;
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
  private getUserId: () => string | null;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.getAuthToken = config.getAuthToken;
    this.getTenantId = config.getTenantId;
    this.getMarketId = config.getMarketId;
    this.getUserId = config.getUserId;
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

    // Add user ID header if available (used for authentication)
    const userId = this.getUserId();
    if (userId) {
      headers['X-User-ID'] = userId;
    }

    // Add authorization header if token is available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge with provided headers (provided headers can override defaults)
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Remove Content-Type header if body is FormData (browser will set it with boundary)
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    // Make request (include credentials for httpOnly cookies)
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important: Send cookies with every request
    });

    // Handle non-OK responses
    if (!response.ok) {
      // Handle 401 Unauthorized - clear session and redirect to login
      if (response.status === 401) {
        const { useAuthStore } = await import('../../store/authStore');
        useAuthStore.getState().clearSession();

        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

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
    // Handle FormData specially (don't stringify it)
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
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
 * Dynamically retrieves tenant/market/user context from auth store
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
  getUserId: () => {
    // Get user ID from auth store
    const state = useAuthStore.getState();
    return state.session?.profile.id || null;
  },
});
