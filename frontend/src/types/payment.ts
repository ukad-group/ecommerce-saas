/**
 * Payment Type Definitions
 *
 * Defines types for payment transactions.
 * Based on specs/002-cart-order-management/data-model.md
 */

/**
 * Payment transaction status
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Payment transaction entity
 * Record of payment processing for an order (charges and refunds)
 */
export interface PaymentTransaction {
  id: string;
  orderId: string;
  transactionId?: string;
  paymentMethod: string;
  paymentProvider?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: 'charge' | 'refund';
  failureReason?: string;
  timestamp: string; // ISO 8601
  gatewayResponse?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string; // ISO 8601
  processedAt?: string; // ISO 8601
}
