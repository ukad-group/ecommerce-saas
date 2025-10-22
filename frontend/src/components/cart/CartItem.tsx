/**
 * CartItem Component
 *
 * Displays a single line item in the shopping cart.
 * Shows product details, quantity selector, and remove button.
 */

import React from 'react';
import type { OrderLineItem } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export interface CartItemProps {
  item: OrderLineItem;
  onUpdateQuantity: (lineItemId: string, quantity: number) => void;
  onRemove: (lineItemId: string) => void;
}

/**
 * Cart item component with quantity controls and remove button
 *
 * @example
 * <CartItem
 *   item={lineItem}
 *   onUpdateQuantity={handleUpdateQuantity}
 *   onRemove={handleRemove}
 * />
 */
export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (newQuantity > 0 && !isNaN(newQuantity)) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const handleIncrement = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    onRemove(item.id);
  };

  return (
    <div className="flex gap-4 py-4 border-b border-gray-200">
      {/* Product Image */}
      <div className="flex-shrink-0 w-24 h-24">
        <img
          src={item.productImage || 'https://via.placeholder.com/96x96?text=No+Image'}
          alt={item.productName}
          className="w-full h-full object-cover rounded"
        />
      </div>

      {/* Product Details */}
      <div className="flex-grow">
        <h3 className="text-lg font-medium text-gray-900">{item.productName}</h3>
        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
        <p className="text-sm text-gray-700 mt-1">
          {formatCurrency(item.unitPrice, item.currency)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleDecrement}
            disabled={item.quantity <= 1}
            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="w-16 text-center border border-gray-300 rounded px-2 py-1"
            aria-label="Quantity"
          />
          <button
            onClick={handleIncrement}
            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Line Total and Remove */}
      <div className="flex flex-col items-end justify-between">
        <p className="text-lg font-semibold text-gray-900">
          {formatCurrency(item.lineTotal, item.currency)}
        </p>
        <Button
          variant="danger"
          onClick={handleRemove}
          className="text-sm px-3 py-1"
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
