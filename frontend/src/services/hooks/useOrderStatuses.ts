/**
 * Order Status Management Hooks
 *
 * React Query hooks for managing order statuses.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrderStatuses,
  getActiveOrderStatuses,
  getOrderStatus,
  createOrderStatus,
  updateOrderStatus,
  deleteOrderStatus,
  resetToDefaultStatuses,
} from '../api/orderStatusApi';
import type {
  CreateOrderStatusRequest,
  UpdateOrderStatusRequest,
} from '../../types/orderStatus';
import { useAuthStore } from '../../store/authStore';

const QUERY_KEY = 'orderStatuses';

/**
 * Hook to fetch all order statuses for a tenant
 */
export function useOrderStatuses() {
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useQuery({
    queryKey: [QUERY_KEY, tenantId],
    queryFn: () => getOrderStatuses(),
    enabled: !!tenantId,
  });
}

/**
 * Hook to fetch active order statuses only
 */
export function useActiveOrderStatuses() {
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useQuery({
    queryKey: [QUERY_KEY, tenantId, 'active'],
    queryFn: () => getActiveOrderStatuses(),
    enabled: !!tenantId,
  });
}

/**
 * Hook to fetch a specific order status
 */
export function useOrderStatus(statusId: string) {
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useQuery({
    queryKey: [QUERY_KEY, tenantId, statusId],
    queryFn: () => getOrderStatus(statusId),
    enabled: !!tenantId && !!statusId,
  });
}

/**
 * Hook to create a new order status
 */
export function useCreateOrderStatus() {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useMutation({
    mutationFn: (data: CreateOrderStatusRequest) => createOrderStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
    },
  });
}

/**
 * Hook to update an order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useMutation({
    mutationFn: ({
      statusId,
      data,
    }: {
      statusId: string;
      data: UpdateOrderStatusRequest;
    }) => updateOrderStatus(statusId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
    },
  });
}

/**
 * Hook to delete an order status
 */
export function useDeleteOrderStatus() {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useMutation({
    mutationFn: (statusId: string) => deleteOrderStatus(statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
    },
  });
}

/**
 * Hook to reset to default statuses
 */
export function useResetToDefaultStatuses() {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.getTenantId());

  return useMutation({
    mutationFn: () => resetToDefaultStatuses(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, tenantId] });
    },
  });
}
