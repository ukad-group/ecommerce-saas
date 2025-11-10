/**
 * Version History Modal Component
 *
 * Displays version history for a product with ability to view details and restore previous versions.
 */

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type { Product } from '../../types/product';
import { getProductVersions, restoreProductVersion } from '../../services/api/productsApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentVersion?: number; // Optional, used for future enhancements
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentVersion,
}: VersionHistoryModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  // Fetch version history
  const { data: versions, isLoading, error } = useQuery({
    queryKey: ['product-versions', productId],
    queryFn: () => getProductVersions(productId),
    enabled: isOpen,
  });

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: ({ productId, version }: { productId: string; version: number }) =>
      restoreProductVersion(productId, version),
    onSuccess: async () => {
      // Invalidate all product queries to refresh data immediately
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['product-versions', productId] });

      // Force refetch the specific product to update the form
      await queryClient.refetchQueries({ queryKey: ['products', productId] });

      // Keep modal open so user can see the updated version history
      // The version list will automatically refresh due to query invalidation
    },
  });

  const handleRestore = (version: number) => {
    if (window.confirm(`Are you sure you want to restore version ${version}? This will make it the current version.`)) {
      restoreMutation.mutate({ productId, version });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      Version History
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500">{productName}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading version history...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">
                      Failed to load version history. Please try again.
                    </p>
                  </div>
                )}

                {/* Version List */}
                {versions && versions.length > 0 && (
                  <div className="space-y-4">
                    {versions.map((version) => (
                      <div
                        key={version.version}
                        className={`border rounded-lg p-4 ${
                          version.isCurrentVersion
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Version Header */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                Version {version.version}
                              </span>
                              {version.isCurrentVersion && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="h-3 w-3" />
                                  Current
                                </span>
                              )}
                            </div>

                            {/* Version Metadata */}
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <ClockIcon className="h-4 w-4" />
                                {formatDate(version.versionCreatedAt)}
                              </span>
                              <span>By: {version.versionCreatedBy}</span>
                            </div>

                            {/* Change Notes */}
                            {version.changeNotes && (
                              <div className="mt-2 text-sm text-gray-700">
                                <span className="font-medium">Notes: </span>
                                {version.changeNotes}
                              </div>
                            )}

                            {/* Version Details */}
                            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div>
                                <span className="text-gray-500">Price:</span>{' '}
                                <span className="font-medium">
                                  ${version.price?.toFixed(2) || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Status:</span>{' '}
                                <span className="font-medium capitalize">{version.status}</span>
                              </div>
                              {version.stockQuantity !== undefined && (
                                <div>
                                  <span className="text-gray-500">Stock:</span>{' '}
                                  <span className="font-medium">{version.stockQuantity}</span>
                                </div>
                              )}
                              {version.sku && (
                                <div>
                                  <span className="text-gray-500">SKU:</span>{' '}
                                  <span className="font-medium">{version.sku}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="ml-4 flex flex-col gap-2">
                            {!version.isCurrentVersion && (
                              <button
                                type="button"
                                onClick={() => handleRestore(version.version)}
                                disabled={restoreMutation.isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ArrowPathIcon className="h-3 w-3" />
                                Restore
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedVersion(version)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {versions && versions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">No version history available</p>
                  </div>
                )}

                {/* Version Details Modal (nested) */}
                {selectedVersion && (
                  <VersionDetailsModal
                    version={selectedVersion}
                    onClose={() => setSelectedVersion(null)}
                  />
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Version Details Modal (shows full product data)
function VersionDetailsModal({
  version,
  onClose,
}: {
  version: Product;
  onClose: () => void;
}) {
  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    Version {version.version} Details
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Product Name</h4>
                    <p className="mt-1 text-sm text-gray-900">{version.name}</p>
                  </div>

                  {version.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Description</h4>
                      <p className="mt-1 text-sm text-gray-900">{version.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">SKU</h4>
                      <p className="mt-1 text-sm text-gray-900">{version.sku || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Price</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        ${version.price?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Status</h4>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{version.status}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Stock Quantity</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {version.stockQuantity ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  {version.customProperties && version.customProperties.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Custom Properties
                      </h4>
                      <div className="space-y-2">
                        {version.customProperties.map((prop, idx) => (
                          <div key={idx} className="flex gap-2 text-sm">
                            <span className="font-medium text-gray-700">{prop.name}:</span>
                            <span className="text-gray-900">{prop.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
