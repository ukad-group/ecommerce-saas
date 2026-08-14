/**
 * Product Form Component
 *
 * Form for creating and editing products.
 * Uses React Hook Form for form handling.
 * Supports both simple products and products with variants.
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { ImageUpload } from '../common/ImageUpload';
import { useCategories } from '../../services/hooks/useCategories';
import { useMarketPropertyTemplates } from '../../services/hooks/useMarketPropertyTemplates';
import { useAllAttributes, useAllAttributePresets } from '../../services/hooks/useMarketAttributes';
import { useAuthStore } from '../../store/authStore';
import { Role } from '../../types/auth';
import { VersionBadge } from './VersionBadge';
import { VersionHistoryModal } from './VersionHistoryModal';
import type { Product, ProductStatus, VariantOption, ProductVariant, VariantOptionSelection, CustomProperty, ProductImageEntry, ProductAttribute } from '../../types/product';
import { slugify } from '../../pages/admin/ProductAttributesPage';

/** Order-independent identity key for a variant's option selections, by stable alias (rename-proof). */
const variantComboKey = (opts: VariantOptionSelection[]) =>
  opts.map((o) => `${o.attributeId || o.alias}=${o.valueAlias}`).sort().join('|');

// Extended property type for merged display
interface MergedCustomProperty extends CustomProperty {
  isMarketTemplate: boolean;
  /**
   * Where this row lives in `customProperties`, or -1 for a market template the product hasn't
   * filled in yet. Rows are identified by this, never by their name — the name is the thing being
   * typed, so matching on it renames the wrong row when two are blank and remounts the input on
   * every keystroke.
   */
  sourceIndex: number;
}

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Partial<Product>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  images?: ProductImageEntry[];
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
  categoryIds: string[];
  hasVariants?: boolean;
  leasingFactor?: number;
  hidePrice?: boolean;
  hiddenPriceDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const { data: categories } = useCategories();
  const { data: marketTemplates = [] } = useMarketPropertyTemplates();
  const { data: libraryAttributes = [] } = useAllAttributes();
  const { data: attributePresets = [] } = useAllAttributePresets();
  const role = useAuthStore((state) => state.getRole());
  const isAdmin = role === Role.SUPERADMIN || role === Role.TENANT_ADMIN;

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

  // State for highlights
  const [highlights, setHighlights] = useState<string[]>(product?.highlights || []);

  // State for images management
  const [images, setImages] = useState<ProductImageEntry[]>(product?.images || []);

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
          categoryIds: product.categoryIds || [],
          hasVariants: product.hasVariants || false,
          leasingFactor: product.leasingFactor,
          hidePrice: product.hidePrice || false,
          hiddenPriceDescription: product.hiddenPriceDescription,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
        }
      : {
          status: 'draft',
          stockQuantity: 0,
          lowStockThreshold: 10,
          categoryIds: [],
          hasVariants: false,
          hidePrice: false,
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
      setHighlights(product.highlights || []);

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
        categoryIds: product.categoryIds || [],
        hasVariants: product.hasVariants || false,
        leasingFactor: product.leasingFactor,
        hidePrice: product.hidePrice || false,
        hiddenPriceDescription: product.hiddenPriceDescription,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
      });
    }
  }, [product, reset]);

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
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
      alert('Attribute with this name already exists');
      return;
    }

    // Local (ad-hoc) attribute, not linked to the store library
    setVariantOptions([...variantOptions, { name: newOptionName.trim(), alias: slugify(newOptionName), values: [] }]);
    setNewOptionName('');
  };

  /** Add a store-library (global) attribute with all its values pre-selected. */
  const handleAddGlobalAttribute = (attributeId: string) => {
    const attr = libraryAttributes.find((a: ProductAttribute) => a.id === attributeId);
    if (!attr) return;
    if (variantOptions.find((opt) => opt.attributeId === attr.id || opt.name === attr.name)) {
      alert('This attribute is already added');
      return;
    }
    setVariantOptions([
      ...variantOptions,
      {
        name: attr.name,
        alias: attr.alias,
        attributeId: attr.id,
        values: attr.values.map((v) => ({ ...v })),
      },
    ]);
  };

  /** Apply an attribute preset: add every attribute it bundles (skipping duplicates). */
  const handleApplyPreset = (presetId: string) => {
    const preset = attributePresets.find((p) => p.id === presetId);
    if (!preset) return;
    const toAdd: VariantOption[] = [];
    for (const attrId of preset.attributeIds) {
      const attr = libraryAttributes.find((a: ProductAttribute) => a.id === attrId);
      if (!attr) continue;
      if (
        variantOptions.find((opt) => opt.attributeId === attr.id || opt.name === attr.name) ||
        toAdd.find((opt) => opt.attributeId === attr.id)
      ) continue;
      toAdd.push({
        name: attr.name,
        alias: attr.alias,
        attributeId: attr.id,
        values: attr.values.map((v) => ({ ...v })),
      });
    }
    if (toAdd.length) setVariantOptions([...variantOptions, ...toAdd]);
  };

  const handleAddVariantValue = (optionName: string) => {
    const value = newOptionValues[optionName];
    if (!value || !value.trim()) return;

    setVariantOptions(
      variantOptions.map((opt) =>
        opt.name === optionName
          ? { ...opt, values: [...opt.values, { name: value.trim(), alias: slugify(value) }] }
          : opt
      )
    );
    setNewOptionValues({ ...newOptionValues, [optionName]: '' });
  };

  const handleRemoveVariantOption = (optionName: string) => {
    setVariantOptions(variantOptions.filter((opt) => opt.name !== optionName));
    // Remove variants that used this axis
    setVariants(variants.filter((v) => !v.options.some((o) => o.name === optionName)));
  };

  const handleRemoveVariantValue = (optionName: string, valueName: string) => {
    setVariantOptions(
      variantOptions.map((opt) =>
        opt.name === optionName
          ? { ...opt, values: opt.values.filter((v) => v.name !== valueName) }
          : opt
      )
    );
    // Remove variants that used this value
    setVariants(variants.filter((v) => !v.options.some((o) => o.name === optionName && o.valueName === valueName)));
  };

  const generateVariants = () => {
    if (variantOptions.length === 0) return;

    // Generate all combinations as selection lists (alias-keyed, rename-proof).
    const combinations: VariantOptionSelection[][] = [];
    const generate = (index: number, current: VariantOptionSelection[]) => {
      if (index === variantOptions.length) {
        combinations.push([...current]);
        return;
      }
      const option = variantOptions[index];
      for (const value of option.values) {
        generate(index + 1, [...current, {
          attributeId: option.attributeId,
          alias: option.alias || slugify(option.name),
          name: option.name,
          valueAlias: value.alias || slugify(value.name),
          valueName: value.name,
        }]);
      }
    };

    generate(0, []);

    // Create variants from combinations
    const newVariants: ProductVariant[] = combinations.map((options, idx) => {
      // Reuse an existing variant with the same alias-combo (order-independent)
      const existing = variants.find((v) => variantComboKey(v.options) === variantComboKey(options));
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

  // Merge product properties with market templates
  const mergedProperties = useMemo((): MergedCustomProperty[] => {
    // Create a set of market template names for quick lookup
    const marketTemplateNames = new Set(
      marketTemplates.map((t) => t.name.toLowerCase())
    );

    // Start with product properties (sorted by sortOrder)
    // Mark as market template if name matches a template
    const productProps = (customProperties || []).map((p, idx) => ({
      ...p,
      sortOrder: p.sortOrder ?? idx + 1,
      isMarketTemplate: marketTemplateNames.has(p.name.toLowerCase()),
      sourceIndex: idx,
    }));

    // Find market templates not yet in product properties
    const existingNames = new Set(productProps.map((p) => p.name.toLowerCase()));
    const unfilledTemplates = marketTemplates
      .filter((t) => !existingNames.has(t.name.toLowerCase()))
      .map((t) => ({
        name: t.name,
        value: t.defaultValue || '',
        sortOrder: t.sortOrder + 1000, // Append after product properties
        isMarketTemplate: true,
        sourceIndex: -1,
      }));

    // Combine and sort
    return [...productProps, ...unfilledTemplates].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
  }, [customProperties, marketTemplates]);

  // Map a property (by name) to its market template's bound attribute values, if any.
  // When present, the product value is chosen from these predefined values (a dropdown).
  const propertyOptionsByName = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const t of marketTemplates) {
      if (!t.attributeId) continue;
      const attr = libraryAttributes.find((a: ProductAttribute) => a.id === t.attributeId);
      if (attr) map.set(t.name.toLowerCase(), attr.values.map((v) => v.name));
    }
    return map;
  }, [marketTemplates, libraryAttributes]);

  // Custom properties handlers
  const handleAddCustomProperty = () => {
    const maxSortOrder = customProperties.reduce(
      (max, p) => Math.max(max, p.sortOrder ?? 0),
      0
    );
    setCustomProperties([
      ...customProperties,
      { name: '', value: '', sortOrder: maxSortOrder + 1 },
    ]);
  };

  const handleUpdateCustomProperty = (
    index: number,
    field: 'name' | 'value',
    value: string
  ) => {
    const mergedProp = mergedProperties[index];

    if (mergedProp.sourceIndex !== -1) {
      // Update existing product property
      const updated = [...customProperties];
      updated[mergedProp.sourceIndex] = { ...updated[mergedProp.sourceIndex], [field]: value };
      setCustomProperties(updated);
    } else {
      // Add new property (converting from unfilled market template)
      const maxSortOrder = customProperties.reduce(
        (max, p) => Math.max(max, p.sortOrder ?? 0),
        0
      );
      setCustomProperties([
        ...customProperties,
        {
          name: mergedProp.name,
          value: field === 'value' ? value : mergedProp.value,
          sortOrder: maxSortOrder + 1,
        },
      ]);
    }
  };

  const handleRemoveCustomProperty = (index: number) => {
    const mergedProp = mergedProperties[index];
    // Only allow removing non-market-template properties
    if (!mergedProp.isMarketTemplate) {
      setCustomProperties(
        customProperties.filter((_, i) => i !== mergedProp.sourceIndex)
      );
    }
  };

  const handleMovePropertyUp = (index: number) => {
    if (index === 0) return;
    const mergedProp = mergedProperties[index];
    const prevProp = mergedProperties[index - 1];

    // Swap sort orders in the original customProperties array
    const updated = customProperties.map((p, i) => {
      if (i === mergedProp.sourceIndex) return { ...p, sortOrder: prevProp.sortOrder };
      if (i === prevProp.sourceIndex) return { ...p, sortOrder: mergedProp.sortOrder };
      return p;
    });
    setCustomProperties(updated);
  };

  const handleMovePropertyDown = (index: number) => {
    if (index === mergedProperties.length - 1) return;
    const mergedProp = mergedProperties[index];
    const nextProp = mergedProperties[index + 1];

    // Swap sort orders in the original customProperties array
    const updated = customProperties.map((p, i) => {
      if (i === mergedProp.sourceIndex) return { ...p, sortOrder: nextProp.sortOrder };
      if (i === nextProp.sourceIndex) return { ...p, sortOrder: mergedProp.sortOrder };
      return p;
    });
    setCustomProperties(updated);
  };

  // Highlights handlers
  const handleAddHighlight = () => {
    setHighlights([...highlights, '']);
  };

  const handleUpdateHighlight = (index: number, value: string) => {
    const updated = [...highlights];
    updated[index] = value;
    setHighlights(updated);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (data: ProductFormData) => {
    // Variant SKUs must be present and unique (API enforces this too)
    if (hasVariants) {
      const skus = variants.map((v) => v.sku.trim());
      if (skus.some((s) => s === '')) {
        alert('Every variant must have a SKU.');
        return;
      }
      const dup = skus.find((s, i) => skus.findIndex((o) => o.toLowerCase() === s.toLowerCase()) !== i);
      if (dup) {
        alert(`Duplicate variant SKU '${dup}'. Each variant must have a unique SKU.`);
        return;
      }

      // Each variant must be a unique combination of attribute values (order-independent, by alias)
      const seen = new Map<string, string>();
      for (const v of variants) {
        const key = variantComboKey(v.options);
        if (seen.has(key)) {
          const label = v.options.map((o) => `${o.name}: ${o.valueName}`).join(', ') || '(no attributes)';
          alert(`Duplicate variant combination — ${label}. Each variant must have a unique set of attribute values.`);
          return;
        }
        seen.set(key, v.id);
      }
    }

    // Clean up empty string values for numeric fields
    const cleanData = {
      ...data,
      price: data.price || undefined,
      salePrice: data.salePrice || undefined,
      stockQuantity: data.stockQuantity ?? undefined,
      lowStockThreshold: data.lowStockThreshold ?? undefined,
    };

    // Prepare custom properties: filter out empty market template properties
    // and ensure all properties have sortOrder
    const preparedProperties = customProperties
      .filter((p) => p.name.trim() !== '' && p.value.trim() !== '')
      .map((p, idx) => ({
        ...p,
        sortOrder: p.sortOrder ?? idx + 1,
      }));

    const submitData: Partial<Product> = {
      ...cleanData,
      hasVariants,
      variantOptions: hasVariants ? variantOptions : undefined,
      variants: hasVariants ? variants : undefined,
      customProperties: preparedProperties.length > 0 ? preparedProperties : undefined,
      images: images.length > 0 ? images : [],
      highlights: highlights.filter((h) => h.trim()).length > 0 ? highlights.filter((h) => h.trim()) : undefined,
      leasingFactor: data.leasingFactor || undefined,
      hidePrice: data.hidePrice || false,
      hiddenPriceDescription: data.hiddenPriceDescription || undefined,
      seoTitle: data.seoTitle || undefined,
      seoDescription: data.seoDescription || undefined,
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

        {/* Product Specifications */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Product Specifications
            </label>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/admin/products/property-templates"
                  className="text-sm text-[#4a6ba8] hover:text-[#3d5789] flex items-center gap-1"
                  onClick={(e) => {
                    if (customProperties.some((p) => p.name || p.value)) {
                      if (!window.confirm('You have unsaved changes. Navigate to templates page?')) {
                        e.preventDefault();
                      }
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit Templates
                </Link>
              )}
              <Button
                type="button"
                onClick={handleAddCustomProperty}
                className="text-sm"
              >
                + Property
              </Button>
            </div>
          </div>
          {mergedProperties.length > 0 && (
            <div className="space-y-3">
              {mergedProperties.map((property, index) => (
                <div
                  key={property.sourceIndex === -1 ? `template-${property.name}` : `property-${property.sourceIndex}`}
                  className={`flex flex-col sm:flex-row gap-2 items-center sm:items-center p-3 rounded-md ${
                    property.isMarketTemplate
                      ? 'bg-[#4a6ba8]/5 border border-[#4a6ba8]/20'
                      : 'bg-gray-50 border border-transparent'
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex gap-1 sm:flex-col justify-center sm:justify-start self-center">
                    <button
                      type="button"
                      onClick={() => handleMovePropertyUp(index)}
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
                      onClick={() => handleMovePropertyDown(index)}
                      disabled={index === mergedProperties.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="Property name (e.g., Material)"
                      value={property.name}
                      onChange={(e) =>
                        handleUpdateCustomProperty(index, 'name', e.target.value)
                      }
                      disabled={property.isMarketTemplate}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8] text-sm ${
                        property.isMarketTemplate
                          ? 'bg-[#4a6ba8]/10 border-[#4a6ba8]/30 text-[#304477]'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    {(() => {
                      const options = propertyOptionsByName.get(property.name.toLowerCase());
                      if (options) {
                        return (
                          <select
                            value={property.value}
                            onChange={(e) => handleUpdateCustomProperty(index, 'value', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8] text-sm bg-white"
                          >
                            <option value="">Select a value…</option>
                            {/* keep a stale/custom value visible even if it's not in the attribute list */}
                            {property.value && !options.includes(property.value) && (
                              <option value={property.value}>{property.value}</option>
                            )}
                            {options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        );
                      }
                      return (
                        <input
                          type="text"
                          placeholder="Property value (e.g., Aluminum)"
                          value={property.value}
                          onChange={(e) => handleUpdateCustomProperty(index, 'value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8] text-sm"
                        />
                      );
                    })()}
                  </div>
                  {property.isMarketTemplate ? (
                    <div
                      className="px-3 py-2 text-[#4a6ba8] text-sm flex items-center justify-center gap-1 w-full sm:w-24"
                      title="This property is defined at the market level. Edit templates to remove."
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Market
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomProperty(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium w-full sm:w-24 text-center"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {marketTemplates.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              Properties marked with "Market" are defined at the market level and cannot be removed here.
              {isAdmin && ' '}
              {isAdmin && (
                <Link
                  to="/admin/products/property-templates"
                  className="text-[#4a6ba8] hover:text-[#3d5789]"
                >
                  Edit templates
                </Link>
              )}
            </p>
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

      {/* Highlights */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Highlights</h2>
          <Button type="button" onClick={handleAddHighlight} className="text-sm">
            + Highlight
          </Button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Short bullet points shown on the product page.</p>
        {highlights.length > 0 ? (
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-gray-400 text-sm">•</span>
                <input
                  type="text"
                  value={h}
                  onChange={(e) => handleUpdateHighlight(i, e.target.value)}
                  placeholder="e.g. Aluminium frame"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveHighlight(i)}
                  className="text-red-500 hover:text-red-700 text-sm px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No highlights yet.</p>
        )}
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
            </div>

            {/* Leasing & price visibility */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Leasing Factor"
                type="number"
                step="0.0001"
                min="0"
                {...register('leasingFactor', {
                  min: { value: 0, message: 'Must be positive' },
                })}
                error={errors.leasingFactor?.message}
              />
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer mt-6">
                  <input
                    type="checkbox"
                    {...register('hidePrice')}
                    className="h-4 w-4 text-[#4a6ba8] border-gray-300 rounded focus:ring-[#4a6ba8]"
                  />
                  <span className="text-sm font-medium text-gray-700">Hide price on storefront</span>
                </label>
              </div>
            </div>
            {watch('hidePrice') && (
              <div className="mt-3">
                <Input
                  label="Hidden Price Description"
                  placeholder="e.g. Contact us for pricing"
                  {...register('hiddenPriceDescription')}
                />
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Stock Quantity"
                type="number"
                min="0"
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
                min="0"
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
          {/* Attributes Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Attributes</h2>
              <Link to="/admin/products/attributes" className="text-sm text-[#4a6ba8] hover:text-[#3d5789]">
                Manage store attributes →
              </Link>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Add attributes (e.g. Size, Color) and their values to build variants. Pick global attributes
              from the store library, apply a preset, or add a local one just for this product.
            </p>

            {/* Add attributes: global library + preset + local */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Global attribute picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add store attribute</label>
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) handleAddGlobalAttribute(e.target.value); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8]"
                  >
                    <option value="">Select an attribute…</option>
                    {libraryAttributes
                      .filter((a: ProductAttribute) => !variantOptions.find((o) => o.attributeId === a.id || o.name === a.name))
                      .map((a: ProductAttribute) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.values.length} values)</option>
                      ))}
                  </select>
                </div>
                {/* Preset picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply preset</label>
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) handleApplyPreset(e.target.value); }}
                    disabled={attributePresets.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] disabled:bg-gray-100"
                  >
                    <option value="">{attributePresets.length ? 'Select a preset…' : 'No presets defined'}</option>
                    {attributePresets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.attributeIds.length} attributes)</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Local attribute */}
              <div className="flex gap-2 border-t pt-3">
                <Input
                  label="Or add a local attribute (e.g. Size, Color)"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Size"
                />
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddVariantOption}>
                    Add Local
                  </Button>
                </div>
              </div>
            </div>

            {/* Display Attributes */}
            {variantOptions.map((option) => (
              <div key={option.name} className="mb-4 p-4 border rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    {option.name}
                    {option.attributeId ? (
                      <span className="inline-flex items-center rounded-full bg-[#4a6ba8]/10 px-2 py-0.5 text-xs font-medium text-[#4a6ba8]">global</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">local</span>
                    )}
                  </h3>
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
                      key={value.name}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                      title={value.alias ? `alias: ${value.alias}` : undefined}
                    >
                      {value.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantValue(option.name, value.name)}
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
                {variants.map((variant, index) => (
                  <div key={variant.id} className="p-4 border rounded-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 flex-wrap">
                        {variant.options.map((o) => (
                          <span
                            key={o.attributeId || o.alias}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                          >
                            {o.name}: {o.valueName}
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

                    {/* Column headers - only show on first variant */}
                    {index === 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          SKU
                        </label>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Price
                        </label>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Sale Price
                        </label>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Stock
                        </label>
                        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </label>
                      </div>
                    )}

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
                        min="0"
                        placeholder="Stock"
                        value={variant.stockQuantity || ''}
                        onChange={(e) =>
                          handleUpdateVariant(
                            variant.id,
                            'stockQuantity',
                            Math.max(0, parseInt(e.target.value) || 0)
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
                  className="h-4 w-4 text-[#4a6ba8] focus:ring-[#4a6ba8] border-gray-300 rounded"
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

      {/* SEO */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">SEO</h2>
        <div className="space-y-4">
          <Input
            label="Page Title"
            placeholder="Overrides product name in browser tab and search results"
            {...register('seoTitle')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description
            </label>
            <textarea
              {...register('seoDescription')}
              rows={3}
              placeholder="Short description shown in search engine result pages (recommended: 150–160 characters)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4a6ba8] focus:border-[#4a6ba8]"
            />
          </div>
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
