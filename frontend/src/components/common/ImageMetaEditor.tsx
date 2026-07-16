/**
 * Image Metadata Editor
 *
 * Modal for editing a single product image's alt text and focal point.
 * The focal point is set by clicking/dragging on the preview; it drives object-position
 * cropping on the storefront so the subject stays in frame at any size.
 */

import { useState, useRef } from 'react';
import type { ProductImage } from '../../types/product';
import { Button } from './Button';

interface ImageMetaEditorProps {
  image: ProductImage;
  onSave: (image: ProductImage) => void;
  onClose: () => void;
}

export function ImageMetaEditor({ image, onSave, onClose }: ImageMetaEditorProps) {
  const [altText, setAltText] = useState(image.altText ?? '');
  const [focalPoint, setFocalPoint] = useState(image.focalPoint);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const setFocalFromEvent = (e: React.MouseEvent) => {
    const rect = imgWrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const left = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const top = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setFocalPoint({ left: Math.round(left * 1000) / 1000, top: Math.round(top * 1000) / 1000 });
  };

  const handleSave = () => {
    onSave({
      ...image,
      altText: altText.trim() ? altText.trim() : undefined,
      focalPoint,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[#304477]">Edit image</h3>

        {/* Focal point picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Focal point
            <span className="ml-2 text-xs font-normal text-gray-500">
              Click the image to set where cropping should stay centered
            </span>
          </label>
          <div
            ref={imgWrapRef}
            onClick={setFocalFromEvent}
            className="relative inline-block cursor-crosshair select-none border border-gray-300 rounded-md overflow-hidden"
          >
            <img
              src={image.url}
              alt={altText || 'Product image'}
              className="max-h-64 max-w-full pointer-events-none"
            />
            {focalPoint && (
              <div
                className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white bg-[#4a6ba8] shadow ring-1 ring-black/30 pointer-events-none"
                style={{ left: `${focalPoint.left * 100}%`, top: `${focalPoint.top * 100}%` }}
              />
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            <span>
              {focalPoint
                ? `${Math.round(focalPoint.left * 100)}% / ${Math.round(focalPoint.top * 100)}%`
                : 'No focal point set (defaults to center)'}
            </span>
            {focalPoint && (
              <button
                type="button"
                className="text-[#4a6ba8] hover:text-[#3d5789] underline"
                onClick={() => setFocalPoint(undefined)}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Alt text */}
        <div>
          <label htmlFor="image-alt-text" className="block text-sm font-medium text-gray-700 mb-1">
            Alt text
          </label>
          <input
            id="image-alt-text"
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for accessibility"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#4a6ba8] focus:outline-none focus:ring-1 focus:ring-[#4a6ba8]"
          />
        </div>

        {image.crops && image.crops.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">Crops (from media library):</span>{' '}
            {image.crops.map((c) => c.alias).join(', ')}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
