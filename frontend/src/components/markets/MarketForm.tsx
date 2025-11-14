/**
 * Market Form Component
 *
 * Form for editing market information.
 * Uses React Hook Form for form handling.
 */

import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import type { Market, UpdateMarketInput, MarketType } from '../../types/market';

interface MarketFormProps {
  market: Market;
  onSubmit: (data: UpdateMarketInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface MarketFormData {
  name: string;
  code: string;
  type: MarketType;
  currency: string;
  timezone: string;
}

export function MarketForm({
  market,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: MarketFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MarketFormData>({
    defaultValues: {
      name: market.name,
      code: market.code,
      type: market.type,
      currency: market.currency,
      timezone: market.timezone,
    },
  });

  const typeOptions = [
    { value: 'physical', label: 'Physical Store' },
    { value: 'online', label: 'Online Store' },
    { value: 'hybrid', label: 'Hybrid (Both)' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
  ];

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <Input
          label="Market Name"
          {...register('name', { required: 'Market name is required' })}
          error={errors.name?.message}
          required
        />

        <Input
          label="Market Code"
          {...register('code', { required: 'Market code is required' })}
          error={errors.code?.message}
          required
          helperText="Unique identifier within the tenant"
        />

        <Select
          label="Market Type"
          {...register('type')}
          options={typeOptions}
          required
        />

        <Select
          label="Currency"
          {...register('currency')}
          options={currencyOptions}
          required
        />

        <Select
          label="Timezone"
          {...register('timezone')}
          options={timezoneOptions}
          required
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
          {isSubmitting ? 'Saving...' : 'Update Market'}
        </Button>
      </div>
    </form>
  );
}
