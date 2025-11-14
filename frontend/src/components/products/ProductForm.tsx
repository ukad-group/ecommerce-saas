/**
 * Product Form Component
 *
 * Form for creating and editing products.
 * Uses React Hook Form for form handling.
 * Supports both simple products and products with variants.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { ImageUpload } from '../common/ImageUpload';
import { useCategories } from '../../services/hooks/useCategories';
import { VersionBadge } from './VersionBadge';
import { VersionHistoryModal } from './VersionHistoryModal';
import type { Product, ProductStatus, VariantOption, ProductVariant, CustomProperty } from '../../types/product';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Partial<Product>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  images?: string[];
}

interface ProductFormData {
  name: string;
  sku?: string;
  description: string;
  price?: number;
  salePrice?: number;
  status: ProductStatus;
  stockQuantity?: number;
  lowStockThreshold?: number;
  currency: string;
  categoryIds: string[];
  hasVariants?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const { data: categories } = useCategories();

  // State for variant management
  const [hasVariants, setHasVariants] = useState(product?.hasVariants || false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>(
    product?.variantOptions || []
  );
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants || []);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValues, setNewOptionValues] = useState<Record<string, string>>({});

  // State for custom properties management
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>(
    product?.customProperties || []
  );

  // State for images management
  const [images, setImages] = useState<string[]>(product?.images || []);

  // State for version history modal
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ProductFormData>({
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          status: product.status,
          stockQuantity: product.stockQuantity,
          lowStockThreshold: product.lowStockThreshold,
          currency: product.currency,
          categoryIds: product.categoryIds || [],
          hasVariants: product.hasVariants || false,
        }
      : {
          status: 'draft',
          currency: 'USD',
          stockQuantity: 0,
          lowStockThreshold: 10,
          categoryIds: [],
          hasVariants: false,
        },
  });

  const selectedCategories = watch('categoryIds') || [];

  // Sync state when product changes (e.g., after version restore)
  useEffect(() => {
    if (product) {
      // Update local state for custom properties, variants, and images
      setCustomProperties(product.customProperties || []);
      setHasVariants(product.hasVariants || false);
      setVariantOptions(product.variantOptions || []);
      setVariants(product.variants || []);
      setImages(product.images || []);

      // Reset form with new product data
      reset({
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice,
        status: product.status,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: product.lowStockThreshold,
        currency: product.currency,
        categoryIds: product.categoryIds || [],
        hasVariants: product.hasVariants || false,
      });
    }
  }, [product, reset]);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
  ];

  const handleCategoryToggle = (categoryId: string) => {
    const current = selectedCategories;
    if (current.includes(categoryId)) {
      setValue('categoryIds', current.filter((id) => id !== categoryId));
    } else {
      setValue('categoryIds', [...current, categoryId]);
    }
  };

  // Variant management handlers
  const handleToggleVariants = (enabled: boolean) => {
    setHasVariants(enabled);
    setValue('hasVariants', enabled);
    if (!enabled) {
      setVariantOptions([]);
      setVariants([]);
    }
  };

  const handleAddVariantOption = () => {
    if (!newOptionName.trim()) return;

    const existing = variantOptions.find((opt) => opt.name === newOptionName);
    if (existing) {
      alert('Variant option with this name already exists');
      return;
    }

    setVariantOptions([...variantOptions, { name: newOptionName, values: [] }]);
    setNewOptionName('');
  };

  const handleAddVariantValue = (optionName: string) => {
    const value = newOptionValues[optionName];
    if (!value || !value.trim()) return;

    setVariantOptions(
      variantOptions.map((opt) =>
        opt.name === optionName
          ? { ...opt, values: [...opt.values, value] }
          : opt
      )
    );
    setNewOptionValues({ ...newOptionValues, [optionName]: '' });
  };

  const handleRemoveVariantOption = (optionName: string) => {
    setVariantOptions(variantOptions.filter((opt) => opt.name !== optionName));
    // Remove variants that used this option
    setVariants(variants.filter((v) => !(optionName in v.options)));
  };

  const handleRemoveVariantValue = (optionName: string, value: string) => {
    setVariantOptions(
      variantOptions.map((opt) =>
        opt.name === optionName
          ? { ...opt, values: opt.values.filter((v) => v !== value) }
          : opt
      )
    );
    // Remove variants that used this value
    setVariants(variants.filter((v) => v.options[optionName] !== value));
  };

  const generateVariants = () => {
    if (variantOptions.length === 0) return;

    // Generate all possible combinations
    const combinations: Record<string, string>[] = [];
    const generate = (index: number, current: Record<string, string>) => {
      if (index === variantOptions.length) {
        combinations.push({ ...current });
        return;
      }

      const option = variantOptions[index];
      for (const value of option.values) {
        generate(index + 1, { ...current, [option.name]: value });
      }
    };

    generate(0, {});

    // Create variants from combinations
    const newVariants: ProductVariant[] = combinations.map((options, idx) => {
      // Check if variant already exists
      const existing = variants.find(
        (v) => JSON.stringify(v.options) === JSON.stringify(options)
      );

      if (existing) return existing;

      return {
        id: `variant-${Date.now()}-${idx}`,
        sku: '',
        price: 0,
        stockQuantity: 0,
        lowStockThreshold: 10,
        options,
        status: 'draft' as ProductStatus,
      };
    });

    setVariants(newVariants);
  };

  const handleUpdateVariant = (
    variantId: string,
    field: keyof ProductVariant,
    value: any
  ) => {
    setVariants(
      variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  const handleRemoveVariant = (variantId: string) => {
    setVariants(variants.filter((v) => v.id !== variantId));
  };

  // Custom properties handlers
  const handleAddCustomProperty = () => {
    setCustomProperties([...customProperties, { name: '', value: '' }]);
  };

  const handleUpdateCustomProperty = (
    index: number,
    field: 'name' | 'value',
    value: string
  ) => {
    const updated = [...customProperties];
    updated[index] = { ...updated[index], [field]: value };
    setCustomProperties(updated);
  };

  const handleRemoveCustomProperty = (index: number) => {
    setCustomProperties(customProperties.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (data: ProductFormData) => {
    // Clean up empty string values for numeric fields
    const cleanData = {
      ...data,
      price: data.price || undefined,
      salePrice: data.salePrice || undefined,
      stockQuantity: data.stockQuantity ?? undefined,
      lowStockThreshold: data.lowStockThreshold ?? undefined,
    };

    const submitData: Partial<Product> = {
      ...cleanData,
      hasVariants,
      variantOptions: hasVariants ? variantOptions : undefined,
      variants: hasVariants ? variants : undefined,
      customProperties: customProperties.length > 0 ? customProperties : undefined,
      images: images.length > 0 ? images : [],
    };

    // If has variants, don't include base price/stock fields
    if (hasVariants) {
      delete submitData.sku;
      delete submitData.price;
      delete submitData.stockQuantity;
      delete submitData.lowStockThreshold;
    }

    onSubmit(submitData);
  };

  // Build hierarchical category structure
  const buildCategoryTree = () => {
    if (!categories) return [];

    const renderCategory = (category: any, level: number = 0): any[] => {
      const children = categories.filter((c) => c.parentId === category.id);
      return [
        { ...category, level },
        ...children.flatMap((child) => renderCategory(child, level + 1)),
      ];
    };

    const rootCategories = categories.filter((c) => !c.parentId);
    return rootCategories.flatMap((cat) => renderCategory(cat, 0));
  };

  const hierarchicalCategories = buildCategoryTree();

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Basic Information
          </h2>
          {product && (
            <VersionBadge
              version={product.version}
              onViewHistory={() => setIsVersionHistoryOpen(true)}
            />
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            {...register('name', { required: 'Product name is required' })}
            error={errors.name?.message}
            required
          />
          <Input
            label="SKU"
            {...register('sku', { required: !hasVariants ? 'SKU is required' : false })}
            error={errors.sku?.message}
            required={!hasVariants}
          />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Custom Properties */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Custom Properties
            </label>
            <Button
              type="button"
              onClick={handleAddCustomProperty}
              className="text-sm"
            >
              + Property
            </Button>
          </div>
          {customProperties.length > 0 && (
            <div className="space-y-3">
              {customProperties.map((property, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Property name (e.g., Material)"
                      value={property.name}
                      onChange={(e) =>
                        handleUpdateCustomProperty(index, 'name', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Property value (e.g., Aluminum)"
                      value={property.value}
                      onChange={(e) =>
                        handleUpdateCustomProperty(index, 'value', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomProperty(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Images */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Product Images
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload product images. The first image will be used as the primary image.
          Maximum 10 images, 5MB each. Supported formats: JPG, PNG, GIF, WebP.
        </p>
        <ImageUpload
          images={images}
          onChange={setImages}
          maxImages={10}
          disabled={isSubmitting}
        />
      </div>

      {/* Product Variants Toggle */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Product Variants</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enable if this product has multiple variants (e.g., sizes, colors)
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(e) => handleToggleVariants(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {!hasVariants ? (
        <>
          {/* Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Price"
                type="number"
                step="0.01"
                {...register('price', {
                  required: !hasVariants ? 'Price is required' : false,
                  min: { value: 0, message: 'Price must be positive' },
                })}
                error={errors.price?.message}
                required={!hasVariants}
              />
              <Input
                label="Sale Price"
                type="number"
                step="0.01"
                {...register('salePrice', {
                  min: { value: 0, message: 'Sale price must be positive' },
                })}
                error={errors.salePrice?.message}
              />
              <Select
                label="Currency"
                {...register('currency')}
                options={currencyOptions}
              />
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Stock Quantity"
                type="number"
                {...register('stockQuantity', {
                  required: !hasVariants ? 'Stock quantity is required' : false,
                  min: { value: 0, message: 'Stock quantity must be non-negative' },
                })}
                error={errors.stockQuantity?.message}
                required={!hasVariants}
              />
              <Input
                label="Low Stock Threshold"
                type="number"
                {...register('lowStockThreshold', {
                  required: !hasVariants ? 'Low stock threshold is required' : false,
                  min: { value: 0, message: 'Threshold must be non-negative' },
                })}
                error={errors.lowStockThreshold?.message}
                required={!hasVariants}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Variant Options Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Configure Variant Options
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Define variant types (e.g., Size, Color) and their values
            </p>

            {/* Add New Variant Option */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <div className="flex gap-2">
                <Input
                  label="Option Name (e.g., Size, Color)"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Size"
                />
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddVariantOption}>
                    Add Option
                  </Button>
                </div>
              </div>
            </div>

            {/* Display Variant Options */}
            {variantOptions.map((option) => (
              <div key={option.name} className="mb-4 p-4 border rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">{option.name}</h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariantOption(option.name)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                {/* Add values to this option */}
                <div className="flex gap-2 mb-3">
                  <Input
                    label={`Add ${option.name} value`}
                    value={newOptionValues[option.name] || ''}
                    onChange={(e) => setNewOptionValues({ ...newOptionValues, [option.name]: e.target.value })}
                    placeholder="e.g., Small, Red"
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={() => handleAddVariantValue(option.name)}
                    >
                      Add Value
                    </Button>
                  </div>
                </div>

                {/* Display values */}
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      {value}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantValue(option.name, value)}
                        className="ml-2 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {variantOptions.length > 0 && (
              <Button type="button" onClick={generateVariants}>
                Generate All Variant Combinations
              </Button>
            )}
          </div>

          {/* Variant Management */}
          {variants.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Manage Variants ({variants.length})
              </h2>
              <div className="space-y-4">
                {variants.map((variant) => (
                  <div key={variant.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(variant.options).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input
                        type="text"
                        placeholder="SKU"
                        value={variant.sku}
                        onChange={(e) =>
                          handleUpdateVariant(variant.id, 'sku', e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        step="0.01"
                        value={variant.price || ''}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            'price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Sale Price"
                        step="0.01"
                        value={variant.salePrice || ''}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            'salePrice',
                            e.target.value ? parseFloat(e.target.value) : undefined
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={variant.stockQuantity || ''}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            'stockQuantity',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <select
                        value={variant.status}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            'status',
                            e.target.value as ProductStatus
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Status</h2>
        <Select label="Product Status" {...register('status')} options={statusOptions} />
      </div>

      {/* Categories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Categories</h2>
        <div className="space-y-2">
          {hierarchicalCategories.length > 0 ? (
            hierarchicalCategories.map((category) => (
              <label
                key={category.id}
                className="flex items-center"
                style={{ paddingLeft: `${category.level * 1.5}rem` }}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {category.level > 0 && (
                    <span className="text-gray-400 mr-1">└─</span>
                  )}
                  {category.name}
                </span>
              </label>
            ))
          ) : (
            <p className="text-sm text-gray-500">No categories available</p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          title="Cancel and go back to products list"
        >
          Go Back
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>

      {/* Version History Modal */}
      {product && (
        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          productId={product.id}
          productName={product.name}
          currentVersion={product.version}
        />
      )}
    </form>
  );
}
