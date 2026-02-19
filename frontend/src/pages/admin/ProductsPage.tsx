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
import { useCategories } from '../../services/hooks/useCategories';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import type { ProductStatus } from '../../types/product';

export function ProductsPage() {
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: categories } = useCategories();
  const { data: products, isLoading, error } = useProducts({
    status: statusFilter === 'all' ? undefined : statusFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
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

  // Build hierarchical category options
  const buildCategoryOptions = () => {
    if (!categories || categories.length === 0) {
      return [{ value: 'all', label: 'All Categories' }];
    }

    const options: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'All Categories' },
    ];

    // Helper to find children of a category
    const getChildren = (parentId: string | null | undefined) => {
      return categories.filter((c) => {
        // Handle both null and undefined as "no parent"
        if (parentId === null || parentId === undefined) {
          return !c.parentId || c.parentId === '';
        }
        return c.parentId === parentId;
      });
    };

    // Recursive function to build options with indentation
    const buildHierarchy = (parentId: string | null | undefined, depth: number) => {
      const children = getChildren(parentId);
      children.forEach((category) => {
        const indent = '\u00A0\u00A0'.repeat(depth); // Non-breaking spaces for indentation
        const prefix = depth > 0 ? '- ' : '';
        options.push({
          value: category.id,
          label: `${indent}${prefix}${category.name}`,
        });
        buildHierarchy(category.id, depth + 1);
      });
    };

    // Start with top-level categories (those with no parent)
    buildHierarchy(null, 0);
    return options;
  };

  const categoryOptions = buildCategoryOptions();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Products</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your product catalog
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/products/property-templates"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Configure property templates"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>
            <Link to="/admin/products/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Create Product</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
              options={statusOptions}
            />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={categoryOptions}
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
