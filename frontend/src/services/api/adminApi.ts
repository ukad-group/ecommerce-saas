/**
 * Admin API
 *
 * API methods for admin operations on orders.
 * Uses the shared apiClient for HTTP requests.
 */

import { apiClient } from './client';
import type { Order, OrderStatus } from '../../types/order';

/**
 * Query parameters for fetching admin orders
 */
export interface AdminOrdersQueryParams {
  status?: OrderStatus;
  tenantId?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all orders (admin view)
 * Returns orders across all tenants with optional filtering
 */
export async function getAdminOrders(
  params?: AdminOrdersQueryParams
): Promise<Order[]> {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.append('status', params.status);
  if (params?.tenantId) queryParams.append('tenantId', params.tenantId);
  if (params?.searchQuery) queryParams.append('search', params.searchQuery);
  if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  const endpoint = `/admin/orders${query ? `?${query}` : ''}`;

  return apiClient.get<Order[]>(endpoint);
}

/**
 * Get a specific order by ID (admin view)
 * Returns full order details including all related data
 */
export async function getAdminOrderById(orderId: string): Promise<Order> {
  return apiClient.get<Order>(`/admin/orders/${orderId}`);
}

/**
 * Update order status (admin only)
 *
 * @param orderId - The ID of the order to update
 * @param newStatus - The new status to set
 * @param note - Optional note explaining the status change
 * @returns Updated order
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<Order> {
  return apiClient.put<Order>(`/admin/orders/${orderId}/status`, {
    status: newStatus,
    note,
  });
}

/**
 * Add a note to an order (admin only)
 *
 * @param orderId - The ID of the order
 * @param note - The note text to add
 * @returns Updated order
 */
export async function addOrderNote(
  orderId: string,
  note: string
): Promise<Order> {
  return apiClient.post<Order>(`/admin/orders/${orderId}/notes`, {
    note,
  });
}

/**
 * Process a refund for an order (admin only)
 *
 * @param orderId - The ID of the order
 * @param amount - The amount to refund
 * @param reason - Reason for the refund
 * @returns Updated order with refund transaction
 */
export async function processRefund(
  orderId: string,
  amount: number,
  reason: string
): Promise<Order> {
  return apiClient.post<Order>(`/admin/orders/${orderId}/refund`, {
    amount,
    reason,
  });
}

/**
 * Export orders to CSV/Excel (admin only)
 *
 * @param params - Optional filter parameters
 * @returns Blob data for download
 */
export async function exportOrders(
  params?: AdminOrdersQueryParams
): Promise<Blob> {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.append('status', params.status);
  if (params?.tenantId) queryParams.append('tenantId', params.tenantId);
  if (params?.searchQuery) queryParams.append('search', params.searchQuery);
  if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

  const query = queryParams.toString();
  const endpoint = `/admin/orders/export${query ? `?${query}` : ''}`;

  // This would typically return a blob for file download
  // For now, returning as a simple fetch call
  const response = await fetch(`${apiClient['baseURL']}${endpoint}`, {
    headers: {
      'X-Tenant-ID': apiClient['tenantId'],
    },
  });

  return response.blob();
}

/**
 * Export all admin API methods as a namespace
 */
export const adminApi = {
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  addOrderNote,
  processRefund,
  exportOrders,
};
