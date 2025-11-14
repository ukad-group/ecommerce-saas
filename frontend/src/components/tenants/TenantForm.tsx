/**
 * Tenant Form Component
 *
 * Form for editing tenant information.
 * Uses React Hook Form for form handling.
 */

import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import type { Tenant, UpdateTenantInput } from '../../types/tenant';

interface TenantFormProps {
  tenant: Tenant;
  onSubmit: (data: UpdateTenantInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface TenantFormData {
  displayName: string;
  contactEmail: string;
  contactPhone?: string;
}

export function TenantForm({
  tenant,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TenantFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormData>({
    defaultValues: {
      displayName: tenant.displayName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tenant ID (read-only)
          </label>
          <input
            type="text"
            value={tenant.name}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">
            The tenant ID cannot be changed
          </p>
        </div>

        <Input
          label="Display Name"
          {...register('displayName', { required: 'Display name is required' })}
          error={errors.displayName?.message}
          required
        />

        <Input
          label="Contact Email"
          type="email"
          {...register('contactEmail', {
            required: 'Contact email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          error={errors.contactEmail?.message}
          required
        />

        <Input
          label="Contact Phone"
          type="tel"
          {...register('contactPhone')}
          error={errors.contactPhone?.message}
          placeholder="Optional"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          title="Cancel and close"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Update Tenant'}
        </Button>
      </div>
    </form>
  );
}
