/**
 * MobileMenu Component
 *
 * Slide-out navigation menu for mobile devices
 * Shows navigation links, context switchers, and user info
 */

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Link, useLocation } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import { HeaderTenantSelector } from '../auth/HeaderTenantSelector';
import { HeaderMarketSelector } from '../auth/HeaderMarketSelector';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const session = useAuthStore((state) => state.session);
  const userRole = session?.profile.role;
  const location = useLocation();

  const isOnTenantDetailRoute = /^\/admin\/tenants\/[^/]+/.test(location.pathname);

  const navLinks = [
    { to: '/admin', label: 'Dashboard', show: true },
    {
      to: userRole === Role.SUPERADMIN ? '/admin/tenants' : '/admin/markets',
      label: userRole === Role.SUPERADMIN ? 'Tenants & Markets' : 'Markets',
      show: userRole === Role.SUPERADMIN || userRole === Role.TENANT_ADMIN,
    },
    { to: '/admin/products', label: 'Products', show: true },
    { to: '/admin/categories', label: 'Categories', show: true },
    { to: '/admin/orders', label: 'Orders', show: true },
    { to: '/admin/order-statuses', label: 'Order Statuses', show: true },
  ];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80 transition-opacity" />
        </Transition.Child>

        {/* Menu Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-xs">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="px-4 py-6 bg-[#4a6ba8]">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-white">
                          Menu
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close menu</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-4 py-6 space-y-1">
                      {navLinks
                        .filter((link) => link.show)
                        .map((link) => {
                          const isActive = location.pathname === link.to || 
                            (link.to !== '/admin' && location.pathname.startsWith(link.to));
                          
                          return (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={onClose}
                              className={`
                                block px-3 py-2 rounded-md text-base font-medium transition-colors
                                ${
                                  isActive
                                    ? 'bg-[#4a6ba8]/10 text-[#4a6ba8]'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#4a6ba8]'
                                }
                              `}
                            >
                              {link.label}
                            </Link>
                          );
                        })}
                    </nav>

                    {/* Context Selectors */}
                    {!isOnTenantDetailRoute && (
                      <div className="border-t border-gray-200 px-4 py-6 space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Context
                          </p>
                          
                          {/* Tenant Selector - Only for Superadmin */}
                          {userRole === Role.SUPERADMIN && (
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tenant
                              </label>
                              <HeaderTenantSelector />
                            </div>
                          )}

                          {/* Market Selector - For all roles */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Market
                            </label>
                            <HeaderMarketSelector />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Info and Logout Button */}
                    <div className="border-t border-gray-200 px-4 py-4 space-y-4">
                      {/* User Info */}
                      {session && (
                        <div className="pb-4 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{session.profile.displayName}</p>
                          <p className="text-xs text-gray-500 mt-1">{session.profile.email}</p>
                        </div>
                      )}
                      
                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          onClose();
                          useAuthStore.getState().logout();
                          window.location.href = '/login';
                        }}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#304477] hover:bg-[#253659] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4a6ba8]"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
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
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
