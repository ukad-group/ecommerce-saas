/**
 * Category List Component
 *
 * Displays a hierarchical tree or table of categories.
 * Supports actions like edit and delete.
 */

import { Link } from 'react-router-dom';
import type { Category } from '../../types/product';
import { Button } from '../common/Button';

interface CategoryListProps {
  categories: Category[];
  onDelete?: (categoryId: string) => void;
}

export function CategoryList({ categories, onDelete }: CategoryListProps) {
  // Build category tree
  const buildTree = (parentId?: string | null): Category[] => {
    return categories
      .filter((cat) => {
        // Match null and undefined as the same (root level)
        if (parentId === undefined || parentId === null) {
          return cat.parentId === null || cat.parentId === undefined;
        }
        return cat.parentId === parentId;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const children = buildTree(category.id);
    const hasChildren = children.length > 0;

    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between py-3 px-4 hover:bg-gray-50 ${
            level > 0 ? `ml-${level * 8}` : ''
          }`}
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          <div className="flex items-center flex-1">
            {level > 0 && (
              <span className="text-gray-400 mr-2">└─</span>
            )}
            <div>
              <Link
                to={`/admin/categories/${category.id}/edit`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
              >
                {category.name}
              </Link>
              {category.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {category.description}
                </p>
              )}
              {hasChildren && (
                <p className="text-xs text-gray-400 mt-1">
                  {children.length} subcategor{children.length === 1 ? 'y' : 'ies'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to={`/admin/categories/${category.id}/edit`}
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Edit
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(category.id)}
                className="text-sm text-red-600 hover:text-red-900"
                disabled={hasChildren}
                title={hasChildren ? 'Cannot delete category with subcategories' : 'Delete category'}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Render children */}
        {children.map((child) => renderCategory(child, level + 1))}
      </div>
    );
  };

  const rootCategories = buildTree();

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 text-lg">No categories found.</p>
        <p className="text-gray-400 text-sm mt-2">
          Create your first category to organize products.
        </p>
        <Link to="/admin/categories/new">
          <Button className="mt-4">Create Category</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200">
        {rootCategories.map((category) => renderCategory(category))}
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{categories.length}</span> categor
          {categories.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>
    </div>
  );
}
