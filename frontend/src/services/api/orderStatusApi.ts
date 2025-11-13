/**
 * Order Status API Service
 *
 * Handles API calls for managing custom order statuses per tenant.
 */

import { apiClient } from './client';
import type {
  OrderStatusDefinition,
  CreateOrderStatusRequest,
  UpdateOrderStatusRequest,
} from '../../types/orderStatus';

const BASE_PATH = '/order-statuses';

/**
 * Get all order statuses for the current tenant
 */
export async function getOrderStatuses(): Promise<OrderStatusDefinition[]> {
  return apiClient.get<OrderStatusDefinition[]>(BASE_PATH);
}

/**
 * Get only active order statuses (for dropdowns)
 */
export async function getActiveOrderStatuses(): Promise<OrderStatusDefinition[]> {
  return apiClient.get<OrderStatusDefinition[]>(`${BASE_PATH}/active`);
}

/**
 * Get a specific order status by ID
 */
export async function getOrderStatus(
  statusId: string
): Promise<OrderStatusDefinition> {
  return apiClient.get<OrderStatusDefinition>(`${BASE_PATH}/${statusId}`);
}

/**
 * Create a new order status
 */
export async function createOrderStatus(
  data: CreateOrderStatusRequest
): Promise<OrderStatusDefinition> {
  return apiClient.post<OrderStatusDefinition>(BASE_PATH, data);
}

/**
 * Update an existing order status
 */
export async function updateOrderStatus(
  statusId: string,
  data: UpdateOrderStatusRequest
): Promise<OrderStatusDefinition> {
  return apiClient.put<OrderStatusDefinition>(
    `${BASE_PATH}/${statusId}`,
    data
  );
}

/**
 * Delete an order status (only if not in use)
 */
export async function deleteOrderStatus(statusId: string): Promise<void> {
  await apiClient.delete(`${BASE_PATH}/${statusId}`);
}

/**
 * Reset to default statuses for the tenant
 */
export async function resetToDefaultStatuses(): Promise<OrderStatusDefinition[]> {
  return apiClient.post<OrderStatusDefinition[]>(
    `${BASE_PATH}/reset-defaults`,
    {}
  );
}
