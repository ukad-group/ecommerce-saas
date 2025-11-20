/**
 * Authentication Service
 *
 * Handles login/logout with JWT authentication via backend API
 * Uses httpOnly cookies for secure token storage
 */

import type { UserSession, UserProfile } from '../../types/auth';
import { Role } from '../../types/auth';
import { getActiveTenants, getMarketsByTenant } from '../../data/tenants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5180/api/v1';

/**
 * Login request parameters
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  session?: UserSession;
  error?: string;
}

/**
 * Authenticates a user with email and password via backend API
 * Token is stored in httpOnly cookie automatically by the backend
 *
 * @param request - Login request with email and password
 * @returns Login response with session or error
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { email, password } = request;

  try {
    // Call backend login API
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: Include cookies in request
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
      return {
        success: false,
        error: errorData.error || 'Invalid email or password',
      };
    }

    const data = await response.json();
    const user = data.user;

    // Build UserProfile from API response
    const profile: UserProfile = {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role as Role,
      defaultTenantId: user.tenantId,
      assignedMarketIds: user.assignedMarketIds,
    };

    // Determine default tenant and market based on user role
    let selectedTenantId: string | null = null;
    let selectedMarketIds: string[] | undefined = undefined;

    if (profile.role === Role.SUPERADMIN) {
      // Superadmin: Set first active tenant as default
      const activeTenants = getActiveTenants();
      selectedTenantId = activeTenants.length > 0 ? activeTenants[0].id : null;

      if (selectedTenantId) {
        const markets = getMarketsByTenant(selectedTenantId);
        selectedMarketIds = markets.length > 0 ? [markets[0].id] : undefined;
      }
    } else {
      // Tenant Admin or User: Use their assigned tenant
      selectedTenantId = profile.defaultTenantId;

      if (selectedTenantId) {
        if (profile.role === Role.TENANT_ADMIN) {
          // Tenant admin: Use first market of their tenant
          const markets = getMarketsByTenant(selectedTenantId);
          selectedMarketIds = markets.length > 0 ? [markets[0].id] : undefined;
        } else {
          // Tenant user: Use their assigned markets
          selectedMarketIds = profile.assignedMarketIds || undefined;
        }
      }
    }

    // Create session
    const session: UserSession = {
      profile,
      selectedTenantId,
      selectedMarketIds,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Logs out the current user and clears the httpOnly cookie
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Important: Include cookies
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if API call fails, we'll clear client-side state
  }
}

/**
 * Gets the current session from storage
 * (This is a utility - actual storage is handled by Zustand)
 */
export function validateSession(session: UserSession | null): boolean {
  if (!session) return false;

  // Check if session is expired (optional - not implemented in MVP)
  // In production, you might want to check session age and force re-login
  // const sessionAge = Date.now() - new Date(session.createdAt).getTime();
  // const MAX_SESSION_AGE = 8 * 60 * 60 * 1000; // 8 hours
  // if (sessionAge > MAX_SESSION_AGE) return false;

  return true;
}
