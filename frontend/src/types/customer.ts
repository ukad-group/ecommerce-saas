/**
 * Customer Type Definitions
 *
 * Defines types for customers.
 * Based on specs/002-cart-order-management/data-model.md
 */

/**
 * Customer entity
 * Represents a customer who can place orders (subset relevant to orders context)
 */
export interface Customer {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isGuest: boolean;
  createdAt: string; // ISO 8601
}
