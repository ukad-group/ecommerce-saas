/**
 * Quick Stock Update Component
 *
 * Allows administrators to quickly update product stock quantity
 * without going through the full product edit form.
 */

import { useState } from 'react';
import type { Product } from '../../types/product';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface QuickStockUpdateProps {
  product: Product;
  onUpdate: (productId: string, newStock: number) => void;
  isUpdating?: boolean;
}

export function QuickStockUpdate({
  product,
  onUpdate,
  isUpdating = false,
}: QuickStockUpdateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newStock, setNewStock] = useState((product.stockQuantity ?? 0).toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stockValue = parseInt(newStock, 10);
    if (!isNaN(stockValue) && stockValue >= 0) {
      onUpdate(product.id, stockValue);
      setIsOpen(false);
    }
  };

  const stockQty = product.stockQuantity ?? 0;
  const threshold = product.lowStockThreshold ?? 0;

  const getStockStatusColor = () => {
    if (stockQty === 0) return 'text-red-600';
    if (stockQty <= threshold) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStockStatusText = () => {
    if (stockQty === 0) return 'Out of Stock';
    if (stockQty <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          <span className={`font-medium ${getStockStatusColor()}`}>
            {stockQty}
          </span>
          <span className="text-gray-500 ml-1">({getStockStatusText()})</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
        >
          Update
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        value={newStock}
        onChange={(e) => setNewStock(e.target.value)}
        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        autoFocus
        disabled={isUpdating}
      />
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={isUpdating}
          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {isUpdating ? '...' : '✓'}
        </button>
        <button
          type="button"
          onClick={() => {
            setNewStock(stockQty.toString());
            setIsOpen(false);
          }}
          disabled={isUpdating}
          className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    </form>
  );
}
