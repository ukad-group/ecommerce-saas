/**
 * Admin Orders Page
 *
 * Dashboard for administrators to view and manage all orders across all tenants.
 * Displays orders in all statuses including "new" (carts), with filtering and search.
 */

import { useState } from 'react';
import { AdminOrderList } from '../../components/admin/AdminOrderList';
import { OrderFilters } from '../../components/admin/OrderFilters';
import { useAdminOrders } from '../../services/hooks/useAdminOrders';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { OrderStatus } from '../../types/order';

export function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data: orders, isLoading, error } = useAdminOrders({
    status: statusFilter === 'all' ? undefined : statusFilter,
    marketId: marketFilter === 'all' ? undefined : marketFilter,
    searchQuery: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage all orders across all tenants. Orders with status "new" are active carts.
          </p>
        </div>

        {/* Filters */}
        <OrderFilters
          statusFilter={statusFilter}
          marketFilter={marketFilter}
          searchQuery={searchQuery}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onStatusChange={setStatusFilter}
          onMarketChange={setMarketFilter}
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
