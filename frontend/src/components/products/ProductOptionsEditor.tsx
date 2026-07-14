/**
 * ProductOptionsEditor Component
 *
 * Edits a product's option BLOCKS. Each block has a Title, Description, a
 * Disable toggle, and a picker that selects store-global option presets
 * (the "sub options") by reference. The presets themselves are managed in
 * the Option Presets library page.
 */

import { Link } from 'react-router-dom';
import { TagIcon, RectangleStackIcon } from '@heroicons/react/24/outline';
import type { ProductOption, OptionPreset } from '../../types/product';
import { useAllPresets } from '../../services/hooks/useMarketOptionPresets';

interface ProductOptionsEditorProps {
  options: ProductOption[];
  currency: string;
  onChange: (options: ProductOption[]) => void;
}

export function ProductOptionsEditor({
  options,
  currency,
  onChange,
}: ProductOptionsEditorProps) {
  const { data: presets = [], isLoading } = useAllPresets();
  const presetById = new Map<string, OptionPreset>(presets.map((p) => [p.id, p]));

  const updateBlock = (id: string, patch: Partial<ProductOption>) => {
    onChange(options.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const addBlock = () => {
    onChange([
      ...options,
      { id: `block-${Date.now()}`, title: '', description: '', optionIds: [], disabled: false },
    ]);
  };

  const removeBlock = (id: string) => {
    onChange(options.filter((b) => b.id !== id));
  };

  const toggleOption = (blockId: string, optionId: string) => {
    const block = options.find((b) => b.id === blockId);
    if (!block) return;
    const has = block.optionIds.includes(optionId);
    updateBlock(blockId, {
      optionIds: has
        ? block.optionIds.filter((x) => x !== optionId)
        : [...block.optionIds, optionId],
    });
  };

  const activePresets = presets.filter((p) => p.status === 'active');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Options {options.length > 0 && `(${options.length})`}
        </h2>
        <button
          type="button"
          onClick={addBlock}
          className="px-3 py-1.5 bg-[#4a6ba8] text-white rounded-md text-sm hover:bg-[#3d5789] font-medium"
        >
          + Add Option Block
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Group add-ons into titled blocks. Pick which store-global options each block offers.
        Manage the options themselves in the{' '}
        <Link to="/admin/products/option-presets" className="text-[#4a6ba8] hover:underline">
          Option Presets
        </Link>{' '}
        library.
      </p>

      {!isLoading && activePresets.length === 0 && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          No active option presets exist yet. Create some in the{' '}
          <Link to="/admin/products/option-presets" className="underline">
            Option Presets
          </Link>{' '}
          library first, then pick them here.
        </div>
      )}

      {options.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          No option blocks yet. Click "Add Option Block" to create one.
        </p>
      )}

      <div className="space-y-4">
        {options.map((block) => (
          <div
            key={block.id}
            className={`border rounded-lg p-4 ${block.disabled ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200'}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={block.title}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  placeholder="Block title (e.g. Couplings, Accessories)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8]"
                />
                <textarea
                  value={block.description || ''}
                  onChange={(e) => updateBlock(block.id, { description: e.target.value })}
                  rows={2}
                  placeholder="Block description (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8]"
                />
              </div>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="text-red-600 hover:text-red-800 text-sm shrink-0"
              >
                Remove
              </button>
            </div>

            {/* Disable toggle */}
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={block.disabled ?? false}
                onChange={(e) => updateBlock(block.id, { disabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Disable (hide this block on the storefront)</span>
            </label>

            {/* Sub-options picker */}
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
                Sub options
              </p>
              {isLoading ? (
                <p className="text-sm text-gray-400">Loading options…</p>
              ) : activePresets.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No options available to pick.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activePresets.map((preset) => {
                    const checked = block.optionIds.includes(preset.id);
                    const isGroup = (preset.kind ?? 'single') === 'group';
                    return (
                      <label
                        key={preset.id}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm ${
                          checked ? 'border-[#4a6ba8] bg-[#4a6ba8]/5' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOption(block.id, preset.id)}
                          className="w-4 h-4"
                        />
                        {isGroup ? (
                          <RectangleStackIcon className="w-4 h-4 shrink-0 text-purple-600" />
                        ) : (
                          <TagIcon className="w-4 h-4 shrink-0 text-gray-400" />
                        )}
                        <span className="flex-1 min-w-0 truncate">{preset.name}</span>
                        {isGroup ? (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Group · {preset.subOptionIds?.length ?? 0}
                          </span>
                        ) : (
                          <span className="text-gray-500 shrink-0">
                            {preset.price} {currency}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Show any referenced ids that no longer resolve to a preset */}
              {block.optionIds.filter((id) => !presetById.has(id)).length > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  {block.optionIds.filter((id) => !presetById.has(id)).length} referenced option(s) no
                  longer exist in the library.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
