/**
 * Admin Order Statuses Management Page
 *
 * Allows admins to manage custom order statuses for their tenant.
 */

import { useState } from 'react';
import {
  useOrderStatuses,
  useCreateOrderStatus,
  useUpdateOrderStatus,
  useDeleteOrderStatus,
  useResetToDefaultStatuses,
} from '../services/hooks/useOrderStatuses';
import type {
  OrderStatusDefinition,
  CreateOrderStatusRequest,
} from '../types/orderStatus';

export function AdminOrderStatusesPage() {
  const { data: statuses = [], isLoading } = useOrderStatuses();
  const createMutation = useCreateOrderStatus();
  const updateMutation = useUpdateOrderStatus();
  const deleteMutation = useDeleteOrderStatus();
  const resetMutation = useResetToDefaultStatuses();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<OrderStatusDefinition>>({
    name: '',
    code: '',
    color: '#6B7280',
    sortOrder: statuses.length + 1,
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      alert('Name and Code are required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        code: formData.code,
        color: formData.color || '#6B7280',
        sortOrder: formData.sortOrder || statuses.length + 1,
      } as CreateOrderStatusRequest);

      setIsAddingNew(false);
      setFormData({
        name: '',
        code: '',
        color: '#6B7280',
        sortOrder: statuses.length + 1,
      });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create status');
    }
  };

  const handleUpdate = async (statusId: string) => {
    try {
      await updateMutation.mutateAsync({
        statusId,
        data: formData,
      });
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        color: '#6B7280',
        sortOrder: statuses.length + 1,
      });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = async (statusId: string, statusName: string) => {
    if (!confirm(`Are you sure you want to delete "${statusName}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(statusId);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete status');
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'This will remove all custom statuses (that are not in use) and reset defaults. Continue?'
      )
    ) {
      return;
    }

    try {
      await resetMutation.mutateAsync();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reset statuses');
    }
  };

  const startEdit = (status: OrderStatusDefinition) => {
    setEditingId(status.id);
    setFormData({
      name: status.name,
      color: status.color,
      sortOrder: status.sortOrder,
      isActive: status.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setFormData({
      name: '',
      code: '',
      color: '#6B7280',
      sortOrder: statuses.length + 1,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p>Loading order statuses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Status Management</h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setIsAddingNew(true)}
              className="rounded bg-[#4a6ba8] px-4 py-2 text-white hover:bg-[#3d5789]"
              disabled={isAddingNew}
            >
              Add New Status
            </button>
            <button
              onClick={handleReset}
              className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
              disabled={resetMutation.isPending}
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow overflow-x-auto">
          <table className="w-full min-w-[640px]">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Order
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden md:table-cell">
                Code
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Color
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden lg:table-cell">
                Type
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isAddingNew && (
              <tr className="bg-blue-50">
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={formData.sortOrder || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
                    }
                    className="w-20 rounded border px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Ready to Ship"
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., ready-to-ship"
                    className="w-full rounded border px-2 py-1"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="color"
                    value={formData.color || '#6B7280'}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="h-8 w-20 rounded border"
                  />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-green-600">Active</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-[#4a6ba8]">Custom</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={handleCreate}
                    className="mr-2 text-[#4a6ba8] hover:text-[#3d5789]"
                    disabled={createMutation.isPending}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            )}

            {statuses.map((status) => {
              const isEditing = editingId === status.id;

              return (
                <tr key={status.id} className={isEditing ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.sortOrder || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sortOrder: parseInt(e.target.value),
                          })
                        }
                        className="w-20 rounded border px-2 py-1"
                      />
                    ) : (
                      <span className="text-gray-600">{status.sortOrder}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full rounded border px-2 py-1"
                      />
                    ) : (
                      <span className="font-medium">{status.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                      {status.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="color"
                        value={formData.color || status.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="h-8 w-20 rounded border"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border"
                          style={{ backgroundColor: status.color }}
                        />
                        <code className="text-xs text-gray-600 hidden lg:inline">{status.color}</code>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {isEditing ? (
                      <select
                        value={formData.isActive ? 'active' : 'inactive'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.value === 'active',
                          })
                        }
                        className="rounded border px-2 py-1"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span
                        className={
                          status.isActive ? 'text-green-600' : 'text-gray-400'
                        }
                      >
                        {status.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className={
                        status.isSystemDefault ? 'text-purple-600' : 'text-[#4a6ba8]'
                      }
                    >
                      {status.isSystemDefault ? 'System' : 'Custom'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleUpdate(status.id)}
                          className="mr-2 text-[#4a6ba8] hover:text-[#3d5789]"
                          disabled={updateMutation.isPending}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(status)}
                          className="mr-2 text-[#4a6ba8] hover:text-[#3d5789]"
                        >
                          Edit
                        </button>
                        {!status.isSystemDefault && (
                          <button
                            onClick={() => handleDelete(status.id, status.name)}
                            className="text-red-600 hover:text-red-800"
                            disabled={deleteMutation.isPending}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div className="mt-6 rounded-lg border bg-[#4a6ba8]/5 p-4">
          <h3 className="mb-2 font-semibold text-[#304477]">Notes:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-[#3d5789]">
            <li>System default statuses cannot be deleted</li>
            <li>Custom statuses can only be deleted if not used by any orders</li>
            <li>Inactive statuses won't appear in dropdowns but remain in the system</li>
            <li>
              Use "Reset to Defaults" to remove unused custom statuses and restore all
              defaults
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
