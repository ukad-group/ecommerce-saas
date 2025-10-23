/**
 * MSW Handlers Index
 *
 * Exports all API handlers for MSW setup.
 */

import { productsHandlers } from './products';
import { ordersHandlers } from './orders';
import { customersHandlers } from './customers';
import { cartHandlers } from './cartHandlers';
import { adminHandlers } from './adminHandlers';

export const handlers = [
  ...productsHandlers,
  ...ordersHandlers,
  ...customersHandlers,
  ...cartHandlers,
  ...adminHandlers,
];
