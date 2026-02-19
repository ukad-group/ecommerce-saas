/**
 * Navigation Component
 *
 * Top navigation bar for the admin backoffice with role-based menu visibility.
 * Responsive design with hamburger menu on mobile and full navigation on desktop.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/outline';
import { UserInfo } from '../auth/UserInfo';
import { HeaderTenantSelector } from '../auth/HeaderTenantSelector';
import { HeaderMarketSelector } from '../auth/HeaderMarketSelector';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import { MobileMenu } from './MobileMenu';
import { useResponsive } from '../../utils/useMediaQuery';

export function Navigation() {
  const session = useAuthStore((state) => state.session);
  const userRole = session?.profile.role;
  const location = useLocation();
  const { isDesktop } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide context selectors on tenant detail routes (e.g., /admin/tenants/:tenantId/markets)
  // since the tenant is already specified in the URL
  const isOnTenantDetailRoute = /^\/admin\/tenants\/[^/]+/.test(location.pathname);

  return (
    <>
      <nav className="bg-[#4a6ba8] shadow-sm border-b border-[#3d5789]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Header Row */}
          <div className="flex justify-between items-center h-16 gap-4">
            <div className="flex items-center min-w-0 flex-1">
              {/* Mobile Menu Button - Show on mobile and tablet */}
              {!isDesktop && (
                <button
                  type="button"
                  className="mr-3 inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-[#4a6ba8] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <span className="sr-only">Open menu</span>
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
              )}

              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-lg md:text-xl font-bold text-white whitespace-nowrap">
                  eCommerce Admin
                </Link>
              </div>

              {/* Navigation Links - Desktop Only */}
              <div className="hidden lg:ml-6 lg:flex lg:space-x-6 xl:space-x-8">
              <Link
                to="/admin"
                className="border-transparent text-white/90 hover:border-[#4a6ba8] hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap"
              >
                Dashboard
              </Link>

              {/* Tenants & Markets - Only for Superadmin and Tenant Admin */}
              {(userRole === Role.SUPERADMIN || userRole === Role.TENANT_ADMIN) && (
                <Link
                  to={userRole === Role.SUPERADMIN ? "/admin/tenants" : "/admin/markets"}
                  className="border-transparent text-white/90 hover:border-[#4a6ba8] hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap"
                >
                  {userRole === Role.SUPERADMIN ? "Tenants & Markets" : "Markets"}
                </Link>
              )}

              <Link
                to="/admin/products"
                className="border-transparent text-white/90 hover:border-[#4a6ba8] hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap"
              >
                Products
              </Link>
              <Link
                to="/admin/categories"
                className="border-transparent text-white/90 hover:border-[#4a6ba8] hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap"
              >
                Categories
              </Link>
              <Link
                to="/admin/orders"
                className="border-transparent text-white/90 hover:border-[#4a6ba8] hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap"
              >
                Orders
              </Link>
            </div>
          </div>

          {/* User Info and Logout - Desktop Only */}
          <div className="hidden lg:flex items-center flex-shrink-0">
            <UserInfo />
          </div>
        </div>

        {/* Context Selectors Row - Desktop Only, Hidden on tenant detail routes */}
        {isDesktop && !isOnTenantDetailRoute && (
          <div className="flex items-center gap-3 py-3 border-t border-gray-100">
            <span className="text-sm font-medium text-white">Context:</span>

            {/* Tenant Selector - Only for Superadmin */}
            {userRole === Role.SUPERADMIN && <HeaderTenantSelector />}

            {/* Market Selector - For all roles */}
            <HeaderMarketSelector />
          </div>
        )}
      </div>
    </nav>

    {/* Mobile Menu */}
    <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
