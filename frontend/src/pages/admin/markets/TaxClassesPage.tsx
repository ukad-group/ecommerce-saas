import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useMarketTaxClasses, useUpdateMarketTaxClasses } from '../../../services/hooks/useMarketTaxClasses';
import { getCountries } from '../../../services/api/countriesApi';
import { apiClient } from '../../../services/api/client';
import type { TaxClass, CountryTaxRate } from '../../../services/api/marketTaxClassesApi';
import type { Market } from '../../../types/market';
import { Button } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';

function newTaxClass(): TaxClass {
  return { id: `tc-${Date.now()}`, name: '', defaultRate: 0, countryRates: [] };
}

export function TaxClassesPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();

  const { data: market } = useQuery({
    queryKey: ['market', marketId],
    queryFn: () => apiClient.get<Market>(`/admin/markets/${marketId}`),
    enabled: !!marketId,
  });

  const { data: taxClasses, isLoading } = useMarketTaxClasses(marketId);
  // Unfiltered on purpose: tax-rate overrides are a country/tax-law concept, independent of which
  // countries this market currently ships to (that's a separate, shipping-zone concept).
  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: () => getCountries(),
  });
  const updateMutation = useUpdateMarketTaxClasses(marketId);

  const [dirtyMap, setDirtyMap] = useState<Map<string, TaxClass>>(new Map());
  const [newClasses, setNewClasses] = useState<TaxClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const list = taxClasses ?? [];
  const visible = [...newClasses, ...list];

  const setDirty = (id: string, tc: TaxClass) => setDirtyMap((m) => new Map(m).set(id, tc));
  const clearDirty = (id: string) => setDirtyMap((m) => { const next = new Map(m); next.delete(id); return next; });
  const getEffective = (tc: TaxClass) => dirtyMap.get(tc.id) ?? tc;

  const updateField = (base: TaxClass, field: 'name' | 'defaultRate', value: string) => {
    const cur = getEffective(base);
    setDirty(base.id, { ...cur, [field]: field === 'defaultRate' ? Number(value) || 0 : value });
  };

  const setCountryRates = (base: TaxClass, countryRates: CountryTaxRate[]) =>
    setDirty(base.id, { ...getEffective(base), countryRates });

  const addCountryRate = (base: TaxClass, countryCode: string) =>
    setCountryRates(base, [...(getEffective(base).countryRates ?? []), { countryCode, rate: 0 }]);

  const updateCountryRate = (base: TaxClass, idx: number, rate: number) => {
    const cur = getEffective(base);
    const countryRates = (cur.countryRates ?? []).map((r, i) => (i === idx ? { ...r, rate } : r));
    setCountryRates(base, countryRates);
  };

  const removeCountryRate = (base: TaxClass, idx: number) =>
    setCountryRates(base, (getEffective(base).countryRates ?? []).filter((_, i) => i !== idx));

  const handleAdd = () => {
    const tc = newTaxClass();
    setNewClasses((ns) => [...ns, tc]);
    setDirty(tc.id, tc);
  };

  const handleSave = async (tc: TaxClass) => {
    const edited = dirtyMap.get(tc.id);
    if (!edited) return;
    const clean: TaxClass = { ...edited, name: edited.name.trim() };
    if (!clean.name) return;

    setError(null);
    const isNew = !!newClasses.find((c) => c.id === tc.id);
    const nextList = isNew ? [...list, clean] : list.map((c) => (c.id === tc.id ? clean : c));
    try {
      await updateMutation.mutateAsync(nextList);
      if (isNew) setNewClasses((ns) => ns.filter((c) => c.id !== tc.id));
      clearDirty(tc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tax class');
    }
  };

  const handleDiscard = (tc: TaxClass) => {
    clearDirty(tc.id);
    if (newClasses.find((c) => c.id === tc.id)) setNewClasses((ns) => ns.filter((c) => c.id !== tc.id));
  };

  const handleDelete = async (id: string) => {
    if (newClasses.find((c) => c.id === id)) {
      setNewClasses((ns) => ns.filter((c) => c.id !== id));
      clearDirty(id);
      return;
    }
    if (!confirm('Remove this tax class? This cannot be undone.')) return;
    setError(null);
    try {
      await updateMutation.mutateAsync(list.filter((c) => c.id !== id));
      clearDirty(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tax class');
    }
  };

  if (isLoading && !taxClasses) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/admin/markets" className="hover:text-gray-700">Markets</Link>
            <span>/</span>
            <span>Tax Classes — {market?.name || 'Loading…'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tax Classes</h1>
              <p className="mt-2 text-sm text-gray-600">
                Named tax rates for this market, used by the payment surcharge fee. Each has a
                default rate plus optional per-country overrides.
              </p>
            </div>
            <Button onClick={handleAdd}>+ Create Tax Class</Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {visible.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No tax classes yet. Click "Create Tax Class" to add one.
            </div>
          ) : (
            visible.map((serverTc) => {
              const tc = getEffective(serverTc);
              const isDirty = dirtyMap.has(serverTc.id);
              const isNew = !!newClasses.find((c) => c.id === serverTc.id);
              const isSaving = updateMutation.isPending && isDirty;
              const usedCodes = new Set((tc.countryRates ?? []).map((r) => r.countryCode));
              const availableCountries = (countries ?? []).filter((c) => !usedCodes.has(c.code));

              return (
                <div
                  key={serverTc.id}
                  className={`bg-white rounded-lg shadow p-4 ${isDirty ? 'ring-2 ring-[#4a6ba8]/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {isNew && <span className="text-xs text-blue-600 font-medium">Unsaved</span>}
                        {isDirty && !isNew && <span className="text-xs text-amber-600 font-medium">Modified</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Name">
                          <input type="text" value={tc.name}
                            onChange={(e) => updateField(serverTc, 'name', e.target.value)}
                            placeholder="e.g. Standard"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                        </Field>
                        <Field label="Default Tax Rate">
                          <div className="relative">
                            <input type="number" step="0.01" min="0" value={tc.defaultRate * 100}
                              onChange={(e) => updateField(serverTc, 'defaultRate', String(Number(e.target.value) / 100))}
                              className="w-full pr-8 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                          </div>
                        </Field>
                      </div>

                      {/* Country/Region overrides */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-600">Country/Region Specific Tax Rates</label>
                          <span className="text-xs text-gray-400">{(tc.countryRates ?? []).length} override(s)</span>
                        </div>
                        <div className="space-y-2">
                          {(tc.countryRates ?? []).length === 0 && (
                            <p className="text-sm text-gray-400 italic">No country overrides — the default rate applies everywhere.</p>
                          )}
                          {(tc.countryRates ?? []).map((r, idx) => (
                            <div key={r.countryCode} className="flex items-center gap-2">
                              <span className="flex-1 text-sm text-gray-700">
                                {countries?.find((c) => c.code === r.countryCode)?.name ?? r.countryCode}
                              </span>
                              <div className="relative w-28">
                                <input type="number" step="0.01" min="0" value={r.rate * 100}
                                  onChange={(e) => updateCountryRate(serverTc, idx, Number(e.target.value) / 100)}
                                  className="w-full pr-6 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                              </div>
                              <button type="button" onClick={() => removeCountryRate(serverTc, idx)}
                                className="text-gray-400 hover:text-red-600 shrink-0" aria-label="Remove override">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {availableCountries.length > 0 && (
                            <Select
                              value=""
                              onChange={(e) => { if (e.target.value) addCountryRate(serverTc, e.target.value); }}
                              placeholder="+ Add country override…"
                              options={availableCountries.map((c) => ({ value: c.code, label: c.name }))}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      {isDirty && (
                        <>
                          <button type="button" onClick={() => handleSave(serverTc)} disabled={isSaving}
                            className="text-sm text-[#4a6ba8] hover:text-[#3d5789] disabled:opacity-50">
                            {isSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button type="button" onClick={() => handleDiscard(serverTc)}
                            className="text-sm text-gray-500 hover:text-gray-700">Discard</button>
                        </>
                      )}
                      <button type="button" onClick={() => handleDelete(serverTc.id)}
                        disabled={updateMutation.isPending}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50">Remove</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6">
          <Button type="button" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
