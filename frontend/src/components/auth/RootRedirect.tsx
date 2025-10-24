/**
 * RootRedirect Component
 *
 * Handles redirect logic for the root route (/)
 * Redirects to /admin if authenticated, /login if not
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Root route redirect component
 * Checks authentication and redirects appropriately
 */
export function RootRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/login" replace />;
}
