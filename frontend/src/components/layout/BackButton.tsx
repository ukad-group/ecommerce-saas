/**
 * BackButton Component
 *
 * Shared "go back" control rendered above every admin page except the dashboard,
 * so navigating back doesn't depend on the browser's back button.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Button } from '../common/Button';

export function BackButton() {
  const { pathname, key } = useLocation();
  const navigate = useNavigate();

  // Dashboard is the root of the admin area - nothing to go back to.
  if (!pathname.startsWith('/admin') || pathname === '/admin') return null;

  // key === 'default' means this is the first entry in the history stack, so
  // navigate(-1) would leave the app.
  // ponytail: fall back to the dashboard, not the parent path - parent paths
  // like /admin/products/:id (from .../edit) aren't routes.
  const goBack = () => (key === 'default' ? navigate('/admin') : navigate(-1));

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <Button variant="secondary" onClick={goBack} className="inline-flex items-center">
        <ArrowLeftIcon className="h-4 w-4 mr-2" aria-hidden="true" />
        Back
      </Button>
    </div>
  );
}
