/**
 * MSW Handlers Index
 *
 * Exports all API handlers for MSW setup.
 */

import { productsHandlers } from './products';
import { ordersHandlers } from './orders';
import { cartHandlers } from './cartHandlers';
import { adminHandlers } from './adminHandlers';
import { categoriesHandlers } from './categories';
import { checkoutHandlers } from './checkoutHandlers';
import { tenantHandlers } from './tenantHandlers';
import { marketHandlers } from './marketHandlers';
import { apiKeyHandlers } from './apiKeyHandlers';

export const handlers = [
  ...productsHandlers,
  ...ordersHandlers,
  ...cartHandlers,
  ...adminHandlers,
  ...categoriesHandlers,
  ...checkoutHandlers,
  ...tenantHandlers,
  ...marketHandlers,
  ...apiKeyHandlers,
];
