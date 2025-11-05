/**
 * Order Status Badge Component
 *
 * Displays order status with appropriate color coding.
 */

import type { OrderStatus } from '../../types/order';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  new: {
    label: 'Cart',
    className: 'bg-gray-100 text-gray-800',
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-primary-100 text-primary-800',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-800',
  },
  processing: {
    label: 'Processing',
    className: 'bg-yellow-100 text-yellow-800',
  },
  completed: {
    label: 'Completed',
    className: 'bg-indigo-100 text-indigo-800',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-purple-100 text-purple-800',
  },
  'on-hold': {
    label: 'On Hold',
    className: 'bg-orange-100 text-orange-800',
  },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
