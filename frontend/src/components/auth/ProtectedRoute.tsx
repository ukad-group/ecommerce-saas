/**
 * ProtectedRoute Component
 *
 * Wrapper component that checks authentication and redirects to login if needed
 * Used to protect admin routes from unauthenticated access
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protects routes by checking authentication status
 *
 * If user is not authenticated, redirects to /login
 * If user is authenticated, renders the children components
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
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
