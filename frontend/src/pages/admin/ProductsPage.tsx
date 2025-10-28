/**
 * Products Page
 *
 * Admin page for viewing and managing all products.
 * Displays product list with filtering and search.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductList } from '../../components/products/ProductList';
import {
  useProducts,
  useDeleteProduct,
  useUpdateProductStock,
} from '../../services/hooks/useProducts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import type { ProductStatus } from '../../types/product';

export function ProductsPage() {
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: products, isLoading, error } = useProducts({
    status: statusFilter === 'all' ? undefined : statusFilter,
    searchQuery: searchQuery || undefined,
  });

  const deleteProduct = useDeleteProduct();
  const updateStock = useUpdateProductStock();

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct.mutateAsync(productId);
      } catch (err) {
        console.error('Failed to delete product:', err);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleStockUpdate = (productId: string, newStock: number) => {
    updateStock.mutate({ productId, stockQuantity: newStock });
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your product catalog
            </p>
          </div>
          <Link to="/admin/products/new">
            <Button>Create Product</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
              options={statusOptions}
            />
            <Input
              label="Search"
              type="text"
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Products List */}
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading products: {error.message}</p>
            </div>
          ) : (
            <ProductList
              products={products || []}
              onDelete={handleDelete}
              onStockUpdate={handleStockUpdate}
              isUpdating={updateStock.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
