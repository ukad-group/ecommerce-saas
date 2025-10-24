/**
 * ProfileSelector Component
 *
 * Dropdown selector for hardcoded user profiles
 * Displays 3 profiles: Superadmin, Tenant Admin, Tenant User
 */

import { getAllProfiles } from '../../mocks/data/mockProfiles';
import { Role } from '../../types/auth';

interface ProfileSelectorProps {
  selectedProfileId: string;
  onProfileChange: (profileId: string) => void;
}

/**
 * Role display labels with colors
 */
const ROLE_LABELS: Record<Role, { label: string; color: string }> = {
  [Role.SUPERADMIN]: { label: 'Superadmin', color: 'text-purple-600' },
  [Role.TENANT_ADMIN]: { label: 'Tenant Admin', color: 'text-blue-600' },
  [Role.TENANT_USER]: { label: 'Tenant User', color: 'text-green-600' },
};

/**
 * Profile selector dropdown component
 * Shows all available hardcoded profiles with their roles
 */
export function ProfileSelector({
  selectedProfileId,
  onProfileChange,
}: ProfileSelectorProps) {
  const profiles = getAllProfiles();

  return (
    <select
      value={selectedProfileId}
      onChange={(e) => onProfileChange(e.target.value)}
      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
    >
      <option value="">-- Select a profile --</option>
      {profiles.map((profile) => {
        const roleInfo = ROLE_LABELS[profile.role];
        return (
          <option key={profile.id} value={profile.id}>
            {profile.displayName} ({roleInfo.label})
          </option>
        );
      })}
    </select>
  );
}
