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
  marketFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  onStatusChange: (status: OrderStatus | 'all') => void;
  onMarketChange: (market: string) => void;
  onSearchChange: (query: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
}

export function OrderFilters({
  statusFilter,
  marketFilter,
  searchQuery,
  dateFrom,
  dateTo,
  onStatusChange,
  onMarketChange,
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

  const marketOptions = [
    { value: 'all', label: 'All Markets' },
    { value: 'market-1', label: 'Downtown Store' },
    { value: 'market-2', label: 'Airport Location' },
    { value: 'market-3', label: 'Online Store' },
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

        {/* Market Filter */}
        <Select
          label="Market"
          id="market-filter"
          value={marketFilter}
          onChange={(e) => onMarketChange(e.target.value)}
          options={marketOptions}
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
        placeholder="Search by order number..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
