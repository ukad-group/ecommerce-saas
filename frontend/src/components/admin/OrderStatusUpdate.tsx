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

interface OrderStatusUpdateProps {
  order: Order;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Cart (New)' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

export function OrderStatusUpdate({ order }: OrderStatusUpdateProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [notes, setNotes] = useState('');
  const updateStatus = useUpdateOrderStatus();

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
            options={STATUS_OPTIONS}
          />
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

      {/* Status Change Guidelines */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Status Guidelines
        </h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>New:</strong> Active shopping cart</li>
          <li>• <strong>Submitted:</strong> Order placed, awaiting payment</li>
          <li>• <strong>Paid:</strong> Payment received</li>
          <li>• <strong>Processing:</strong> Order being prepared</li>
          <li>• <strong>On Hold:</strong> Temporary hold (inventory, verification)</li>
          <li>• <strong>Completed:</strong> Order fulfilled and shipped</li>
          <li>• <strong>Cancelled:</strong> Order cancelled</li>
          <li>• <strong>Refunded:</strong> Payment refunded</li>
        </ul>
      </div>
    </div>
  );
}
