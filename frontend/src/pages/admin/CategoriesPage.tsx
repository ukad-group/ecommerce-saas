/**
 * Categories Page
 *
 * Admin page for viewing and managing all categories.
 * Displays category tree with create, edit, and delete actions.
 */

import { Link } from 'react-router-dom';
import { CategoryList } from '../../components/categories/CategoryList';
import { useCategories, useDeleteCategory } from '../../services/hooks/useCategories';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';

export function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories();
  const deleteCategory = useDeleteCategory();

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory.mutateAsync(categoryId);
      } catch (err: any) {
        console.error('Failed to delete category:', err);
        alert(
          err.response?.data?.message ||
            'Failed to delete category. It may have subcategories.'
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="mt-2 text-sm text-gray-600">
              Organize your products into categories
            </p>
          </div>
          <Link to="/admin/categories/new">
            <Button>Create Category</Button>
          </Link>
        </div>

        {/* Categories List */}
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading categories: {error.message}</p>
            </div>
          ) : (
            <CategoryList categories={categories || []} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
