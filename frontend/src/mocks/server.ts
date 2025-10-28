/**
 * MSW Server Setup
 *
 * Mock Service Worker configuration for Node.js/testing.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for intercepting requests in Node.js environment
 * Used in tests with vitest
 */
export const server = setupServer(...handlers);
