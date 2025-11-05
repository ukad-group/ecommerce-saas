/**
 * Admin Dashboard Page
 *
 * Main landing page for administrators showing key metrics and quick actions.
 */

import { Link } from 'react-router-dom';
import { useAdminOrders } from '../../services/hooks/useAdminOrders';
import { useProducts } from '../../services/hooks/useProducts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/currency';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  link?: string;
  linkText?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo';
}

function MetricCard({
  title,
  value,
  subtitle,
  link,
  linkText,
  color = 'blue',
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-primary-50 border-primary-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {link && linkText && (
        <Link
          to={link}
          className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
        >
          {linkText} →
        </Link>
      )}
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: allOrders, isLoading: ordersLoading } = useAdminOrders();
  const { data: allProducts, isLoading: productsLoading } = useProducts();

  if (ordersLoading || productsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate metrics
  const totalOrders = allOrders?.length || 0;
  const activeCarts = allOrders?.filter((o) => o.status === 'new').length || 0;
  const pendingOrders =
    allOrders?.filter((o) => o.status === 'submitted' || o.status === 'paid')
      .length || 0;
  const completedOrders =
    allOrders?.filter((o) => o.status === 'completed').length || 0;

  const totalProducts = allProducts?.length || 0;
  const activeProducts =
    allProducts?.filter((p) => p.status === 'active').length || 0;
  const lowStockProducts =
    allProducts?.filter((p) =>
      !p.hasVariants &&
      p.stockQuantity !== undefined &&
      p.lowStockThreshold !== undefined &&
      p.stockQuantity <= p.lowStockThreshold
    ).length || 0;
  const outOfStockProducts =
    allProducts?.filter((p) => !p.hasVariants && p.stockQuantity === 0).length || 0;

  const totalRevenue =
    allOrders
      ?.filter((o) => o.status === 'completed' || o.status === 'paid')
      .reduce((sum, order) => sum + order.total, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Overview of your eCommerce operations
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Orders"
            value={totalOrders}
            subtitle="All time"
            link="/admin/orders"
            linkText="View all orders"
            color="indigo"
          />
          <MetricCard
            title="Active Carts"
            value={activeCarts}
            subtitle="In-progress shopping carts"
            link="/admin/orders?status=new"
            linkText="View carts"
            color="blue"
          />
          <MetricCard
            title="Pending Orders"
            value={pendingOrders}
            subtitle="Awaiting fulfillment"
            link="/admin/orders?status=submitted,paid"
            linkText="Process orders"
            color="yellow"
          />
          <MetricCard
            title="Completed Orders"
            value={completedOrders}
            subtitle="Successfully fulfilled"
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue, 'USD')}
            subtitle="Paid & completed orders"
            color="green"
          />
          <MetricCard
            title="Total Products"
            value={totalProducts}
            subtitle={`${activeProducts} active`}
            link="/admin/products"
            linkText="Manage products"
            color="indigo"
          />
          <MetricCard
            title="Low Stock"
            value={lowStockProducts}
            subtitle="Products below threshold"
            link="/admin/products"
            linkText="Update inventory"
            color="yellow"
          />
          <MetricCard
            title="Out of Stock"
            value={outOfStockProducts}
            subtitle="Products with 0 stock"
            link="/admin/products"
            linkText="Restock now"
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/products/new"
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <span className="text-lg mr-2">+</span>
              Create New Product
            </Link>
            <Link
              to="/admin/categories/new"
              className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <span className="text-lg mr-2">+</span>
              Create New Category
            </Link>
            <Link
              to="/admin/orders"
              className="flex items-center justify-center px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              View All Orders
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Orders
            </h2>
            <Link
              to="/admin/orders"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allOrders?.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="capitalize">{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatCurrency(order.total, order.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!allOrders || allOrders.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No orders yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
