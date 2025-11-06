/**
 * HeaderMarketSelector Component
 *
 * Dropdown selector for all roles to switch between markets
 * Shows market name and allows quick market switching within their tenant
 */

import { Fragment, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, MapPinIcon } from '@heroicons/react/20/solid';
import { useAuthStore } from '../../store/authStore';
import { getMarketsByTenant } from '../../data/tenants';

/**
 * Market selector dropdown for all roles in header
 * Displays current market and allows switching within tenant
 */
export function HeaderMarketSelector() {
  const { session, setMarket } = useAuthStore((state) => ({
    session: state.session,
    setMarket: state.setMarket,
  }));

  const tenantId = session?.selectedTenantId;
  const markets = tenantId ? getMarketsByTenant(tenantId) : [];
  const currentMarketId = session?.selectedMarketIds?.[0];
  const currentMarket = markets.find((m) => m.id === currentMarketId);

  // Auto-select first market if none is selected
  // This must be called before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (tenantId && !currentMarketId && markets.length > 0) {
      // Use setTimeout to defer the state update until after the current render
      const timer = setTimeout(() => {
        setMarket(markets[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tenantId, currentMarketId, markets.length, setMarket]);

  // Show message if no tenant is selected (superadmin only)
  if (!tenantId) {
    return (
      <div className="inline-flex items-center gap-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-500">
        <MapPinIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        <span className="text-sm">Select a tenant first</span>
      </div>
    );
  }

  const handleMarketChange = (marketId: string) => {
    setMarket(marketId);
  };

  if (markets.length === 0) {
    return (
      <div className="inline-flex items-center gap-x-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-500">
        <MapPinIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        <span className="text-sm">No Markets Available</span>
      </div>
    );
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <MapPinIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <span className="text-sm">
            {currentMarket ? currentMarket.name : 'Select Market'}
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
              Select Market
            </div>
            {markets.map((market) => (
              <Menu.Item key={market.id}>
                {({ active }) => (
                  <button
                    onClick={() => handleMarketChange(market.id)}
                    className={`
                      ${active ? 'bg-gray-100' : ''}
                      ${currentMarketId === market.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'}
                      group flex w-full items-center px-4 py-2 text-sm
                    `}
                  >
                    <div className="flex flex-col items-start flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{market.name}</span>
                        {currentMarketId === market.id && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {market.code}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{market.type}</span>
                      </div>
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
