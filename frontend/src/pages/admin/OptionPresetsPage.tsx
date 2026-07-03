import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TagIcon, RectangleStackIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  useMarketOptionPresets,
  useAllSinglePresets,
  useAddOptionPreset,
  useUpdateOptionPreset,
  useDeleteOptionPreset,
} from '../../services/hooks/useMarketOptionPresets';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import type { OptionPreset, ProductStatus } from '../../types/product';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const PAGE_SIZE = 10;

function newPreset(kind: 'single' | 'group' = 'single'): OptionPreset {
  return {
    id: `preset-${Date.now()}`,
    name: '',
    sku: '',
    price: 0,
    description: '',
    imageUrl: '',
    stockQuantity: 0,
    status: 'active',
    kind,
    subOptionIds: kind === 'group' ? [] : undefined,
  };
}

export function OptionPresetsPage() {
  const role = useAuthStore((state) => state.getRole());
  const isAdmin = role === Role.SUPERADMIN || role === Role.TENANT_ADMIN;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useMarketOptionPresets(debouncedSearch, page, PAGE_SIZE);
  const { data: allSingles = [] } = useAllSinglePresets();
  const presets = data?.presets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const addMutation = useAddOptionPreset();
  const updateMutation = useUpdateOptionPreset();
  const deleteMutation = useDeleteOptionPreset();

  // Per-preset local edits: map from id → edited OptionPreset
  const [dirtyMap, setDirtyMap] = useState<Map<string, OptionPreset>>(new Map());
  // Track which new presets haven't been saved yet (added locally)
  const [newPresets, setNewPresets] = useState<OptionPreset[]>([]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 300);
    setDebounceTimer(t);
  }, [debounceTimer]);

  const setDirty = (id: string, preset: OptionPreset) => {
    setDirtyMap((m) => new Map(m).set(id, preset));
  };

  const clearDirty = (id: string) => {
    setDirtyMap((m) => { const next = new Map(m); next.delete(id); return next; });
  };

  const getEffective = (preset: OptionPreset) => dirtyMap.get(preset.id) ?? preset;

  const updateField = (id: string, base: OptionPreset, field: keyof OptionPreset, value: any) => {
    setDirty(id, { ...getEffective(base), [field]: value });
  };

  const changeKind = (id: string, base: OptionPreset, kind: 'single' | 'group') => {
    const cur = getEffective(base);
    setDirty(id, {
      ...cur,
      kind,
      subOptionIds: kind === 'group' ? cur.subOptionIds ?? [] : undefined,
    });
  };

  const toggleSubOption = (id: string, base: OptionPreset, subId: string) => {
    const cur = getEffective(base);
    const current = cur.subOptionIds ?? [];
    setDirty(id, {
      ...cur,
      subOptionIds: current.includes(subId)
        ? current.filter((x) => x !== subId)
        : [...current, subId],
    });
  };

  const handleSave = async (preset: OptionPreset) => {
    const edited = dirtyMap.get(preset.id);
    if (!edited) return;
    const clean = {
      ...edited,
      name: edited.name.trim(),
      price: Number(edited.price) || 0,
      stockQuantity: Number(edited.stockQuantity) || 0,
    };
    if (!clean.name) return;

    if (newPresets.find((p) => p.id === preset.id)) {
      await addMutation.mutateAsync(clean);
      setNewPresets((ns) => ns.filter((p) => p.id !== preset.id));
    } else {
      await updateMutation.mutateAsync({ id: preset.id, preset: clean });
    }
    clearDirty(preset.id);
  };

  const handleDiscard = (preset: OptionPreset) => {
    clearDirty(preset.id);
    if (newPresets.find((p) => p.id === preset.id)) {
      setNewPresets((ns) => ns.filter((p) => p.id !== preset.id));
    }
  };

  const handleDelete = async (id: string) => {
    if (newPresets.find((p) => p.id === id)) {
      setNewPresets((ns) => ns.filter((p) => p.id !== id));
      clearDirty(id);
      return;
    }
    if (!confirm('Remove this preset? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
    clearDirty(id);
  };

  const handleAdd = (kind: 'single' | 'group') => {
    const p = newPreset(kind);
    setNewPresets((ns) => [...ns, p]);
    setDirty(p.id, p);
  };

  const visiblePresets = [...newPresets, ...presets];

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/admin/products" className="hover:text-gray-700">Products</Link>
            <span>/</span>
            <span>Option Presets</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Option Presets</h1>
              <p className="mt-2 text-sm text-gray-600">
                Store-global add-on options. Build them once here, then pick them into a product's option blocks.
                {!isAdmin && (
                  <span className="text-amber-600 ml-2">(View only — contact an admin to make changes)</span>
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={() => handleAdd('single')}>+ Add Option</Button>
                <Button onClick={() => handleAdd('group')}>+ Add Group</Button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]"
          />
        </div>

        {/* Presets list */}
        <div className="space-y-4">
          {visiblePresets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              {debouncedSearch ? `No presets match "${debouncedSearch}".` : 'No option presets yet.'}
              {isAdmin && !debouncedSearch && ' Click "Add Option" to create one.'}
            </div>
          ) : (
            visiblePresets.map((serverPreset) => {
              const preset = getEffective(serverPreset);
              const isDirty = dirtyMap.has(serverPreset.id);
              const isNew = !!newPresets.find((p) => p.id === serverPreset.id);
              const isSaving =
                (addMutation.isPending || updateMutation.isPending) && isDirty;

              return (
                <div
                  key={serverPreset.id}
                  className={`bg-white rounded-lg shadow p-4 ${isDirty ? 'ring-2 ring-[#4a6ba8]/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Kind selector */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            (preset.kind ?? 'single') === 'group'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {(preset.kind ?? 'single') === 'group' ? (
                            <><RectangleStackIcon className="w-3.5 h-3.5" />Group</>
                          ) : (
                            <><TagIcon className="w-3.5 h-3.5" />Single</>
                          )}
                        </span>
                        {isAdmin && (
                          <select
                            value={preset.kind ?? 'single'}
                            onChange={(e) => changeKind(serverPreset.id, serverPreset, e.target.value as 'single' | 'group')}
                            className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]"
                          >
                            <option value="single">Single option</option>
                            <option value="group">Group (with sub-options)</option>
                          </select>
                        )}
                        {isNew && <span className="text-xs text-blue-600 font-medium">Unsaved</span>}
                        {isDirty && !isNew && <span className="text-xs text-amber-600 font-medium">Modified</span>}
                      </div>

                      {(preset.kind ?? 'single') === 'group' ? (
                        <GroupFields
                          preset={preset}
                          isAdmin={isAdmin}
                          allSingles={allSingles.filter((s) => s.id !== serverPreset.id)}
                          onChange={(field, val) => updateField(serverPreset.id, serverPreset, field, val)}
                          onToggleSub={(subId) => toggleSubOption(serverPreset.id, serverPreset, subId)}
                        />
                      ) : (
                        <SingleFields
                          preset={preset}
                          isAdmin={isAdmin}
                          onChange={(field, val) => updateField(serverPreset.id, serverPreset, field, val)}
                        />
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-col gap-1 shrink-0">
                        {isDirty && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSave(serverPreset)}
                              disabled={isSaving}
                              className="text-sm text-[#4a6ba8] hover:text-[#3d5789] disabled:opacity-50"
                            >
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDiscard(serverPreset)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Discard
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(serverPreset.id)}
                          disabled={deleteMutation.isPending}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm border rounded ${
                    p === page ? 'bg-[#4a6ba8] text-white border-[#4a6ba8]' : 'hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* Back / info */}
        <div className="mt-6 flex items-center justify-between">
          <Link to="/admin/products">
            <Button type="button">Back to Products</Button>
          </Link>
        </div>

        <div className="mt-4 rounded-lg border bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">How it works:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>Option presets are the store-global add-ons customers can buy</li>
            <li>On a product, add an option block and pick which presets it offers</li>
            <li>Editing a preset here updates it everywhere it's referenced</li>
            <li>Set status to Inactive to retire an option without deleting it</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SingleFieldsProps {
  preset: OptionPreset;
  isAdmin: boolean;
  onChange: (field: keyof OptionPreset, value: any) => void;
}

function SingleFields({ preset, isAdmin, onChange }: SingleFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Display name">
        <input type="text" value={preset.name} disabled={!isAdmin}
          onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. Towbar 50mm"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="SKU">
        <input type="text" value={preset.sku || ''} disabled={!isAdmin}
          onChange={(e) => onChange('sku', e.target.value)} placeholder="OPT-TOWBAR-50"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="Price">
        <input type="number" step="0.01" min="0" value={preset.price || ''} disabled={!isAdmin}
          onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)} placeholder="0.00"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="Stock quantity">
        <input type="number" min="0" value={preset.stockQuantity || ''} disabled={!isAdmin}
          onChange={(e) => onChange('stockQuantity', parseInt(e.target.value) || 0)} placeholder="0"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="Main image URL">
        <input type="text" value={preset.imageUrl || ''} disabled={!isAdmin}
          onChange={(e) => onChange('imageUrl', e.target.value)} placeholder="https://…"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="Status">
        <select value={preset.status} disabled={!isAdmin}
          onChange={(e) => onChange('status', e.target.value as ProductStatus)}
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Description">
          <textarea rows={2} value={preset.description || ''} disabled={!isAdmin}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Optional description shown to customers"
            className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
        </Field>
      </div>
    </div>
  );
}

interface GroupFieldsProps {
  preset: OptionPreset;
  isAdmin: boolean;
  allSingles: OptionPreset[];
  onChange: (field: keyof OptionPreset, value: any) => void;
  onToggleSub: (subId: string) => void;
}

function GroupFields({ preset, isAdmin, allSingles, onChange, onToggleSub }: GroupFieldsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerPage, setPickerPage] = useState(1);

  const PICKER_SIZE = 8;
  const selectedIds = preset.subOptionIds ?? [];
  const selectedSingles = selectedIds
    .map((id) => allSingles.find((s) => s.id === id))
    .filter(Boolean) as OptionPreset[];

  const pickerQ = pickerSearch.toLowerCase();
  const available = allSingles.filter(
    (s) => !selectedIds.includes(s.id) && (!pickerQ || (s.name ?? '').toLowerCase().includes(pickerQ))
  );
  const pickerTotalPages = Math.ceil(available.length / PICKER_SIZE);
  const pagedAvailable = available.slice((pickerPage - 1) * PICKER_SIZE, pickerPage * PICKER_SIZE);

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Display name">
          <input type="text" value={preset.name} disabled={!isAdmin}
            onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. Couplings"
            className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
        </Field>
        <Field label="Status">
          <select value={preset.status} disabled={!isAdmin}
            onChange={(e) => onChange('status', e.target.value as ProductStatus)}
            className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </Field>
      </div>
      <Field label="Image URL">
        <input type="text" value={preset.imageUrl || ''} disabled={!isAdmin}
          onChange={(e) => onChange('imageUrl', e.target.value)} placeholder="https://…"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="Description">
        <textarea rows={2} value={preset.description || ''} disabled={!isAdmin}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Optional description shown to customers"
          className="form-input w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
      </Field>
      <Field label="Sub options">
        <div className="space-y-1">
          {selectedSingles.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 border border-[#4a6ba8] bg-blue-50 rounded-md text-sm">
              <span className="text-gray-400 w-5 shrink-0">{i + 1}.</span>
              <span className="flex-1 min-w-0 truncate">{s.name || '(unnamed)'}</span>
              <span className="text-gray-500 shrink-0">{s.price}</span>
              {isAdmin && (
                <button type="button" onClick={() => onToggleSub(s.id)}
                  className="text-gray-400 hover:text-red-600 shrink-0 font-medium leading-none">×</button>
              )}
            </div>
          ))}
          {isAdmin && (
            <button type="button" onClick={() => { setPickerSearch(''); setPickerPage(1); setPickerOpen(true); }}
              className="w-full text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-md py-1.5 hover:border-gray-400 hover:text-gray-600">
              ── Add new ──
            </button>
          )}
          {selectedSingles.length === 0 && !isAdmin && (
            <p className="text-sm text-gray-400 italic">No sub-options selected.</p>
          )}
        </div>
      </Field>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b flex items-center gap-2">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input type="search" autoFocus value={pickerSearch}
                onChange={(e) => { setPickerSearch(e.target.value); setPickerPage(1); }}
                placeholder="Search singles…"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#4a6ba8]" />
              <button type="button" onClick={() => setPickerOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-lg leading-none font-medium">×</button>
            </div>
            <div>
              {available.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 text-center">
                  {pickerSearch ? 'No matches.' : 'All singles already added.'}
                </p>
              ) : (
                <>
                  {pagedAvailable.map((s) => (
                    <button key={s.id} type="button"
                      onClick={() => { onToggleSub(s.id); setPickerOpen(false); setPickerSearch(''); setPickerPage(1); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                      <TagIcon className="w-4 h-4 shrink-0 text-gray-400" />
                      <span className="flex-1 min-w-0 truncate">{s.name || '(unnamed)'}</span>
                      <span className="text-gray-500 shrink-0">{s.price}</span>
                    </button>
                  ))}
                  {pickerTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-gray-100 text-sm text-gray-500">
                      <button type="button" disabled={pickerPage <= 1}
                        onClick={() => setPickerPage((p) => p - 1)}
                        className="disabled:opacity-30 hover:text-gray-800">←</button>
                      <span>{pickerPage} / {pickerTotalPages}</span>
                      <button type="button" disabled={pickerPage >= pickerTotalPages}
                        onClick={() => setPickerPage((p) => p + 1)}
                        className="disabled:opacity-30 hover:text-gray-800">→</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
