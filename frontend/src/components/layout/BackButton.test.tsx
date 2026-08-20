/**
 * BackButton Tests
 *
 * Covers where the button shows up and where a fresh-entry click lands.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { BackButton } from './BackButton';

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '*', element: <BackButton /> },
      { path: '/admin', element: <BackButton /> },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('BackButton', () => {
  it('is hidden on the dashboard and outside the admin area', () => {
    renderAt('/admin');
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

    renderAt('/cart');
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('shows on admin pages below the dashboard', () => {
    renderAt('/admin/orders');
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('falls back to the dashboard when there is no in-app history', async () => {
    const router = renderAt('/admin/orders/ORD-1');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(router.state.location.pathname).toBe('/admin');
  });
});
