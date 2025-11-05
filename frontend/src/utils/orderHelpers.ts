/**
 * Order Helper Utilities
 *
 * Helper functions for order status management and display
 */

import type { OrderStatus } from '../types/order';

/**
 * Status transition rules
 * Defines which status transitions are valid from each state
 */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'new': ['submitted', 'cancelled'],
  'submitted': ['paid', 'cancelled', 'on-hold'],
  'paid': ['processing', 'refunded', 'cancelled'],
  'processing': ['completed', 'on-hold', 'cancelled'],
  'completed': ['refunded'],
  'cancelled': [], // Terminal state - no transitions allowed
  'refunded': [], // Terminal state - no transitions allowed
  'on-hold': ['processing', 'cancelled'],
};

/**
 * Gets all valid status transitions from the current status
 *
 * @param currentStatus - The current order status
 * @returns Array of valid next statuses
 *
 * @example
 * const nextStatuses = getValidStatusTransitions('submitted');
 * // Returns: ['paid', 'cancelled', 'on-hold']
 */
export function getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Checks if a status transition is valid
 *
 * @param from - Current status
 * @param to - Desired next status
 * @returns true if transition is valid, false otherwise
 *
 * @example
 * const canTransition = canTransitionTo('submitted', 'paid'); // true
 * const cannotTransition = canTransitionTo('completed', 'submitted'); // false
 */
export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  const validTransitions = STATUS_TRANSITIONS[from] || [];
  return validTransitions.includes(to);
}

/**
 * Gets the color class for a status badge (Tailwind CSS)
 *
 * @param status - The order status
 * @returns Tailwind color classes for the status
 *
 * @example
 * const color = getStatusColor('paid');
 * // Returns: 'bg-green-100 text-green-800'
 */
export function getStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    'new': 'bg-gray-100 text-gray-800',
    'submitted': 'bg-primary-100 text-primary-800',
    'paid': 'bg-green-100 text-green-800',
    'processing': 'bg-purple-100 text-purple-800',
    'completed': 'bg-emerald-100 text-emerald-800',
    'cancelled': 'bg-red-100 text-red-800',
    'refunded': 'bg-orange-100 text-orange-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Gets a human-readable label for a status
 *
 * @param status - The order status
 * @returns User-friendly status label
 *
 * @example
 * const label = getStatusLabel('on-hold');
 * // Returns: 'On Hold'
 */
export function getStatusLabel(status: OrderStatus): string {
  const labelMap: Record<OrderStatus, string> = {
    'new': 'New',
    'submitted': 'Submitted',
    'paid': 'Paid',
    'processing': 'Processing',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded',
    'on-hold': 'On Hold',
  };

  return labelMap[status] || status;
}

/**
 * Checks if an order status is terminal (no further transitions possible)
 *
 * @param status - The order status to check
 * @returns true if status is terminal, false otherwise
 *
 * @example
 * isTerminalStatus('completed'); // true
 * isTerminalStatus('processing'); // false
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'refunded';
}

/**
 * Checks if an order is still a cart (not yet submitted)
 *
 * @param status - The order status to check
 * @returns true if order is a cart, false otherwise
 *
 * @example
 * isCart('new'); // true
 * isCart('submitted'); // false
 */
export function isCart(status: OrderStatus): boolean {
  return status === 'new';
}

/**
 * Gets all possible order statuses
 *
 * @returns Array of all order statuses
 */
export function getAllStatuses(): OrderStatus[] {
  return [
    'new',
    'submitted',
    'paid',
    'processing',
    'completed',
    'cancelled',
    'refunded',
    'on-hold',
  ];
}
