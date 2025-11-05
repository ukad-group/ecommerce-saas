/**
 * useAdminOrders Hook
 *
 * React Query hook for admin order management operations.
 * Provides data fetching, caching, and mutations for admin order views.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  addOrderNote,
  processRefund,
  type AdminOrdersQueryParams,
} from '../api/adminApi';
import type { OrderStatus } from '../../types/order';
import { useAuthStore } from '../../store/authStore';

/**
 * Hook to fetch all orders with optional filtering (admin view)
 * Automatically filters by selected tenant and market from auth context
 */
export function useAdminOrders(params?: AdminOrdersQueryParams) {
  const tenantId = useAuthStore((state) => state.getTenantId());
  const marketId = useAuthStore((state) => state.getMarketId());

  return useQuery({
    queryKey: ['admin', 'orders', tenantId, marketId, params],
    queryFn: () => getAdminOrders({
      ...params,
      marketId: marketId || undefined, // Pass marketId from auth context
    }),
    staleTime: 30000, // 30 seconds
    enabled: !!tenantId && !!marketId, // Only fetch when both are selected
  });
}

/**
 * Hook to fetch a specific order by ID (admin view)
 */
export function useAdminOrder(orderId: string) {
  return useQuery({
    queryKey: ['admin', 'orders', orderId],
    queryFn: () => getAdminOrderById(orderId),
    enabled: !!orderId,
  });
}

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      newStatus,
      note,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      note?: string;
    }) => updateOrderStatus(orderId, newStatus, note),
    onSuccess: (updatedOrder) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });

      // Update the specific order in cache
      queryClient.setQueryData(
        ['admin', 'orders', updatedOrder.id],
        updatedOrder
      );
    },
  });
}

/**
 * Hook to add a note to an order
 */
export function useAddOrderNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) =>
      addOrderNote(orderId, note),
    onSuccess: (updatedOrder) => {
      // Invalidate and refetch the specific order
      queryClient.invalidateQueries({
        queryKey: ['admin', 'orders', updatedOrder.id],
      });
    },
  });
}

/**
 * Hook to process a refund for an order
 */
export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      amount,
      reason,
    }: {
      orderId: string;
      amount: number;
      reason: string;
    }) => processRefund(orderId, amount, reason),
    onSuccess: (updatedOrder) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });

      // Update the specific order in cache
      queryClient.setQueryData(
        ['admin', 'orders', updatedOrder.id],
        updatedOrder
      );
    },
  });
}
