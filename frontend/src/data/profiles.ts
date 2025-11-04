/**
 * Profile Data
 *
 * Temporary hardcoded profile data for auth.
 * TODO: Replace with real authentication system.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'tenant_admin' | 'tenant_user';
  tenantId?: string;
}

const profiles: UserProfile[] = [
  {
    id: 'profile-1',
    name: 'Super Admin',
    email: 'admin@platform.com',
    role: 'superadmin',
  },
  {
    id: 'profile-2',
    name: 'Admin (Demo Store)',
    email: 'admin@demostore.com',
    role: 'tenant_admin',
    tenantId: 'tenant-a',
  },
  {
    id: 'profile-3',
    name: 'Catalog Manager (Demo Store)',
    email: 'catalog@demostore.com',
    role: 'tenant_user',
    tenantId: 'tenant-a',
  },
];

export function getAllProfiles(): UserProfile[] {
  return profiles;
}

export function getProfileById(id: string): UserProfile | undefined {
  return profiles.find(p => p.id === id);
}
