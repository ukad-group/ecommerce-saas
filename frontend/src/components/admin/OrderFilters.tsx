/**
 * Order Filters Component
 *
 * Provides filtering controls for admin order list.
 * Supports status, tenant, date range, and text search.
 */

import { Select } from '../common/Select';
import { Input } from '../common/Input';
import type { OrderStatus } from '../../types/order';

interface OrderFiltersProps {
  statusFilter: OrderStatus | 'all';
  tenantFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  onStatusChange: (status: OrderStatus | 'all') => void;
  onTenantChange: (tenant: string) => void;
  onSearchChange: (query: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
}

export function OrderFilters({
  statusFilter,
  tenantFilter,
  searchQuery,
  dateFrom,
  dateTo,
  onStatusChange,
  onTenantChange,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
}: OrderFiltersProps) {
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'new', label: 'Cart (New)' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'paid', label: 'Paid' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'on-hold', label: 'On Hold' },
  ];

  const tenantOptions = [
    { value: 'all', label: 'All Tenants' },
    { value: 'default-tenant', label: 'Default Tenant' },
    { value: 'tenant-001', label: 'Tenant 001' },
    { value: 'tenant-002', label: 'Tenant 002' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <Select
          label="Status"
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as OrderStatus | 'all')}
          options={statusOptions}
        />

        {/* Tenant Filter */}
        <Select
          label="Tenant"
          id="tenant-filter"
          value={tenantFilter}
          onChange={(e) => onTenantChange(e.target.value)}
          options={tenantOptions}
        />

        {/* Date From */}
        <Input
          label="From Date"
          id="date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />

        {/* Date To */}
        <Input
          label="To Date"
          id="date-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>

      {/* Search */}
      <Input
        label="Search"
        id="search"
        type="text"
        placeholder="Search by order number, customer name, or email..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
