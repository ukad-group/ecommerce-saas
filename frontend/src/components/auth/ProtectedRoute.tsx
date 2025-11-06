/**
 * ProtectedRoute Component
 *
 * Wrapper component that checks authentication and redirects to login if needed
 * Used to protect admin routes from unauthenticated access
 * Optionally checks for specific roles
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

/**
 * Protects routes by checking authentication status and optionally role permissions
 *
 * If user is not authenticated, redirects to /login
 * If user is authenticated but doesn't have required role, redirects to /admin
 * If user is authenticated and has required role (or no role check), renders the children components
 *
 * @example
 * <Route
 *   path="/admin/*"
 *   element={
 *     <ProtectedRoute>
 *       <AdminLayout />
 *     </ProtectedRoute>
 *   }
 * />
 *
 * @example
 * <Route
 *   path="/admin/tenants"
 *   element={
 *     <ProtectedRoute allowedRoles={[Role.SUPERADMIN]}>
 *       <TenantsPage />
 *     </ProtectedRoute>
 *   }
 * />
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, getRole } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    getRole: state.getRole,
  }));

  if (!isAuthenticated) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" replace />;
  }

  // Check role permissions if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getRole();
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User doesn't have required role, redirect to admin dashboard
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
}
