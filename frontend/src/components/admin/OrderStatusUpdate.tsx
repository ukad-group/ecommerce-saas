/**
 * Order Status Update Component
 *
 * Allows administrators to update order status and add notes.
 */

import { useState } from 'react';
import type { Order, OrderStatus } from '../../types/order';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { useUpdateOrderStatus } from '../../services/hooks/useAdminOrders';
import { useActiveOrderStatuses } from '../../services/hooks/useOrderStatuses';

interface OrderStatusUpdateProps {
  order: Order;
}

export function OrderStatusUpdate({ order }: OrderStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [notes, setNotes] = useState('');
  const updateStatus = useUpdateOrderStatus();

  // Fetch active order statuses from the API
  const { data: orderStatuses = [], isLoading: isLoadingStatuses } = useActiveOrderStatuses();

  // Convert to options format for Select component
  const statusOptions = orderStatuses.map(status => ({
    value: status.code,
    label: status.name,
  }));

  const handleUpdateStatus = () => {
    if (selectedStatus === order.status && !notes) {
      return; // No changes
    }

    updateStatus.mutate(
      {
        orderId: order.id,
        newStatus: selectedStatus,
        note: notes,
      },
      {
        onSuccess: () => {
          setNotes('');
        },
      }
    );
  };

  const hasChanges = selectedStatus !== order.status || notes.trim() !== '';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Update Order Status
      </h2>

      <div className="space-y-4">
        {/* Current Status Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Status
          </label>
          <p className="text-gray-900 capitalize">{order.status.replace('-', ' ')}</p>
        </div>

        {/* Status Selector */}
        <div>
          <Select
            label="New Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
            options={statusOptions}
            disabled={isLoadingStatuses || statusOptions.length === 0}
          />
          {isLoadingStatuses && (
            <p className="text-xs text-gray-500 mt-1">Loading statuses...</p>
          )}
          {!isLoadingStatuses && statusOptions.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No statuses available. Please configure order statuses first.
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="status-notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes (Optional)
          </label>
          <textarea
            id="status-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this status change..."
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Update Button */}
        <Button
          onClick={handleUpdateStatus}
          disabled={!hasChanges || updateStatus.isPending}
          className="w-full"
        >
          {updateStatus.isPending ? 'Updating...' : 'Update Status'}
        </Button>

        {/* Error Display */}
        {updateStatus.error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">
              Error: {updateStatus.error.message}
            </p>
          </div>
        )}

        {/* Success Display */}
        {updateStatus.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-sm text-green-800">
              Status updated successfully!
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          Available statuses are configured in{' '}
          <a href="/admin/order-statuses" className="text-[#4a6ba8] hover:text-[#3d5789]">
            Order Status Management
          </a>
        </p>
      </div>
    </div>
  );
}
