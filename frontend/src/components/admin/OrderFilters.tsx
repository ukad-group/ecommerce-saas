/**
 * Order Filters Component
 *
 * Provides filtering controls for admin order list.
 * Supports status, market, date range, and text search.
 */

import { Select } from '../common/Select';
import { Input } from '../common/Input';
import type { OrderStatus } from '../../types/order';

interface OrderFiltersProps {
  statusFilter: OrderStatus | 'all';
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  onStatusChange: (status: OrderStatus | 'all') => void;
  onSearchChange: (query: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
}

export function OrderFilters({
  statusFilter,
  searchQuery,
  dateFrom,
  dateTo,
  onStatusChange,
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

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      {/* First row: Date filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Second row: Search and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search */}
        <Input
          label="Search"
          id="search"
          type="text"
          placeholder="Search by order number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        {/* Status Filter */}
        <Select
          label="Status"
          id="status-filter"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as OrderStatus | 'all')}
          options={statusOptions}
        />
      </div>
    </div>
  );
}
