/**
 * Product Form Component
 *
 * Form for creating and editing products.
 * Uses React Hook Form for form handling.
 */

import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import type { Product, ProductStatus } from '../../types/product';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Partial<Product>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  price: number;
  salePrice?: number;
  status: ProductStatus;
  stockQuantity: number;
  lowStockThreshold: number;
  currency: string;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          status: product.status,
          stockQuantity: product.stockQuantity,
          lowStockThreshold: product.lowStockThreshold,
          currency: product.currency,
        }
      : {
          status: 'draft',
          currency: 'USD',
          stockQuantity: 0,
          lowStockThreshold: 10,
        },
  });

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            {...register('name', { required: 'Product name is required' })}
            error={errors.name?.message}
            required
          />
          <Input
            label="SKU"
            {...register('sku', { required: 'SKU is required' })}
            error={errors.sku?.message}
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Price"
            type="number"
            step="0.01"
            {...register('price', {
              required: 'Price is required',
              min: { value: 0, message: 'Price must be positive' },
            })}
            error={errors.price?.message}
            required
          />
          <Input
            label="Sale Price"
            type="number"
            step="0.01"
            {...register('salePrice', {
              min: { value: 0, message: 'Sale price must be positive' },
            })}
            error={errors.salePrice?.message}
          />
          <Select
            label="Currency"
            {...register('currency')}
            options={currencyOptions}
          />
        </div>
      </div>

      {/* Inventory */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Stock Quantity"
            type="number"
            {...register('stockQuantity', {
              required: 'Stock quantity is required',
              min: { value: 0, message: 'Stock quantity must be non-negative' },
            })}
            error={errors.stockQuantity?.message}
            required
          />
          <Input
            label="Low Stock Threshold"
            type="number"
            {...register('lowStockThreshold', {
              required: 'Low stock threshold is required',
              min: { value: 0, message: 'Threshold must be non-negative' },
            })}
            error={errors.lowStockThreshold?.message}
            required
          />
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Status</h2>
        <Select label="Product Status" {...register('status')} options={statusOptions} />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
