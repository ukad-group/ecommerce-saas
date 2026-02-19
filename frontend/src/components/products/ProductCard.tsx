/**
 * ProductCard Component
 *
 * Mobile-friendly card view for products
 * Used on small screens instead of table layout
 */

import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { formatCurrency } from '../../utils/currency';
import { getMediumImageUrl } from '../../utils/imageHelper';

interface ProductCardProps {
  product: Product;
  onDelete?: (productId: string) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  draft: 'bg-yellow-100 text-yellow-800',
};

export function ProductCard({ product, onDelete }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
      {/* Product Image and Status */}
      <div className="relative">
        <img
          src={
            product.images && product.images[0]
              ? getMediumImageUrl(product.images[0])
              : 'https://dummyimage.com/400x300/AAA/fff.png&text=No+Image'
          }
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[product.status] || statusColors.draft
            }`}
          >
            {product.status}
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Name and Description */}
        <Link
          to={`/admin/products/${product.id}/edit`}
          className="block hover:text-[#4a6ba8] transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {product.name}
          </h3>
        </Link>

        {product.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Details Grid */}
        <div className="space-y-2 mb-4">
          {/* SKU */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">SKU:</span>
            <span className="text-sm font-medium text-gray-900">
              {product.hasVariants ? (
                <span className="text-xs text-gray-400">
                  {product.variants?.length || 0} variant{product.variants?.length !== 1 ? 's' : ''}
                </span>
              ) : (
                product.sku
              )}
            </span>
          </div>

          {/* Price */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Price:</span>
            <span className="text-base font-bold text-gray-900">
              {product.hasVariants ? (
                <div className="text-right">
                  {product.variants && product.variants.length > 0 ? (
                    <span className="text-sm">
                      {formatCurrency(
                        Math.min(...product.variants.map((v) => v.price)),
                        product.currency
                      )}
                      {' - '}
                      {formatCurrency(
                        Math.max(...product.variants.map((v) => v.price)),
                        product.currency
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">No variants</span>
                  )}
                </div>
              ) : (
                <>
                  {product.price !== undefined ? formatCurrency(product.price, product.currency) : 'N/A'}
                  {product.salePrice && (
                    <span className="ml-2 text-gray-400 line-through text-xs">
                      {formatCurrency(product.salePrice, product.currency)}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          {/* Stock */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Stock:</span>
            <span className="text-sm text-gray-900">
              {product.hasVariants ? (
                product.variants && product.variants.length > 0 ? (
                  <span>
                    {product.variants.reduce((sum, v) => sum + v.stockQuantity, 0)} total
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">No variants</span>
                )
              ) : (
                <span
                  className={
                    product.stockQuantity !== undefined &&
                    product.lowStockThreshold !== undefined &&
                    product.stockQuantity <= product.lowStockThreshold
                      ? 'text-red-600 font-medium'
                      : ''
                  }
                >
                  {product.stockQuantity !== undefined ? product.stockQuantity : 'N/A'}
                </span>
              )}
            </span>
          </div>

          {/* Categories */}
          {product.categoryIds && product.categoryIds.length > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Categories:</span>
              <span className="text-xs text-gray-500">
                {product.categoryIds.length} categor{product.categoryIds.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Link
            to={`/admin/products/${product.id}/edit`}
            className="flex-1 text-center px-4 py-2 bg-[#4a6ba8] text-white text-sm font-medium rounded-md hover:bg-[#3d5789] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4a6ba8]"
          >
            Edit
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
