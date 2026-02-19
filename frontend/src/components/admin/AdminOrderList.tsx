/**
 * Admin Order List Component
 *
 * Displays a table of all orders with key information.
 * Supports sorting and row click to view details.
 * Responsive: Shows cards on mobile, table on desktop.
 */

import { Link } from 'react-router-dom';
import type { Order } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderCard } from './OrderCard';
import { useResponsive } from '../../utils/useMediaQuery';

interface AdminOrderListProps {
  orders: Order[];
}

export function AdminOrderList({ orders }: AdminOrderListProps) {
  const { isMobile } = useResponsive();

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">No orders found matching your filters.</p>
        <p className="text-gray-400 text-sm mt-2">
          Try adjusting your search criteria or filters.
        </p>
      </div>
    );
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        
        {/* Summary Footer */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Showing <span className="font-medium">{orders.length}</span> order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Items
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Market
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="text-[#4a6ba8] hover:text-[#3d5789] font-medium"
                >
                  {order.orderNumber}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <div className="flex flex-col">
                  <span>{order.lineItems?.length || 0} SKU{order.lineItems?.length !== 1 ? 's' : ''}</span>
                  <span className="text-gray-400">
                    {order.lineItems?.reduce((sum, item) => sum + item.quantity, 0) || 0} item{order.lineItems?.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatCurrency(order.total, order.currency)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.marketId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{orders.length}</span> order{orders.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
