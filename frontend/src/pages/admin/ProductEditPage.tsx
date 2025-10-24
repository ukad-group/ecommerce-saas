/**
 * Product Edit Page
 *
 * Admin page for creating and editing products.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { ProductForm } from '../../components/products/ProductForm';
import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
} from '../../services/hooks/useProducts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Product } from '../../types/product';

export function ProductEditPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const isEdit = !!productId;

  const { data: product, isLoading } = useProduct(productId || '');
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const handleSubmit = async (data: Partial<Product>) => {
    try {
      if (isEdit && productId) {
        await updateProduct.mutateAsync({ productId, productData: data });
      } else {
        await createProduct.mutateAsync(data);
      }
      navigate('/admin/products');
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  if (isEdit && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Product' : 'Create Product'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isEdit
              ? 'Update product information and inventory'
              : 'Add a new product to your catalog'}
          </p>
        </div>

        {/* Form */}
        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createProduct.isPending || updateProduct.isPending}
          images={product?.images}
        />
      </div>
    </div>
  );
}
