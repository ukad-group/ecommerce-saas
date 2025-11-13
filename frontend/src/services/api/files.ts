/**
 * Files API Service
 *
 * Handles file upload and deletion operations.
 * Requires authentication (X-User-ID header).
 */

import { apiClient } from './client';

export interface UploadResponse {
  urls: string[];
  errors?: string[];
}

/**
 * Upload one or more image files
 * Requires authentication via X-User-ID header
 */
export async function uploadImages(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Don't set Content-Type header - browser will set it automatically with boundary
  const response = await apiClient.post<UploadResponse>('/files/upload', formData);

  return response;
}

/**
 * Delete an uploaded file
 * Requires authentication via X-User-ID header
 */
export async function deleteImage(fileName: string): Promise<void> {
  await apiClient.delete(`/files/${fileName}`);
}
