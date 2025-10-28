/**
 * Application Entry Point
 *
 * Initializes MSW (if enabled) and renders the React application.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

/**
 * Start MSW worker if mocking is enabled
 * Controlled by VITE_USE_MOCKS environment variable
 */
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // Start the worker with onUnhandledRequest set to 'warn'
  return worker.start({
    onUnhandledRequest: 'warn',
  });
}

/**
 * Initialize application
 * Starts MSW (if enabled) then renders React app
 */
enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
