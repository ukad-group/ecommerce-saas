/**
 * Order Status Type Definitions
 *
 * Defines types for custom order status management.
 * Each tenant can define their own order statuses.
 */

/**
 * Order status definition entity
 * Represents a custom order status for a tenant
 */
export interface OrderStatusDefinition {
  id: string;
  tenantId: string;
  name: string; // Display name (e.g., "Pending Payment")
  code: string; // URL-safe code (e.g., "pending-payment")
  color: string; // Hex color code (e.g., "#3B82F6")
  sortOrder: number; // Display order
  isSystemDefault: boolean; // Cannot be deleted if true
  isActive: boolean; // Whether status is available for use
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
}

/**
 * Request to create a new order status
 */
export interface CreateOrderStatusRequest {
  name: string;
  code: string;
  color?: string;
  sortOrder: number;
}

/**
 * Request to update an existing order status
 */
export interface UpdateOrderStatusRequest {
  name?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Default status presets for reference
 */
export const DEFAULT_ORDER_STATUSES: Pick<OrderStatusDefinition, 'name' | 'code' | 'color' | 'sortOrder'>[] = [
  { name: 'New', code: 'new', color: '#6B7280', sortOrder: 1 },
  { name: 'Submitted', code: 'submitted', color: '#3B82F6', sortOrder: 2 },
  { name: 'Paid', code: 'paid', color: '#10B981', sortOrder: 3 },
  { name: 'Processing', code: 'processing', color: '#F59E0B', sortOrder: 4 },
  { name: 'Completed', code: 'completed', color: '#059669', sortOrder: 5 },
  { name: 'Cancelled', code: 'cancelled', color: '#EF4444', sortOrder: 6 },
  { name: 'On Hold', code: 'on-hold', color: '#F59E0B', sortOrder: 7 },
  { name: 'Refunded', code: 'refunded', color: '#8B5CF6', sortOrder: 8 },
];
