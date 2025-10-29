/**
 * Address Type Definitions
 *
 * Defines types for shipping and billing addresses.
 * Based on specs/002-cart-order-management/data-model.md
 */

/**
 * Generic address interface
 * Used for tenant and market addresses
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Shipping address entity
 * Order's shipping address for order delivery
 */
export interface ShippingAddress {
  id?: string;
  orderId?: string;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

/**
 * Billing address entity
 * Order's billing address for payment processing
 */
export interface BillingAddress {
  id?: string;
  orderId?: string;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  sameAsShipping?: boolean;
}
