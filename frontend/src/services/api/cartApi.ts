/**
 * Cart API
 *
 * API methods for shopping cart operations.
 * Uses the shared apiClient for HTTP requests.
 */

import { apiClient } from './client';
import type { Order } from '../../types/order';

/**
 * Get the current user's shopping cart
 * Returns an Order with status 'new'
 */
export async function getCart(): Promise<Order> {
  return apiClient.get<Order>('/cart');
}

/**
 * Add a product to the shopping cart
 *
 * @param productId - The ID of the product to add
 * @param quantity - The quantity to add (default: 1)
 * @returns Updated cart (Order)
 */
export async function addToCart(
  productId: string,
  quantity: number = 1
): Promise<Order> {
  return apiClient.post<Order>('/cart/items', {
    productId,
    quantity,
  });
}

/**
 * Update the quantity of a line item in the cart
 *
 * @param lineItemId - The ID of the line item to update
 * @param quantity - The new quantity
 * @returns Updated cart (Order)
 */
export async function updateCartItem(
  lineItemId: string,
  quantity: number
): Promise<Order> {
  return apiClient.put<Order>(`/cart/items/${lineItemId}`, {
    quantity,
  });
}

/**
 * Remove a line item from the cart
 *
 * @param lineItemId - The ID of the line item to remove
 * @returns Updated cart (Order)
 */
export async function removeCartItem(lineItemId: string): Promise<Order> {
  return apiClient.delete<Order>(`/cart/items/${lineItemId}`);
}

/**
 * Clear the entire shopping cart
 * Removes all line items
 */
export async function clearCart(): Promise<void> {
  return apiClient.delete<void>('/cart');
}

/**
 * Export all cart API methods as a namespace
 */
export const cartApi = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
