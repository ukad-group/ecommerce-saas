/**
 * MSW Browser Setup
 *
 * Mock Service Worker configuration for browser/development.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW worker for intercepting requests in the browser
 * Used in development with VITE_USE_MOCKS=true
 */
export const worker = setupWorker(...handlers);

// Configure to warn about unhandled requests
worker.events.on('request:unhandled', ({ request }) => {
  console.warn('Unhandled %s request to %s', request.method, request.url);
});
