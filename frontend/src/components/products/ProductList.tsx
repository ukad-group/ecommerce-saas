/**
 * Product List Component
 *
 * Displays a table of all products with key information.
 * Supports actions like edit and delete.
 */

import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../common/Button';
import { QuickStockUpdate } from './QuickStockUpdate';

interface ProductListProps {
  products: Product[];
  onDelete?: (productId: string) => void;
  onStockUpdate?: (productId: string, newStock: number) => void;
  isUpdating?: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  draft: 'bg-yellow-100 text-yellow-800',
};

export function ProductList({
  products,
  onDelete,
  onStockUpdate,
  isUpdating = false,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">No products found.</p>
        <p className="text-gray-400 text-sm mt-2">
          Create your first product to get started.
        </p>
        <Link to="/admin/products/new">
          <Button className="mt-4">Create Product</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              SKU
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  {product.images && product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-10 w-10 rounded object-cover mr-3"
                    />
                  )}
                  <div>
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      {product.name}
                    </Link>
                    {product.description && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {product.description.substring(0, 60)}...
                      </p>
                    )}
                    {product.categoryIds && product.categoryIds.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {product.categoryIds.length} categor{product.categoryIds.length === 1 ? 'y' : 'ies'}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.sku}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[product.status] || statusColors.draft
                  }`}
                >
                  {product.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatCurrency(product.price, product.currency)}
                {product.salePrice && (
                  <span className="ml-2 text-gray-400 line-through text-xs">
                    {formatCurrency(product.salePrice, product.currency)}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {onStockUpdate ? (
                  <QuickStockUpdate
                    product={product}
                    onUpdate={onStockUpdate}
                    isUpdating={isUpdating}
                  />
                ) : (
                  <span
                    className={
                      product.stockQuantity <= product.lowStockThreshold
                        ? 'text-red-600 font-medium'
                        : ''
                    }
                  >
                    {product.stockQuantity}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  to={`/admin/products/${product.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Edit
                </Link>
                {onDelete && (
                  <button
                    onClick={() => onDelete(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{products.length}</span> product
          {products.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
