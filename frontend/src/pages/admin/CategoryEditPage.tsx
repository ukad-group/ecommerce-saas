/**
 * Category Edit Page
 *
 * Admin page for creating and editing categories.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { CategoryForm } from '../../components/categories/CategoryForm';
import {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
} from '../../services/hooks/useCategories';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Category } from '../../types/product';

export function CategoryEditPage() {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const isEdit = !!categoryId;

  const { data: categories } = useCategories();
  const { data: category, isLoading } = useCategory(categoryId || '');
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const handleSubmit = async (data: Partial<Category>) => {
    try {
      if (isEdit && categoryId) {
        await updateCategory.mutateAsync({ categoryId, categoryData: data });
      } else {
        await createCategory.mutateAsync(data);
      }
      navigate('/admin/categories');
    } catch (err) {
      console.error('Failed to save category:', err);
      alert('Failed to save category. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate('/admin/categories');
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Category' : 'Create Category'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {isEdit
              ? 'Update category information'
              : 'Add a new category to organize products'}
          </p>
        </div>

        {/* Form */}
        <CategoryForm
          category={category}
          categories={categories || []}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
        />
      </div>
    </div>
  );
}
