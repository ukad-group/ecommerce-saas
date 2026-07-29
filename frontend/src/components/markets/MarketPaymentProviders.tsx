/**
 * Market Payment Providers
 *
 * Add / edit / delete the payment providers configured for a market, and choose which is active.
 * The settings form for each provider is rendered from the provider's schema (catalog), so new
 * gateways need no UI changes. Secrets are write-only: they come back masked and are only sent
 * when the user types a new value.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { useActiveOrderStatuses } from '../../services/hooks/useOrderStatuses';
import { useMarketTaxClasses } from '../../services/hooks/useMarketTaxClasses';
import {
  getPaymentProviderCatalog,
  getMarketPaymentProviders,
  upsertMarketPaymentProvider,
  deleteMarketPaymentProvider,
  setActivePaymentProvider,
  setOrderStatusAfterPayment,
  setPaymentSurcharge,
  type PaymentProviderDescriptor,
  type PaymentSettingField,
  type PaymentSurcharge,
} from '../../services/api/marketPaymentProvidersApi';

interface Props {
  marketId: string;
  currency?: string;
}

type FieldValues = Record<string, string | boolean>;
type SurchargeFormValues = { sku: string; taxClassId: string; amount: string };

const BLANK_SURCHARGE: SurchargeFormValues = { sku: '', taxClassId: '', amount: '' };

export function MarketPaymentProviders({ marketId, currency }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ alias: string; values: FieldValues; surcharge: SurchargeFormValues } | null>(null);
  const [addAlias, setAddAlias] = useState('');
  const [error, setError] = useState<string | null>(null);

  const catalogQuery = useQuery({
    queryKey: ['payment-provider-catalog'],
    queryFn: getPaymentProviderCatalog,
  });

  const providersQuery = useQuery({
    queryKey: ['market-payment-providers', marketId],
    queryFn: () => getMarketPaymentProviders(marketId),
  });

  const orderStatusesQuery = useActiveOrderStatuses();
  const taxClassesQuery = useMarketTaxClasses(marketId);

  const catalog = catalogQuery.data ?? [];
  const configured = providersQuery.data?.providers ?? [];
  const active = providersQuery.data?.active ?? null;
  const orderStatusAfterPayment = providersQuery.data?.orderStatusAfterPayment ?? null;
  const orderStatuses = orderStatusesQuery.data ?? [];
  const taxClasses = taxClassesQuery.data?.taxClasses ?? [];
  const surcharges = providersQuery.data?.surcharges ?? {};

  const descriptorByAlias = useMemo(
    () => new Map(catalog.map((d) => [d.alias, d])),
    [catalog]
  );

  const unconfigured = catalog.filter((d) => !configured.some((p) => p.alias === d.alias));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['market-payment-providers', marketId] });

  const upsertMutation = useMutation({
    mutationFn: (vars: { alias: string; settings: Record<string, unknown> }) =>
      upsertMarketPaymentProvider(marketId, vars.alias, vars.settings),
    onError: (e: Error) => setError(e.message),
  });

  const surchargeMutation = useMutation<PaymentSurcharge, Error, { alias: string; surcharge: PaymentSurcharge }>({
    mutationFn: (vars) => setPaymentSurcharge(marketId, vars.alias, vars.surcharge),
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (alias: string) => deleteMarketPaymentProvider(marketId, alias),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const activeMutation = useMutation({
    mutationFn: (alias: string | null) => setActivePaymentProvider(marketId, alias),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const orderStatusMutation = useMutation({
    mutationFn: (code: string | null) => setOrderStatusAfterPayment(marketId, code),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  function surchargeToFormValues(surcharge?: PaymentSurcharge): SurchargeFormValues {
    if (!surcharge) return BLANK_SURCHARGE;
    return {
      sku: surcharge.sku ?? '',
      taxClassId: surcharge.taxClassId ?? '',
      amount: surcharge.amount ? String(surcharge.amount) : '',
    };
  }

  function startAdd() {
    const descriptor = descriptorByAlias.get(addAlias);
    if (!descriptor) return;
    setEditing({ alias: descriptor.alias, values: initialValues(descriptor), surcharge: BLANK_SURCHARGE });
  }

  function startEdit(alias: string) {
    const descriptor = descriptorByAlias.get(alias);
    const current = configured.find((p) => p.alias === alias);
    if (!descriptor) return;
    setEditing({
      alias,
      values: initialValues(descriptor, current?.settings),
      surcharge: surchargeToFormValues(surcharges[alias]),
    });
  }

  async function save() {
    if (!editing) return;
    const descriptor = descriptorByAlias.get(editing.alias);
    if (!descriptor) return;
    const settings = buildSettings(descriptor.fields, editing.values);

    try {
      await upsertMutation.mutateAsync({ alias: editing.alias, settings });

      // Always send what's in the form — the API drops an all-blank surcharge itself, so a tax class
      // chosen before an amount is entered survives the save instead of being silently discarded.
      await surchargeMutation.mutateAsync({
        alias: editing.alias,
        surcharge: {
          sku: editing.surcharge.sku || null,
          taxClassId: editing.surcharge.taxClassId || null,
          amount: Number(editing.surcharge.amount) || 0,
        },
      });

      setEditing(null);
      setError(null);
      invalidate();
    } catch {
      // error already captured via each mutation's onError
    }
  }

  if (providersQuery.isLoading || catalogQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading payment providers…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Order status after payment — applies regardless of which provider is active */}
      <div>
        <Select
          label="Order status after payment"
          value={orderStatusAfterPayment ?? ''}
          onChange={(e) => orderStatusMutation.mutate(e.target.value || null)}
          options={[
            { value: '', label: 'Default ("paid")' },
            ...orderStatuses.map((s) => ({ value: s.code, label: s.name })),
          ]}
        />
        <p className="mt-0.5 text-xs text-gray-400">
          Order status set when a payment succeeds, from this tenant's order statuses.
        </p>
      </div>

      {/* Active provider */}
      <Select
        label="Active provider"
        value={active ?? ''}
        onChange={(e) => activeMutation.mutate(e.target.value || null)}
        options={[
          { value: '', label: 'None (default / sole provider)' },
          ...configured.map((p) => ({ value: p.alias, label: p.displayName })),
        ]}
      />

      {/* Configured providers */}
      {configured.length === 0 ? (
        <p className="text-sm text-gray-500">No providers configured for this market yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {configured.map((p) => (
            <li key={p.alias} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm">
                <span className="font-medium text-gray-900">{p.displayName}</span>
                <span className="ml-2 text-xs text-gray-400">{p.alias}</span>
                {active === p.alias && (
                  <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                    active
                  </span>
                )}
                {!p.known && (
                  <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700">
                    unknown provider
                  </span>
                )}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(p.alias)}
                  className="text-gray-500 hover:text-indigo-600"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(p.alias)}
                  className="text-gray-500 hover:text-red-600"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Add provider */}
      {!editing && unconfigured.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Add provider"
              value={addAlias}
              onChange={(e) => setAddAlias(e.target.value)}
              options={[
                { value: '', label: 'Select a provider…' },
                ...unconfigured.map((d) => ({ value: d.alias, label: d.displayName })),
              ]}
            />
          </div>
          <Button type="button" variant="secondary" disabled={!addAlias} onClick={startAdd}>
            <PlusIcon className="mr-1 inline h-4 w-4" />
            Add
          </Button>
        </div>
      )}

      {/* Settings form */}
      {editing && (
        <div className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50/40 p-3">
          <h4 className="text-sm font-semibold text-gray-900">
            {descriptorByAlias.get(editing.alias)?.displayName} settings
          </h4>
          {descriptorByAlias.get(editing.alias)?.fields.map((field) => (
            <ProviderField
              key={field.key}
              field={field}
              value={editing.values[field.key]}
              onChange={(v) =>
                setEditing((prev) =>
                  prev ? { ...prev, values: { ...prev.values, [field.key]: v } } : prev
                )
              }
            />
          ))}

          {/* Surcharge fee (optional) — generic, not part of the provider's own schema */}
          <div className="space-y-2 border-t border-indigo-200 pt-3">
            <h5 className="text-sm font-semibold text-gray-900">Surcharge fee (optional)</h5>
            <Input
              label="SKU"
              value={editing.surcharge.sku}
              onChange={(e) =>
                setEditing((prev) => prev ? { ...prev, surcharge: { ...prev.surcharge, sku: e.target.value } } : prev)
              }
            />
            <Select
              label="Tax Class"
              value={editing.surcharge.taxClassId}
              onChange={(e) =>
                setEditing((prev) => prev ? { ...prev, surcharge: { ...prev.surcharge, taxClassId: e.target.value } } : prev)
              }
              options={[
                { value: '', label: 'None' },
                ...taxClasses.map((tc) => ({ value: tc.id, label: tc.name })),
              ]}
            />
            <Input
              label={`Default Pricing${currency ? ` (${currency})` : ''}`}
              type="number"
              step="0.01"
              min="0"
              value={editing.surcharge.amount}
              onChange={(e) =>
                setEditing((prev) => prev ? { ...prev, surcharge: { ...prev.surcharge, amount: e.target.value } } : prev)
              }
            />
            <Link to={`/admin/markets/${marketId}/tax-classes`} className="inline-block text-xs text-[#4a6ba8] hover:underline">
              Manage Tax Classes
            </Link>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={upsertMutation.isPending || surchargeMutation.isPending}
              onClick={save}
            >
              {upsertMutation.isPending || surchargeMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderField({
  field,
  value,
  onChange,
}: {
  field: PaymentSettingField;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  if (field.type === 'Bool') {
    return (
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        {field.label}
        {field.helpText && <span className="text-xs text-gray-400">— {field.helpText}</span>}
      </label>
    );
  }

  const isSecret = field.type === 'Secret';
  return (
    <div>
      <Input
        label={field.label}
        type={isSecret ? 'password' : field.type === 'Number' ? 'number' : 'text'}
        value={typeof value === 'string' ? value : ''}
        placeholder={isSecret ? 'Leave blank to keep current' : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.helpText && <p className="mt-0.5 text-xs text-gray-400">{field.helpText}</p>}
    </div>
  );
}

/** Seed form values: non-secret from stored settings, secrets always blank (write-only). */
function initialValues(
  descriptor: PaymentProviderDescriptor,
  stored?: Record<string, unknown>
): FieldValues {
  const values: FieldValues = {};
  for (const field of descriptor.fields) {
    if (field.type === 'Bool') {
      const raw = stored?.[field.key];
      values[field.key] =
        raw !== undefined ? raw === true || raw === 'true' : field.defaultValue === 'true';
    } else if (field.type === 'Secret') {
      values[field.key] = '';
    } else {
      const raw = stored?.[field.key];
      values[field.key] = raw !== undefined && raw !== null ? String(raw) : field.defaultValue ?? '';
    }
  }
  return values;
}

/** Build the settings payload; omit blank secrets so the stored value is kept. */
function buildSettings(fields: PaymentSettingField[], values: FieldValues): Record<string, unknown> {
  const settings: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (field.type === 'Bool') {
      settings[field.key] = Boolean(value);
    } else if (field.type === 'Secret') {
      if (typeof value === 'string' && value.length > 0) settings[field.key] = value;
    } else if (field.type === 'Number') {
      if (typeof value === 'string' && value.trim() !== '') settings[field.key] = Number(value);
    } else {
      settings[field.key] = typeof value === 'string' ? value : '';
    }
  }
  return settings;
}
