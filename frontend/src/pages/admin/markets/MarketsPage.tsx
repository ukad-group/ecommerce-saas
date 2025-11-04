/**
 * Markets Management Page
 *
 * Allows superadmins and tenant admins to manage markets.
 * - Superadmin: Can see and manage all markets
 * - Tenant Admin: Can see and manage only their tenant's markets
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, KeyIcon } from '@heroicons/react/24/outline';
import type { Market, MarketStatus, MarketType } from '../../../types/market';
import { useAuthStore } from '../../../store/authStore';
import { Role } from '../../../types/auth';

export function MarketsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MarketStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<MarketType | 'all'>('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const session = useAuthStore((state) => state.session);
  const userRole = session?.profile.role;
  const tenantId = session?.selectedTenantId;

  // Fetch markets
  const { data, isLoading, error } = useQuery<{
    data: Market[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['markets', { tenantId, search: searchTerm, status: statusFilter, type: typeFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      // Tenant admins only see their tenant's markets
      if (userRole === Role.TENANT_ADMIN && tenantId) {
        params.append('tenantId', tenantId);
      }

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/markets?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch markets');
      }
      return response.json();
    },
  });

  // Deactivate market mutation
  const deactivateMutation = useMutation({
    mutationFn: async (marketId: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/markets/${marketId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to deactivate market');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });

  // Reactivate market mutation
  const reactivateMutation = useMutation({
    mutationFn: async (marketId: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/markets/${marketId}/reactivate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to reactivate market');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });

  const handleStatusToggle = (market: Market) => {
    if (market.status === 'active') {
      if (confirm(`Are you sure you want to deactivate "${market.name}"? This will prevent new orders from being placed.`)) {
        deactivateMutation.mutate(market.id);
      }
    } else {
      reactivateMutation.mutate(market.id);
    }
  };

  const getTypeIcon = (type: MarketType) => {
    switch (type) {
      case 'physical':
        return '🏪';
      case 'online':
        return '🌐';
      case 'hybrid':
        return '🔄';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Markets</h1>
          <p className="mt-2 text-sm text-gray-700">
            {userRole === Role.SUPERADMIN
              ? 'Manage all markets across all tenants.'
              : 'Manage markets for your tenant.'}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="inline-block h-4 w-4 mr-2 -mt-0.5" />
            Create Market
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              name="search"
              id="search"
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <select
            id="type"
            name="type"
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MarketType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="physical">Physical</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <select
            id="status"
            name="status"
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MarketStatus | 'all')}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading markets...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-red-600">Error loading markets</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Code
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        API Keys
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Currency
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Updated
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data?.data.map((market) => (
                      <tr key={market.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {market.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {market.code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <span className="mr-1">{getTypeIcon(market.type)}</span>
                            {market.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              market.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {market.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <Link
                            to={`/admin/markets/${market.id}/api-keys`}
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                          >
                            <KeyIcon className="h-4 w-4 mr-1" />
                            {market.apiKeyCount || 0}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {market.currency}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(market.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleStatusToggle(market)}
                            className={`mr-4 ${
                              market.status === 'active'
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            disabled={deactivateMutation.isPending || reactivateMutation.isPending}
                          >
                            {market.status === 'active' ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <Link
                            to={`/admin/markets/${market.id}/api-keys`}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            API Keys
                          </Link>
                          <button className="text-indigo-600 hover:text-indigo-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination */}
              {data && data.total > 10 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(page * 10, data.total)}</span> of{' '}
                        <span className="font-medium">{data.total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={page * 10 >= data.total}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}