/**
 * API Keys Management Page
 *
 * Allows management of API keys for a specific market.
 * Users can generate new keys, view existing keys, and revoke keys.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
  PlusIcon,
  KeyIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import type { ApiKeyListItem, CreateApiKeyInput, ApiKeyCreationResponse } from '../../../types/apiKey';
import type { Market } from '../../../types/market';

export function ApiKeysPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<ApiKeyCreationResponse | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch market details
  const { data: market } = useQuery<Market>({
    queryKey: ['market', marketId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/markets/${marketId}`, {
        credentials: 'include', // Send JWT cookie
      });
      if (!response.ok) {
        throw new Error('Failed to fetch market');
      }
      return response.json();
    },
    enabled: !!marketId,
  });

  // Fetch API keys for the market
  const { data: apiKeys, isLoading, error } = useQuery<ApiKeyListItem[]>({
    queryKey: ['apiKeys', marketId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/markets/${marketId}/api-keys`, {
        credentials: 'include', // Send JWT cookie
      });
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      return response.json();
    },
    enabled: !!marketId,
  });

  // Generate new API key mutation
  const generateKeyMutation = useMutation({
    mutationFn: async (input: CreateApiKeyInput) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/markets/${marketId}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send JWT cookie
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to generate API key');
      }
      return response.json() as Promise<ApiKeyCreationResponse>;
    },
    onSuccess: (data) => {
      setGeneratedKey(data);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['apiKeys', marketId] });
      // Update market's API key count
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });

  // Revoke API key mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/markets/${marketId}/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include', // Send JWT cookie
      });
      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys', marketId] });
      // Update market's API key count
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });

  const handleGenerateKey = () => {
    if (newKeyName.trim()) {
      generateKeyMutation.mutate({ name: newKeyName.trim() });
    }
  };

  const handleRevokeKey = (key: ApiKeyListItem) => {
    if (confirm(`Are you sure you want to revoke the API key "${key.name}"? This action cannot be undone.`)) {
      revokeKeyMutation.mutate(key.id);
    }
  };

  const copyToClipboard = async (text: string, keyId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (keyId) {
        setCopiedKeyId(keyId);
        setTimeout(() => setCopiedKeyId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with back button */}
      <div className="mb-6">
        <Link
          to="/admin/markets"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Markets
        </Link>
      </div>

      {/* Page title */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            API Keys - {market?.name || 'Loading...'}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage API keys for external integrations. Each key provides access to this market's data.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="block rounded-md bg-[#4a6ba8] px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#3d5789] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a6ba8]"
          >
            <PlusIcon className="inline-block h-4 w-4 mr-2 -mt-0.5" />
            Generate New Key
          </button>
        </div>
      </div>

      {/* API Configuration Info */}
      <div className="mt-6 rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <KeyIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">API Configuration</h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <div>
                <span className="font-semibold">Base URL:</span>
                <span className="ml-2 font-mono">{import.meta.env.VITE_API_BASE_URL}</span>
              </div>
              <div>
                <span className="font-semibold">Tenant ID:</span>
                <span className="ml-2 font-mono">{market?.tenantId || 'Loading...'}</span>
              </div>
              <div>
                <span className="font-semibold">Market ID:</span>
                <span className="ml-2 font-mono">{marketId}</span>
              </div>
              <p className="mt-2 text-xs">Use these values to configure external integrations with your API keys.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security warning */}
      <div className="mt-4 rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                API keys provide full access to this market's data. Keep them secure and never share them publicly.
                Keys are shown only once when generated.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys list */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading API keys...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-red-600">Error loading API keys</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Key
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Last Used
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {apiKeys && apiKeys.length > 0 ? (
                      apiKeys.map((key) => (
                        <tr key={key.id}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                            {key.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <KeyIcon className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="font-mono">••••••••{key.lastFourChars}</span>
                              <button
                                onClick={() => copyToClipboard(key.id, key.id)}
                                className="ml-2 text-gray-400 hover:text-gray-600"
                                title="Copy Key ID"
                              >
                                {copiedKeyId === key.id ? (
                                  <CheckIcon className="h-4 w-4 text-green-500" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                key.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {key.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(key.createdAt).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {key.lastUsedAt
                              ? new Date(key.lastUsedAt).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            {key.status === 'active' && (
                              <button
                                onClick={() => handleRevokeKey(key)}
                                className="text-red-600 hover:text-red-900"
                                disabled={revokeKeyMutation.isPending}
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                          No API keys generated yet. Click "Generate New Key" to create one.
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

      {/* Generate Key Modal */}
      {showGenerateModal && !generatedKey && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Generate New API Key</h2>
            <div className="mb-4">
              <label htmlFor="keyName" className="block text-sm font-medium text-gray-700">
                Key Name
              </label>
              <input
                type="text"
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., Production Integration"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Choose a descriptive name to identify this key's purpose.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowGenerateModal(false);
                  setNewKeyName('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateKey}
                disabled={!newKeyName.trim() || generateKeyMutation.isPending}
                className="rounded-md bg-[#4a6ba8] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5789] focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:ring-offset-2 disabled:opacity-50"
              >
                {generateKeyMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Key Display Modal */}
      {generatedKey && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">API Key Generated Successfully!</h2>
              <div className="mt-2 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Important</h3>
                    <p className="mt-1 text-sm text-red-700">
                      This is the only time you'll see this key. Please copy it now and store it securely.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={generatedKey.key}
                  readOnly
                  className="block w-full rounded-md border-gray-300 bg-gray-50 pr-10 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(generatedKey.key)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Integration Instructions</h3>
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600 font-mono">
                <p>Include this header in your API requests:</p>
                <p className="mt-2">X-API-Key: {generatedKey.key}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setGeneratedKey(null);
                  setShowGenerateModal(false);
                }}
                className="rounded-md bg-[#4a6ba8] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5789] focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:ring-offset-2"
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