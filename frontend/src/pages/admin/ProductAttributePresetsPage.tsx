import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline';
import {
  useMarketAttributePresets,
  useAddAttributePreset,
  useUpdateAttributePreset,
  useDeleteAttributePreset,
} from '../../services/hooks/useMarketAttributes';
import { useAllAttributes } from '../../services/hooks/useMarketAttributes';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import type { ProductAttribute, ProductAttributePreset } from '../../types/product';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { slugify } from './ProductAttributesPage';

const PAGE_SIZE = 10;

function newPreset(): ProductAttributePreset {
  return { id: `attr-preset-${Date.now()}`, name: '', alias: '', attributeIds: [] };
}

export function ProductAttributePresetsPage() {
  const role = useAuthStore((state) => state.getRole());
  const isAdmin = role === Role.SUPERADMIN || role === Role.TENANT_ADMIN;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useMarketAttributePresets(debouncedSearch, page, PAGE_SIZE);
  const { data: allAttributes = [] } = useAllAttributes();
  const presets = data?.presets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const addMutation = useAddAttributePreset();
  const updateMutation = useUpdateAttributePreset();
  const deleteMutation = useDeleteAttributePreset();

  const [dirtyMap, setDirtyMap] = useState<Map<string, ProductAttributePreset>>(new Map());
  const [newPresets, setNewPresets] = useState<ProductAttributePreset[]>([]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 300);
    setDebounceTimer(t);
  }, [debounceTimer]);

  const setDirty = (id: string, p: ProductAttributePreset) => setDirtyMap((m) => new Map(m).set(id, p));
  const clearDirty = (id: string) => setDirtyMap((m) => { const next = new Map(m); next.delete(id); return next; });
  const getEffective = (p: ProductAttributePreset) => dirtyMap.get(p.id) ?? p;

  const updateField = (base: ProductAttributePreset, field: 'name' | 'alias', value: string) => {
    const cur = getEffective(base);
    const next = { ...cur, [field]: value };
    if (field === 'name' && !cur.alias) next.alias = slugify(value);
    setDirty(base.id, next);
  };

  const toggleAttribute = (base: ProductAttributePreset, attrId: string) => {
    const cur = getEffective(base);
    const ids = cur.attributeIds;
    setDirty(base.id, {
      ...cur,
      attributeIds: ids.includes(attrId) ? ids.filter((x) => x !== attrId) : [...ids, attrId],
    });
  };

  const handleSave = async (preset: ProductAttributePreset) => {
    const edited = dirtyMap.get(preset.id);
    if (!edited) return;
    const clean: ProductAttributePreset = {
      ...edited,
      name: edited.name.trim(),
      alias: (edited.alias || slugify(edited.name)).trim(),
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

  const handleDiscard = (preset: ProductAttributePreset) => {
    clearDirty(preset.id);
    if (newPresets.find((p) => p.id === preset.id)) setNewPresets((ns) => ns.filter((p) => p.id !== preset.id));
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

  const handleAdd = () => {
    const p = newPreset();
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
            <span>Product Attribute Presets</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Attribute Presets</h1>
              <p className="mt-2 text-sm text-gray-600">
                Named bundles of attributes. Apply a preset to a product to add all its attributes at once.
                {!isAdmin && (
                  <span className="text-amber-600 ml-2">(View only — contact an admin to make changes)</span>
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={handleAdd}>+ Create Preset</Button>
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
            placeholder="Search by name or alias…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]"
          />
        </div>

        {/* Presets list */}
        <div className="space-y-4">
          {visiblePresets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              {debouncedSearch ? `No presets match "${debouncedSearch}".` : 'No attribute presets yet.'}
              {isAdmin && !debouncedSearch && ' Click "Create Preset" to add one.'}
            </div>
          ) : (
            visiblePresets.map((serverPreset) => {
              const preset = getEffective(serverPreset);
              const isDirty = dirtyMap.has(serverPreset.id);
              const isNew = !!newPresets.find((p) => p.id === serverPreset.id);
              const isSaving = (addMutation.isPending || updateMutation.isPending) && isDirty;

              return (
                <div key={serverPreset.id}
                  className={`bg-white rounded-lg shadow p-4 ${isDirty ? 'ring-2 ring-[#4a6ba8]/30' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {isNew && <span className="text-xs text-blue-600 font-medium">Unsaved</span>}
                        {isDirty && !isNew && <span className="text-xs text-amber-600 font-medium">Modified</span>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Name">
                          <input type="text" value={preset.name} disabled={!isAdmin}
                            onChange={(e) => updateField(serverPreset, 'name', e.target.value)}
                            placeholder="e.g. Apparel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                        </Field>
                        <Field label="Alias">
                          <input type="text" value={preset.alias} disabled={!isAdmin}
                            onChange={(e) => updateField(serverPreset, 'alias', e.target.value)}
                            placeholder="e.g. apparel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                        </Field>
                      </div>

                      {/* Attributes in this preset */}
                      <Field label="Attributes in this preset">
                        {allAttributes.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">
                            No attributes defined yet. <Link to="/admin/products/attributes" className="text-[#4a6ba8] hover:underline">Create some first</Link>.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {allAttributes.map((a: ProductAttribute) => {
                              const selected = preset.attributeIds.includes(a.id);
                              return (
                                <button key={a.id} type="button" disabled={!isAdmin}
                                  onClick={() => toggleAttribute(serverPreset, a.id)}
                                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                                    selected
                                      ? 'bg-[#4a6ba8] text-white border-[#4a6ba8]'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  } ${!isAdmin ? 'cursor-default' : ''}`}>
                                  <TagIcon className="w-3.5 h-3.5" />
                                  {a.name || '(unnamed)'}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </Field>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-col gap-1 shrink-0">
                        {isDirty && (
                          <>
                            <button type="button" onClick={() => handleSave(serverPreset)} disabled={isSaving}
                              className="text-sm text-[#4a6ba8] hover:text-[#3d5789] disabled:opacity-50">
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" onClick={() => handleDiscard(serverPreset)}
                              className="text-sm text-gray-500 hover:text-gray-700">Discard</button>
                          </>
                        )}
                        <button type="button" onClick={() => handleDelete(serverPreset.id)}
                          disabled={deleteMutation.isPending}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50">Remove</button>
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm border rounded ${p === page ? 'bg-[#4a6ba8] text-white border-[#4a6ba8]' : 'hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">→</button>
            </div>
          </div>
        )}

        {/* Back / info */}
        <div className="mt-6 flex items-center justify-between">
          <Link to="/admin/products/attributes" className="text-sm text-[#4a6ba8] hover:text-[#3d5789]">
            ← Back to Product Attributes
          </Link>
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
