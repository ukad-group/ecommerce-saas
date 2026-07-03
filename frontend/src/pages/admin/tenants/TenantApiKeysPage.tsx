import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  PlusIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { ApiKeyListItem, ApiKeyCreationResponse } from '../../../types/apiKey';
import type { Tenant } from '../../../types/tenant';

export function TenantApiKeysPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<ApiKeyCreationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/tenants/${tenantId}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch tenant');
      return r.json();
    },
    enabled: !!tenantId,
  });

  const { data: apiKeys, isLoading, error } = useQuery<ApiKeyListItem[]>({
    queryKey: ['tenantApiKeys', tenantId],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/tenants/${tenantId}/api-keys`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch API keys');
      return r.json();
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/tenants/${tenantId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error('Failed to generate API key');
      return r.json() as Promise<ApiKeyCreationResponse>;
    },
    onSuccess: (data) => {
      setGeneratedKey(data);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['tenantApiKeys', tenantId] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/tenants/${tenantId}/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) throw new Error('Failed to revoke API key');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenantApiKeys', tenantId] }),
  });

  const copyKey = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/admin/tenants" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Tenants
        </Link>
      </div>

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Tenant API Keys — {tenant?.displayName || 'Loading...'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Tenant-level keys have access to all markets in this tenant. Use the <code className="bg-gray-100 px-1 rounded">X-Market-ID</code> header to scope requests to a specific market.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="block rounded-md bg-[#4a6ba8] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#3d5789]"
          >
            <PlusIcon className="inline-block h-4 w-4 mr-2 -mt-0.5" />
            Generate New Key
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <p className="ml-3 text-sm text-yellow-700">
            Tenant-level keys grant access to <strong>all markets</strong>. Use market-level keys (via Markets → API Keys) for narrower access.
          </p>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  <p className="mt-2 text-sm text-gray-500">Loading...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-sm text-red-600">Error loading API keys</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Name', 'Key', 'Status', 'Created', 'Last Used', ''].map((h) => (
                        <th key={h} className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {apiKeys && apiKeys.length > 0 ? apiKeys.map((key) => (
                      <tr key={key.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                          ••••••••{key.lastFourChars}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {key.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                          {key.status === 'active' && (
                            <button
                              onClick={() => {
                                if (confirm(`Revoke "${key.name}"? This cannot be undone.`)) revokeMutation.mutate(key.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                              disabled={revokeMutation.isPending}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                          No tenant-level API keys yet. Click "Generate New Key" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate modal */}
      {showModal && !generatedKey && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Generate Tenant API Key</h2>
            <div className="mb-4">
              <label htmlFor="keyName" className="block text-sm font-medium text-gray-700">Key Name</label>
              <input
                type="text"
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newKeyName.trim() && createMutation.mutate(newKeyName.trim())}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., Umbraco Integration"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setNewKeyName(''); }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate(newKeyName.trim())}
                disabled={!newKeyName.trim() || createMutation.isPending}
                className="rounded-md bg-[#4a6ba8] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5789] disabled:opacity-50"
              >
                {createMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show generated key */}
      {generatedKey && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">API Key Generated!</h2>
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="ml-3 text-sm text-red-700">
                  Copy this key now — it will not be shown again.
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedKey.key}
                  readOnly
                  className="block w-full rounded-md border-gray-300 bg-gray-50 font-mono text-sm"
                />
                <button onClick={() => copyKey(generatedKey.key)} className="flex-shrink-0">
                  {copied
                    ? <CheckIcon className="h-5 w-5 text-green-500" />
                    : <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />}
                </button>
              </div>
            </div>
            <div className="mb-4 bg-gray-50 rounded-md p-3 text-sm text-gray-600 font-mono">
              <p>X-API-Key: {generatedKey.key}</p>
              <p className="mt-1 text-gray-500 font-sans text-xs">Add X-Market-ID: &lt;market-id&gt; to scope requests to a specific market.</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setGeneratedKey(null); setShowModal(false); }}
                className="rounded-md bg-[#4a6ba8] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5789]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
