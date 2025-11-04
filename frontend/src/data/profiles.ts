/**
 * Profile Data
 *
 * Temporary hardcoded profile data for auth.
 * TODO: Replace with real authentication system.
 */

import type { UserProfile } from '../types/auth';
import { Role } from '../types/auth';

const profiles: UserProfile[] = [
  {
    id: 'profile-1',
    displayName: 'Super Admin',
    email: 'admin@platform.com',
    role: Role.SUPERADMIN,
    defaultTenantId: null,
  },
  {
    id: 'profile-2',
    displayName: 'Admin (Demo Store)',
    email: 'admin@demostore.com',
    role: Role.TENANT_ADMIN,
    defaultTenantId: 'tenant-a',
  },
  {
    id: 'profile-3',
    displayName: 'Catalog Manager (Demo Store)',
    email: 'catalog@demostore.com',
    role: Role.TENANT_USER,
    defaultTenantId: 'tenant-a',
    assignedMarketIds: ['market-1'],
  },
];

export function getAllProfiles(): UserProfile[] {
  return profiles;
}

export function getProfileById(id: string): UserProfile | undefined {
  return profiles.find(p => p.id === id);
}
