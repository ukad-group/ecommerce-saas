/**
 * Order Type Definitions
 *
 * Defines types for orders, line items, and order status tracking.
 * Based on specs/002-cart-order-management/data-model.md
 */

/**
 * Order status type union
 * Represents the lifecycle stage of an order from cart to completion
 */
export type OrderStatus = 'new' | 'submitted' | 'paid' | 'completed' | 'cancelled' | 'refunded' | 'on-hold' | 'processing';

/**
 * Order entity
 * Represents both shopping carts (status='new') and submitted orders (status!='new')
 * Orders are market-specific
 */
export interface Order {
  id: string;
  tenantId: string;
  marketId: string; // NEW: Orders are market-specific
  customerId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  isGuest: boolean;
  guestEmail?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  submittedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  cancelledAt?: string; // ISO 8601
  cancellationReason?: string;
  metadata?: Record<string, any>;

  // Relationships (populated in API responses)
  lineItems?: OrderLineItem[];
  shippingAddress?: any; // ShippingAddress from address.ts
  billingAddress?: any; // BillingAddress from address.ts
  transactions?: any[]; // PaymentTransaction from payment.ts
  statusHistory?: OrderStatusHistory[];
}

/**
 * Order line item entity
 * Represents a single product entry within an order
 */
export interface OrderLineItem {
  id: string;
  orderId: string;
  productId: string;
  marketId: string; // NEW: Product's market (should match order's market)
  productName: string;
  sku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currency: string;
  stockQuantity?: number; // Current stock level for out-of-stock warnings
  metadata?: Record<string, any>;
}

/**
 * Order status history entry
 * Audit trail of all status changes for an order
 */
export interface OrderStatusHistory {
  id: string;
  orderId: string;
  oldStatus?: OrderStatus;
  newStatus: OrderStatus;
  changedAt: string; // ISO 8601
  changedBy?: string;
  notes?: string;
  metadata?: Record<string, any>;
}
