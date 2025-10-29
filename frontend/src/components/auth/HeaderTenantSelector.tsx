/**
 * HeaderTenantSelector Component
 *
 * Dropdown selector for superadmin to switch between tenants in the header
 * Shows tenant display name and allows quick tenant switching
 */

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, BuildingOfficeIcon } from '@heroicons/react/20/solid';
import { useAuthStore } from '../../store/authStore';
import { getActiveTenants } from '../../mocks/data/mockTenants';

/**
 * Tenant selector dropdown for superadmin in header
 * Displays current tenant and allows switching
 */
export function HeaderTenantSelector() {
  const session = useAuthStore((state) => state.session);
  const setTenant = useAuthStore((state) => state.setTenant);

  const tenants = getActiveTenants();
  const currentTenantId = session?.selectedTenantId;
  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  const handleTenantChange = (tenantId: string) => {
    setTenant(tenantId);
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="text-sm">
            {currentTenant ? currentTenant.displayName : 'Select Tenant'}
          </span>
          <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Select Tenant
            </div>
            {tenants.map((tenant) => (
              <Menu.Item key={tenant.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleTenantChange(tenant.id)}
                    className={`
                      ${active ? 'bg-gray-100' : ''}
                      ${currentTenantId === tenant.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'}
                      group flex w-full items-center px-4 py-2 text-sm
                    `}
                  >
                    <div className="flex flex-col items-start flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.displayName}</span>
                        {currentTenantId === tenant.id && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{tenant.contactEmail}</span>
                    </div>
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
