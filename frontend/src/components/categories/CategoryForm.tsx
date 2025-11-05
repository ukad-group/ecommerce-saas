/**
 * Category Form Component
 *
 * Form for creating and editing categories.
 * Uses React Hook Form for form handling.
 */

import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import type { Category } from '../../types/product';

interface CategoryFormProps {
  category?: Category;
  categories: Category[];
  onSubmit: (data: Partial<Category>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface CategoryFormData {
  name: string;
  description?: string;
  parentId?: string;
}

export function CategoryForm({
  category,
  categories,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: category
      ? {
          name: category.name,
          description: category.description,
          parentId: category.parentId || '',
        }
      : {
          parentId: '',
        },
  });

  // Filter out the current category and its descendants from parent options
  const availableParents = categories.filter((c) => {
    if (!category) return true; // All categories available when creating new
    if (c.id === category.id) return false; // Can't be parent of itself
    // Check if c is a descendant of category
    let current: Category | undefined = c;
    while (current?.parentId) {
      if (current.parentId === category.id) return false;
      current = categories.find((cat) => cat.id === current?.parentId);
    }
    return true;
  });

  const parentOptions = [
    { value: '', label: 'None (Root Category)' },
    ...availableParents.map((c) => ({
      value: c.id,
      label: c.parentId
        ? `${categories.find((p) => p.id === c.parentId)?.name} > ${c.name}`
        : c.name,
    })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Category Information
        </h2>

        <div className="space-y-4">
          <Input
            label="Category Name"
            {...register('name', { required: 'Category name is required' })}
            error={errors.name?.message}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Optional category description"
            />
          </div>

          <Select
            label="Parent Category"
            {...register('parentId')}
            options={parentOptions}
            helperText="Leave empty to create a root category"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : category
            ? 'Update Category'
            : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
