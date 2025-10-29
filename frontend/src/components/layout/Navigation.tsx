/**
 * Navigation Component
 *
 * Top navigation bar for the admin backoffice with role-based menu visibility.
 */

import { Link } from 'react-router-dom';
import { UserInfo } from '../auth/UserInfo';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';

export function Navigation() {
  const session = useAuthStore((state) => state.session);
  const userRole = session?.profile.role;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </nav>
  );
}
