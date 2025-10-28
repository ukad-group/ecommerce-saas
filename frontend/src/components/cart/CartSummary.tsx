/**
 * CartSummary Component
 *
 * Displays order totals including subtotal, tax, shipping, and total.
 */

import React from 'react';
import type { Order } from '../../types/order';
import { formatCurrency } from '../../utils/currency';

export interface CartSummaryProps {
  order: Order;
}

/**
 * Cart summary component showing price breakdown
 *
 * @example
 * <CartSummary order={cart} />
 */
export function CartSummary({ order }: CartSummaryProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal, order.currency)}</span>
        </div>

        {/* Discount (if any) */}
        {order.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-{formatCurrency(order.discount, order.currency)}</span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-gray-700">
          <span>Shipping</span>
          <span>
            {order.shipping === 0
              ? 'FREE'
              : formatCurrency(order.shipping, order.currency)}
          </span>
        </div>

        {/* Tax */}
        <div className="flex justify-between text-gray-700">
          <span>Tax</span>
          <span>{formatCurrency(order.tax, order.currency)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 pt-3">
          {/* Total */}
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(order.total, order.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
