/**
 * Hardcoded User Profiles (MVP/Development Only)
 *
 * These profiles simulate different user types for development and testing.
 * In production, these will be replaced with real authentication (OAuth2/OIDC).
 */

import { UserProfile, Role } from '../../types/auth';

export const HARDCODED_PROFILES: UserProfile[] = [
  {
    id: 'superadmin-1',
    displayName: 'Super Admin',
    email: 'superadmin@system.local',
    role: Role.SUPERADMIN,
    defaultTenantId: null,
  },
  {
    id: 'tenant-admin-1',
    displayName: 'Tenant Admin (Demo Store)',
    email: 'admin@tenant-a.local',
    role: Role.TENANT_ADMIN,
    defaultTenantId: 'tenant-a',
  },
  {
    id: 'tenant-user-1',
    displayName: 'Catalog Manager (Demo Store)',
    email: 'manager@tenant-a.local',
    role: Role.TENANT_USER,
    defaultTenantId: 'tenant-a',
  },
];

/**
 * Get profile by ID
 */
export function getProfileById(profileId: string): UserProfile | undefined {
  return HARDCODED_PROFILES.find((p) => p.id === profileId);
}

/**
 * Get all available profiles for login selection
 */
export function getAllProfiles(): UserProfile[] {
  return HARDCODED_PROFILES;
}
