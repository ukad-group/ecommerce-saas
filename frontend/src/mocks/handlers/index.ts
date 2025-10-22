/**
 * MSW Handlers Index
 *
 * Exports all API handlers for MSW setup.
 */

import { productsHandlers } from './products';
import { ordersHandlers } from './orders';
import { customersHandlers } from './customers';

export const handlers = [
  ...productsHandlers,
  ...ordersHandlers,
  ...customersHandlers,
];
