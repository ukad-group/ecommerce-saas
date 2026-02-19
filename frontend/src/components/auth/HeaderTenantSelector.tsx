/**
 * HeaderTenantSelector Component
 *
 * Dropdown selector for superadmin to switch between tenants in the header
 * Shows tenant display name and allows quick tenant switching
 */

import { Fragment, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, BuildingOfficeIcon } from '@heroicons/react/20/solid';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import type { Tenant } from '../../types/tenant';

/**
 * Tenant selector dropdown for superadmin in header
 * Displays current tenant and allows switching
 */
export function HeaderTenantSelector() {
  const { session, setTenant } = useAuthStore((state) => ({
    session: state.session,
    setTenant: state.setTenant,
  }));

  const currentTenantId = session?.selectedTenantId;

  // Fetch tenants from API
  const { data: tenantsData } = useQuery<{
    data: Tenant[];
    total: number;
  }>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'active', // Only show active tenants
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/tenants?${params}`,
        {
          credentials: 'include', // Send JWT cookie
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }

      return response.json();
    },
  });

  const tenants = tenantsData?.data ?? [];
  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  // Auto-select first tenant if none is selected
  useEffect(() => {
    if (!currentTenantId && tenants.length > 0) {
      // Use setTimeout to defer the state update until after the current render
      const timer = setTimeout(() => {
        setTenant(tenants[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentTenantId, tenants.length, setTenant]);

  const handleTenantChange = (tenantId: string) => {
    setTenant(tenantId);
  };

  return (
    <Menu as="div" className="relative inline-block text-left w-full md:w-auto">
      <div>
        <Menu.Button className="w-full inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="text-sm truncate flex-1 text-left">
            {currentTenant ? currentTenant.displayName : 'Select Tenant'}
          </span>
          <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
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
        <Menu.Items className="absolute left-0 md:right-0 md:left-auto z-10 mt-2 w-full md:w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                      ${currentTenantId === tenant.id ? 'bg-[#4a6ba8]/10 text-[#4a6ba8]' : 'text-gray-900'}
                      group flex w-full items-center px-4 py-2 text-sm
                    `}
                  >
                    <div className="flex flex-col items-start flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.displayName}</span>
                        {currentTenantId === tenant.id && (
                          <span className="inline-flex items-center rounded-full bg-[#4a6ba8]/20 px-2 py-0.5 text-xs font-medium text-[#304477]">
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
