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
import { categoriesHandlers } from './categories';
import { checkoutHandlers } from './checkoutHandlers';

export const handlers = [
  ...productsHandlers,
  ...ordersHandlers,
  ...customersHandlers,
  ...cartHandlers,
  ...adminHandlers,
  ...categoriesHandlers,
  ...checkoutHandlers,
];
