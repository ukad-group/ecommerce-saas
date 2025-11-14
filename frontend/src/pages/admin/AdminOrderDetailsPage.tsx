/**
 * Admin Order Details Page
 *
 * Detailed view of a single order for administrators.
 * Shows order information, line items, addresses, payment, and allows status updates.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useAdminOrder } from '../../services/hooks/useAdminOrders';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { OrderStatusUpdate } from '../../components/admin/OrderStatusUpdate';
import { formatCurrency } from '../../utils/currency';
import { getSmallImageUrl } from '../../utils/imageHelper';

export function AdminOrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useAdminOrder(orderId!);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Error loading order: {error?.message || 'Order not found'}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/orders')} className="mt-4">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/orders')}
            className="mb-4"
          >
            ← Back to Orders
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Order {order.orderNumber}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Created {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Line Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items
              </h2>
              <div className="space-y-4">
                {order.lineItems?.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b border-gray-200 last:border-0"
                  >
                    <div className="flex-shrink-0 w-20 h-20">
                      <img
                        src={
                          (item as any).productImageUrl
                            ? getSmallImageUrl((item as any).productImageUrl)
                            : 'https://dummyimage.com/80x80/AAA/fff.png&text=No+Image'
                        }
                        alt={item.productName}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-900">
                        {item.productName}
                      </h3>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {formatCurrency(item.unitPrice, item.currency)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.lineTotal, item.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">
                      {formatCurrency(order.subtotal, order.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">
                      {formatCurrency(order.tax, order.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">
                      {formatCurrency(order.shipping, order.currency)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-green-600">
                        -{formatCurrency(order.discount, order.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">
                      {formatCurrency(order.total, order.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            {(order.shippingAddress || order.billingAddress) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Addresses
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {order.shippingAddress && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">
                        Shipping Address
                      </h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{order.shippingAddress.fullName}</p>
                        <p>{order.shippingAddress.addressLine1}</p>
                        {order.shippingAddress.addressLine2 && (
                          <p>{order.shippingAddress.addressLine2}</p>
                        )}
                        <p>
                          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                          {order.shippingAddress.postalCode}
                        </p>
                        <p>{order.shippingAddress.country}</p>
                        {order.shippingAddress.phone && (
                          <p>{order.shippingAddress.phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {order.billingAddress && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">
                        Billing Address
                      </h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{order.billingAddress.fullName}</p>
                        <p>{order.billingAddress.addressLine1}</p>
                        {order.billingAddress.addressLine2 && (
                          <p>{order.billingAddress.addressLine2}</p>
                        )}
                        <p>
                          {order.billingAddress.city}, {order.billingAddress.state}{' '}
                          {order.billingAddress.postalCode}
                        </p>
                        <p>{order.billingAddress.country}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Transactions */}
            {order.transactions && order.transactions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Payment Information
                </h2>
                {order.transactions.map((transaction) => (
                  <div key={transaction.id} className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID</span>
                      <span className="text-gray-900 font-mono">
                        {transaction.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount</span>
                      <span className="text-gray-900">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="text-gray-900">
                        {transaction.cardBrand} •••• {transaction.cardLast4}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="text-green-600 font-medium">
                        {transaction.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed At</span>
                      <span className="text-gray-900">
                        {new Date(transaction.processedAt || transaction.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Order Information
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Order ID</span>
                  <p className="text-gray-900 font-mono">{order.id}</p>
                </div>
                <div>
                  <span className="text-gray-600">Tenant ID</span>
                  <p className="text-gray-900">{order.tenantId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Market ID</span>
                  <p className="text-gray-900">{order.marketId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Created</span>
                  <p className="text-gray-900">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                {order.submittedAt && (
                  <div>
                    <span className="text-gray-600">Submitted</span>
                    <p className="text-gray-900">
                      {new Date(order.submittedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {order.completedAt && (
                  <div>
                    <span className="text-gray-600">Completed</span>
                    <p className="text-gray-900">
                      {new Date(order.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Update */}
            <OrderStatusUpdate order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}
