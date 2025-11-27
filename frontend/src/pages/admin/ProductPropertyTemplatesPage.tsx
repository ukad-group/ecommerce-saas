/**
 * Product Property Templates Page
 *
 * Allows admins to manage custom property templates for the current market.
 * These templates define default properties that appear on all products.
 */

import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  useMarketPropertyTemplates,
  useUpdateMarketPropertyTemplates,
} from '../../services/hooks/useMarketPropertyTemplates';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import type { CustomPropertyTemplate } from '../../types/market';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function ProductPropertyTemplatesPage() {
  const { data: templates = [], isLoading } = useMarketPropertyTemplates();
  const updateMutation = useUpdateMarketPropertyTemplates();
  const role = useAuthStore((state) => state.getRole());

  const isAdmin = role === Role.SUPERADMIN || role === Role.TENANT_ADMIN;

  // Track if we've initialized from server data
  const initializedRef = useRef(false);
  const lastTemplatesRef = useRef<string>('');

  // Local state for editing
  const [localTemplates, setLocalTemplates] = useState<CustomPropertyTemplate[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched data (only when server data actually changes)
  const templatesJson = JSON.stringify(templates);
  if (!isLoading && templatesJson !== lastTemplatesRef.current && !hasChanges) {
    lastTemplatesRef.current = templatesJson;
    if (!initializedRef.current || templates.length > 0 || localTemplates.length === 0) {
      initializedRef.current = true;
      setLocalTemplates(templates);
    }
  }

  const handleAddTemplate = () => {
    const maxSortOrder = localTemplates.reduce(
      (max, t) => Math.max(max, t.sortOrder),
      0
    );
    setLocalTemplates([
      ...localTemplates,
      { name: '', defaultValue: '', sortOrder: maxSortOrder + 1 },
    ]);
    setHasChanges(true);
  };

  const handleUpdateTemplate = (
    index: number,
    field: keyof CustomPropertyTemplate,
    value: string | number
  ) => {
    const updated = [...localTemplates];
    updated[index] = { ...updated[index], [field]: value };
    setLocalTemplates(updated);
    setHasChanges(true);
  };

  const handleRemoveTemplate = (index: number) => {
    setLocalTemplates(localTemplates.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...localTemplates];
    // Swap sort orders
    const tempSortOrder = updated[index].sortOrder;
    updated[index].sortOrder = updated[index - 1].sortOrder;
    updated[index - 1].sortOrder = tempSortOrder;
    // Swap positions
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    setLocalTemplates(updated);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === localTemplates.length - 1) return;
    const updated = [...localTemplates];
    // Swap sort orders
    const tempSortOrder = updated[index].sortOrder;
    updated[index].sortOrder = updated[index + 1].sortOrder;
    updated[index + 1].sortOrder = tempSortOrder;
    // Swap positions
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setLocalTemplates(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Filter out templates with empty names
    const validTemplates = localTemplates.filter((t) => t.name.trim() !== '');

    // Normalize sort orders
    const normalizedTemplates = validTemplates.map((t, idx) => ({
      ...t,
      sortOrder: idx + 1,
    }));

    try {
      await updateMutation.mutateAsync(normalizedTemplates);
      setHasChanges(false);
    } catch (error: any) {
      alert(error.message || 'Failed to save templates');
    }
  };

  const handleCancel = () => {
    setLocalTemplates([...templates]);
    setHasChanges(false);
  };

  if (isLoading) {
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
            <Link to="/admin/products" className="hover:text-gray-700">
              Products
            </Link>
            <span>/</span>
            <span>Property Templates</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Product Property Templates
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Define default properties that will appear on all products in this market.
                {!isAdmin && (
                  <span className="text-amber-600 ml-2">
                    (View only - contact an admin to make changes)
                  </span>
                )}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={handleAddTemplate}>+ Add Property</Button>
            )}
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-16">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Property Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Default Value
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-32">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {localTemplates.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No property templates defined.
                    {isAdmin && ' Click "Add Property" to create one.'}
                  </td>
                </tr>
              ) : (
                localTemplates.map((template, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Move up"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === localTemplates.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Move down"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <span className="text-gray-500 text-sm ml-1">
                            {template.sortOrder}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">{template.sortOrder}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <input
                          type="text"
                          value={template.name}
                          onChange={(e) =>
                            handleUpdateTemplate(index, 'name', e.target.value)
                          }
                          placeholder="e.g., Brand, Material"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      ) : (
                        <span className="font-medium">{template.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <input
                          type="text"
                          value={template.defaultValue || ''}
                          onChange={(e) =>
                            handleUpdateTemplate(index, 'defaultValue', e.target.value)
                          }
                          placeholder="(optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      ) : (
                        <span className="text-gray-600">
                          {template.defaultValue || '(no default)'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveTemplate(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="mt-6 flex justify-end gap-4">
            <Link to="/admin/products">
              <Button
                type="button"
                onClick={hasChanges ? handleCancel : undefined}
              >
                {hasChanges ? 'Cancel' : 'Back to Products'}
              </Button>
            </Link>
            {hasChanges && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 rounded-lg border bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">How it works:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>Property templates define standard fields for all products</li>
            <li>When editing a product, these properties will appear automatically</li>
            <li>Products can have additional custom properties beyond these templates</li>
            <li>Empty template properties won't be saved on products</li>
            <li>Existing product properties are not affected when templates change</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
