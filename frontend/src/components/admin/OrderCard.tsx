/**
 * OrderCard Component
 *
 * Mobile-friendly card view for orders
 * Used on small screens instead of table layout
 */

import { Link } from 'react-router-dom';
import type { Order } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const itemCount = order.lineItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const skuCount = order.lineItems?.length || 0;

  return (
    <Link
      to={`/admin/orders/${order.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200"
    >
      {/* Header Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[#4a6ba8]">
            {order.orderNumber}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Order Details */}
      <div className="space-y-2">
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total:</span>
          <span className="text-base font-bold text-gray-900">
            {formatCurrency(order.total, order.currency)}
          </span>
        </div>

        {/* Items */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Items:</span>
          <span className="text-sm text-gray-900">
            {itemCount} item{itemCount !== 1 ? 's' : ''} ({skuCount} SKU{skuCount !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Market */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Market:</span>
          <span className="text-sm text-gray-900 truncate max-w-[180px]">
            {order.marketId}
          </span>
        </div>
      </div>
    </Link>
  );
}
