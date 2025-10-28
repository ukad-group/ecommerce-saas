/**
 * TenantSelector Component
 *
 * Conditional dropdown for tenant selection
 * Only shown for non-superadmin roles
 */

import { getTenantsByProfileId } from '../../mocks/data/mockTenants';

interface TenantSelectorProps {
  profileId: string;
  selectedTenantId: string;
  onTenantChange: (tenantId: string) => void;
}

/**
 * Tenant selector dropdown component
 * Shows tenants available to the selected profile
 * Hidden for superadmin (doesn't need tenant selection)
 */
export function TenantSelector({
  profileId,
  selectedTenantId,
  onTenantChange,
}: TenantSelectorProps) {
  const tenants = getTenantsByProfileId(profileId);

  if (tenants.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No tenants available for this profile
      </div>
    );
  }

  return (
    <select
      value={selectedTenantId}
      onChange={(e) => onTenantChange(e.target.value)}
      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
    >
      <option value="">-- Select a tenant --</option>
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.displayName} ({tenant.name})
        </option>
      ))}
    </select>
  );
}
