/**
 * UserInfo Component
 *
 * Displays current user info and logout button
 * Shows user name, role, and tenant (if applicable)
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getTenantById } from '../../data/tenants';
import { Role } from '../../types/auth';

/**
 * Role display labels with badges
 */
const ROLE_BADGES: Record<Role, { label: string; bgColor: string; textColor: string }> = {
  [Role.SUPERADMIN]: {
    label: 'Superadmin',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
  },
  [Role.TENANT_ADMIN]: {
    label: 'Tenant Admin',
    bgColor: 'bg-primary-100',
    textColor: 'text-primary-800',
  },
  [Role.TENANT_USER]: {
    label: 'Tenant User',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
};

/**
 * User info display with logout button
 * Shows in navigation header
 */
export function UserInfo() {
  const navigate = useNavigate();
  const { session, logout } = useAuthStore((state) => ({
    session: state.session,
    logout: state.logout,
  }));

  if (!session) {
    return null;
  }

  const { profile, selectedTenantId } = session;
  const roleBadge = ROLE_BADGES[profile.role];
  const tenant = selectedTenantId ? getTenantById(selectedTenantId) : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-4">
      {/* User Info */}
      <div className="flex flex-col items-end">
        <div className="text-sm font-medium text-gray-900">{profile.displayName}</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {/* Role Badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleBadge.bgColor} ${roleBadge.textColor}`}
          >
            {roleBadge.label}
          </span>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg
          className="-ml-0.5 mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Logout
      </button>
    </div>
  );
}
