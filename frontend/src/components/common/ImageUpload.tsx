/**
 * Image Upload Component
 *
 * Allows users to upload multiple images with preview and drag-and-drop reordering.
 */

import { useState, useRef } from 'react';
import { useFileUpload } from '../../services/hooks/useFileUpload';
import { Button } from './Button';
import { ImageMetaEditor } from './ImageMetaEditor';
import type { ProductImage, ProductImageEntry } from '../../types/product';
import { imageUrl, imageAlt, imageFocalPoint, focalPointStyle } from '../../utils/imageHelper';

interface ImageUploadProps {
  images: ProductImageEntry[];
  onChange: (images: ProductImageEntry[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

/** Normalize a bare URL string entry into a rich object so metadata can be attached. */
function toProductImage(entry: ProductImageEntry): ProductImage {
  return typeof entry === 'string' ? { url: entry } : entry;
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 10,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, uploadError } = useFileUpload();
  const [localError, setLocalError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setLocalError(null);

    // Check if adding these files would exceed the max
    if (images.length + files.length > maxImages) {
      setLocalError(`Maximum ${maxImages} images allowed`);
      return;
    }

    try {
      const urls = await upload(files);
      onChange([...images, ...urls.map((url) => ({ url }))]);
    } catch (error) {
      // Error is already handled by the hook
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleSaveMeta = (index: number, updated: ProductImage) => {
    const newImages = images.map((img, i) => (i === index ? updated : img));
    onChange(newImages);
    setEditingIndex(null);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newImages = [...images];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(dragOverIndex, 0, removed);
      onChange(newImages);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || isUploading || images.length >= maxImages}
          className="hidden"
        />
        <Button
          type="button"
          onClick={handleBrowseClick}
          disabled={disabled || isUploading || images.length >= maxImages}
        >
          {isUploading ? 'Uploading...' : 'Upload Images'}
        </Button>
        <span className="text-sm text-gray-500">
          {images.length} / {maxImages} images
        </span>
      </div>

      {/* Error Messages */}
      {(uploadError || localError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {uploadError || localError}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <>
          <p className="text-xs text-gray-500 italic">
            Drag and drop images to reorder. First image is the primary image.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((entry, index) => (
              <div
                key={index}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={`relative group cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : ''
                }`}
              >
                <img
                  src={imageUrl(entry)}
                  alt={imageAlt(entry, `Product image ${index + 1}`)}
                  className="w-full h-32 object-cover rounded-md border border-gray-300 pointer-events-none"
                  style={focalPointStyle(imageFocalPoint(entry))}
                />
                <button
                  type="button"
                  onClick={() => setEditingIndex(index)}
                  disabled={disabled}
                  className="absolute top-1 right-8 bg-[#4a6ba8] text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-10"
                  title="Edit alt text & focal point"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  disabled={disabled}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-10"
                  title="Remove image"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {imageFocalPoint(entry) && (
                  <div
                    className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white bg-[#4a6ba8] shadow pointer-events-none z-10"
                    style={{
                      left: `${imageFocalPoint(entry)!.left * 100}%`,
                      top: `${imageFocalPoint(entry)!.top * 100}%`,
                    }}
                    title="Focal point"
                  />
                )}
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-gray-800 bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No images uploaded</p>
          <p className="text-xs text-gray-400">Click "Upload Images" to add product images</p>
        </div>
      )}

      {/* Per-image metadata editor */}
      {editingIndex !== null && images[editingIndex] !== undefined && (
        <ImageMetaEditor
          image={toProductImage(images[editingIndex])}
          onSave={(updated) => handleSaveMeta(editingIndex, updated)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
}
