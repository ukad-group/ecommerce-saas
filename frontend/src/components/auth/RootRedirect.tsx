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
  const session = useAuthStore((state) => state.session);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Check if we have a valid session (not just the flag)
  const hasValidSession = isAuthenticated && session !== null;

  if (hasValidSession) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/login" replace />;
}
