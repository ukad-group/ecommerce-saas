/**
 * Layout Component
 *
 * Main layout wrapper with navigation.
 */

import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { BackButton } from './BackButton';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <BackButton />
      <Outlet />
    </div>
  );
}
