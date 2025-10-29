/**
 * Authentication Service
 *
 * Handles login logic, profile validation, and session creation
 * Works with hardcoded profiles for MVP (development/staging only)
 */

import type { UserSession, UserProfile } from '../../types/auth';
import { Role } from '../../types/auth';
import { getProfileById } from '../../mocks/data/mockProfiles';
import { getTenantById } from '../../mocks/data/mockTenants';

/**
 * Login request parameters
 */
export interface LoginRequest {
  profileId: string;
  tenantId?: string;
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
 * Authenticates a user with the given profile and optional tenant
 *
 * @param request - Login request with profileId and optional tenantId
 * @returns Login response with session or error
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { profileId, tenantId } = request;

  // Validate profile exists
  const profile = getProfileById(profileId);
  if (!profile) {
    return {
      success: false,
      error: 'Invalid profile selected',
    };
  }

  // Validate tenant selection based on role
  if (profile.role === Role.SUPERADMIN) {
    // Superadmin doesn't need tenant selection
    const session: UserSession = {
      profile,
      selectedTenantId: null,
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      session,
    };
  }

  // Non-superadmin roles require tenant selection
  if (!tenantId) {
    return {
      success: false,
      error: 'Tenant selection is required for this role',
    };
  }

  // Validate tenant exists
  const tenant = getTenantById(tenantId);
  if (!tenant) {
    return {
      success: false,
      error: 'Invalid tenant selected',
    };
  }

  // Validate tenant is active
  if (tenant.status !== 'active') {
    return {
      success: false,
      error: 'Selected tenant is not active',
    };
  }

  // Create session for tenant-scoped user
  const session: UserSession = {
    profile,
    selectedTenantId: tenantId,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    session,
  };
}

/**
 * Logs out the current user
 * (Client-side only for MVP - no server-side session to invalidate)
 */
export async function logout(): Promise<void> {
  // In production, this would call a server endpoint to invalidate the session
  // For MVP with hardcoded profiles, this is client-side only
  return Promise.resolve();
}

/**
 * Validates if a profile requires tenant selection
 *
 * @param profile - User profile to check
 * @returns True if tenant selection is required
 */
export function requiresTenantSelection(profile: UserProfile): boolean {
  return profile.role !== Role.SUPERADMIN;
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
