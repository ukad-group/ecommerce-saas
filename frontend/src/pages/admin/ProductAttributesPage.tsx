import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  useMarketAttributes,
  useAddAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
} from '../../services/hooks/useMarketAttributes';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import type { ProductAttribute, ProductAttributeValue } from '../../types/product';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const PAGE_SIZE = 10;

/** kebab-case slug used to auto-fill aliases from a display name. */
export function slugify(s: string): string {
  return (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function newAttribute(): ProductAttribute {
  return { id: `attr-${Date.now()}`, name: '', alias: '', values: [] };
}

export function ProductAttributesPage() {
  const role = useAuthStore((state) => state.getRole());
  const isAdmin = role === Role.SUPERADMIN || role === Role.TENANT_ADMIN;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useMarketAttributes(debouncedSearch, page, PAGE_SIZE);
  const attributes = data?.attributes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const addMutation = useAddAttribute();
  const updateMutation = useUpdateAttribute();
  const deleteMutation = useDeleteAttribute();

  const [dirtyMap, setDirtyMap] = useState<Map<string, ProductAttribute>>(new Map());
  const [newAttrs, setNewAttrs] = useState<ProductAttribute[]>([]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 300);
    setDebounceTimer(t);
  }, [debounceTimer]);

  const setDirty = (id: string, attr: ProductAttribute) => setDirtyMap((m) => new Map(m).set(id, attr));
  const clearDirty = (id: string) => setDirtyMap((m) => { const next = new Map(m); next.delete(id); return next; });
  const getEffective = (attr: ProductAttribute) => dirtyMap.get(attr.id) ?? attr;

  const updateField = (base: ProductAttribute, field: 'name' | 'alias', value: string) => {
    const cur = getEffective(base);
    const next = { ...cur, [field]: value };
    // Auto-fill alias from name while alias is untouched/blank
    if (field === 'name' && !cur.alias) next.alias = slugify(value);
    setDirty(base.id, next);
  };

  const setValues = (base: ProductAttribute, values: ProductAttributeValue[]) =>
    setDirty(base.id, { ...getEffective(base), values });

  const addValue = (base: ProductAttribute) =>
    setValues(base, [...getEffective(base).values, { name: '', alias: '' }]);

  const updateValue = (base: ProductAttribute, idx: number, field: 'name' | 'alias', value: string) => {
    const cur = getEffective(base);
    const values = cur.values.map((v, i) => {
      if (i !== idx) return v;
      const nv = { ...v, [field]: value };
      if (field === 'name' && !v.alias) nv.alias = slugify(value);
      return nv;
    });
    setValues(base, values);
  };

  const removeValue = (base: ProductAttribute, idx: number) =>
    setValues(base, getEffective(base).values.filter((_, i) => i !== idx));

  const handleSave = async (attr: ProductAttribute) => {
    const edited = dirtyMap.get(attr.id);
    if (!edited) return;
    const clean: ProductAttribute = {
      ...edited,
      name: edited.name.trim(),
      alias: (edited.alias || slugify(edited.name)).trim(),
      values: edited.values
        .filter((v) => v.name.trim())
        .map((v) => ({ name: v.name.trim(), alias: (v.alias || slugify(v.name)).trim() })),
    };
    if (!clean.name) return;

    if (newAttrs.find((a) => a.id === attr.id)) {
      await addMutation.mutateAsync(clean);
      setNewAttrs((ns) => ns.filter((a) => a.id !== attr.id));
    } else {
      await updateMutation.mutateAsync({ id: attr.id, attribute: clean });
    }
    clearDirty(attr.id);
  };

  const handleDiscard = (attr: ProductAttribute) => {
    clearDirty(attr.id);
    if (newAttrs.find((a) => a.id === attr.id)) setNewAttrs((ns) => ns.filter((a) => a.id !== attr.id));
  };

  const handleDelete = async (id: string) => {
    if (newAttrs.find((a) => a.id === id)) {
      setNewAttrs((ns) => ns.filter((a) => a.id !== id));
      clearDirty(id);
      return;
    }
    if (!confirm('Remove this attribute? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
    clearDirty(id);
  };

  const handleAdd = () => {
    const a = newAttribute();
    setNewAttrs((ns) => [...ns, a]);
    setDirty(a.id, a);
  };

  const visibleAttrs = [...newAttrs, ...attributes];

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
            <span>Product Attributes</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Attributes</h1>
              <p className="mt-2 text-sm text-gray-600">
                Store-global variant axes (e.g. Size, Color) with their values. Define them once here, then
                pick them onto products to build variants.
                {!isAdmin && (
                  <span className="text-amber-600 ml-2">(View only — contact an admin to make changes)</span>
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button onClick={handleAdd}>+ Create Product Attribute</Button>
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

        {/* Attributes list */}
        <div className="space-y-4">
          {visibleAttrs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              {debouncedSearch ? `No attributes match "${debouncedSearch}".` : 'No product attributes yet.'}
              {isAdmin && !debouncedSearch && ' Click "Create Product Attribute" to add one.'}
            </div>
          ) : (
            visibleAttrs.map((serverAttr) => {
              const attr = getEffective(serverAttr);
              const isDirty = dirtyMap.has(serverAttr.id);
              const isNew = !!newAttrs.find((a) => a.id === serverAttr.id);
              const isSaving = (addMutation.isPending || updateMutation.isPending) && isDirty;

              return (
                <div
                  key={serverAttr.id}
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
                          <input type="text" value={attr.name} disabled={!isAdmin}
                            onChange={(e) => updateField(serverAttr, 'name', e.target.value)}
                            placeholder="e.g. Size"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                        </Field>
                        <Field label="Alias">
                          <input type="text" value={attr.alias} disabled={!isAdmin}
                            onChange={(e) => updateField(serverAttr, 'alias', e.target.value)}
                            placeholder="e.g. size"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                        </Field>
                      </div>

                      {/* Values */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-600">Values</label>
                          <span className="text-xs text-gray-400">{attr.values.length} value(s)</span>
                        </div>
                        <div className="space-y-2">
                          {attr.values.length === 0 && (
                            <p className="text-sm text-gray-400 italic">No values yet.</p>
                          )}
                          {attr.values.map((v, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input type="text" value={v.name} disabled={!isAdmin}
                                onChange={(e) => updateValue(serverAttr, idx, 'name', e.target.value)}
                                placeholder="Value name (e.g. Small)"
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                              <input type="text" value={v.alias} disabled={!isAdmin}
                                onChange={(e) => updateValue(serverAttr, idx, 'alias', e.target.value)}
                                placeholder="alias (e.g. small)"
                                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]" />
                              {isAdmin && (
                                <button type="button" onClick={() => removeValue(serverAttr, idx)}
                                  className="text-gray-400 hover:text-red-600 shrink-0" aria-label="Remove value">
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          {isAdmin && (
                            <button type="button" onClick={() => addValue(serverAttr)}
                              className="w-full text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-md py-1.5 hover:border-gray-400 hover:text-gray-600">
                              + Add value
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-col gap-1 shrink-0">
                        {isDirty && (
                          <>
                            <button type="button" onClick={() => handleSave(serverAttr)} disabled={isSaving}
                              className="text-sm text-[#4a6ba8] hover:text-[#3d5789] disabled:opacity-50">
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" onClick={() => handleDiscard(serverAttr)}
                              className="text-sm text-gray-500 hover:text-gray-700">Discard</button>
                          </>
                        )}
                        <button type="button" onClick={() => handleDelete(serverAttr.id)}
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
          <Link to="/admin/products">
            <Button type="button">Back to Products</Button>
          </Link>
          <Link to="/admin/products/attribute-presets" className="text-sm text-[#4a6ba8] hover:text-[#3d5789]">
            Manage Attribute Presets →
          </Link>
        </div>

        <div className="mt-4 rounded-lg border bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">How it works:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>Attributes are the store-global axes used to build product variants</li>
            <li>Each attribute has a name, an alias (stable key), and a list of values</li>
            <li>On a product, pick an attribute (or apply a preset) then choose which values apply</li>
            <li>Group attributes into presets to apply several at once</li>
          </ul>
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
