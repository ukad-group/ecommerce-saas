/**
 * Navigation Component
 *
 * Top navigation bar for the admin backoffice with role-based menu visibility.
 */

import { Link, useLocation } from 'react-router-dom';
import { UserInfo } from '../auth/UserInfo';
import { HeaderTenantSelector } from '../auth/HeaderTenantSelector';
import { HeaderMarketSelector } from '../auth/HeaderMarketSelector';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';

export function Navigation() {
  const session = useAuthStore((state) => state.session);
  const userRole = session?.profile.role;
  const location = useLocation();

  // Hide context selectors on tenant detail routes (e.g., /admin/tenants/:tenantId/markets)
  // since the tenant is already specified in the URL
  const isOnTenantDetailRoute = /^\/admin\/tenants\/[^/]+/.test(location.pathname);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Row */}
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                eCommerce Admin
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/admin"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>

              {/* Tenants & Markets - Only for Superadmin and Tenant Admin */}
              {(userRole === Role.SUPERADMIN || userRole === Role.TENANT_ADMIN) && (
                <Link
                  to={userRole === Role.SUPERADMIN ? "/admin/tenants" : "/admin/markets"}
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  {userRole === Role.SUPERADMIN ? "Tenants & Markets" : "Markets"}
                </Link>
              )}

              <Link
                to="/admin/products"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Products
              </Link>
              <Link
                to="/admin/categories"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Categories
              </Link>
              <Link
                to="/admin/orders"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Orders
              </Link>
            </div>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center">
            <UserInfo />
          </div>
        </div>

        {/* Context Selectors Row - Hidden on tenant detail routes */}
        {!isOnTenantDetailRoute && (
          <div className="flex items-center gap-3 py-3 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-700">Context:</span>

            {/* Tenant Selector - Only for Superadmin */}
            {userRole === Role.SUPERADMIN && <HeaderTenantSelector />}

            {/* Market Selector - For all roles */}
            <HeaderMarketSelector />
          </div>
        )}
      </div>
    </nav>
  );
}
