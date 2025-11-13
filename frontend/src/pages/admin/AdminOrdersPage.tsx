/**
 * Admin Orders Page
 *
 * Dashboard for administrators to view and manage all orders across all tenants.
 * Displays orders in all statuses including "new" (carts), with filtering and search.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminOrderList } from '../../components/admin/AdminOrderList';
import { OrderFilters } from '../../components/admin/OrderFilters';
import { useAdminOrders } from '../../services/hooks/useAdminOrders';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import type { OrderStatus } from '../../types/order';

export function AdminOrdersPage() {
  const session = useAuthStore((state) => state.session);
  const userRole = session?.profile.role;

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data: orders, isLoading, error } = useAdminOrders({
    status: statusFilter === 'all' ? undefined : statusFilter,
    searchQuery: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
              <p className="mt-2 text-sm text-gray-600">
                View and manage all orders across all tenants. Orders with status "new" are active carts.
              </p>
            </div>
            {(userRole === Role.SUPERADMIN || userRole === Role.TENANT_ADMIN) && (
              <Link
                to="/admin/order-statuses"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Order Statuses
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <OrderFilters
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchQuery}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        {/* Orders List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading orders: {error.message}</p>
            </div>
          ) : (
            <AdminOrderList orders={orders || []} />
          )}
        </div>
      </div>
    </div>
  );
}
