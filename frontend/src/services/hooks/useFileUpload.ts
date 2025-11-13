/**
 * File Upload Hook
 *
 * Provides file upload functionality with progress tracking.
 */

import { useState } from 'react';
import { uploadImages, deleteImage } from '../api/files';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = async (files: File[]): Promise<string[]> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadImages(files);

      if (result.errors && result.errors.length > 0) {
        setUploadError(result.errors.join(', '));
      }

      return result.urls;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to upload images';
      setUploadError(message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const remove = async (fileUrl: string): Promise<void> => {
    try {
      // Extract filename from URL
      const fileName = fileUrl.split('/').pop();
      if (!fileName) {
        throw new Error('Invalid file URL');
      }

      await deleteImage(fileName);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to delete image';
      throw new Error(message);
    }
  };

  return {
    upload,
    remove,
    isUploading,
    uploadError,
  };
}
