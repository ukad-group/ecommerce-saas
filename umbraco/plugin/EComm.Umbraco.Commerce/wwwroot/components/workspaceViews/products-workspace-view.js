import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { UMB_MEDIA_PICKER_MODAL } from '@umbraco-cms/backoffice/media';
// The shared design kit — see umbraco/docs/DESIGN-SYSTEM.md before adding UI here.
import {
  commerceStyles, stateCenter, loadingState, emptyState, errorBanner,
  pill, modalShell, confirmDelete, toastError,
} from '../shared/commerce-ui.js';

class ECommProductsWorkspaceView extends UmbElementMixin(LitElement) {
  static properties = {
    categoryId: { type: String },
    storeId: { type: String },
    products: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
    defaultAliases: { type: Object },
    expandedProductId: { type: String },
    editedProduct: { type: Object },
    editedVariantId: { type: String },
    saving: { type: Boolean },
    saveSuccess: { type: String },
    validationErrors: { type: Object },
    currentUser: { type: Object },
    creatingVariants: { type: Boolean },
    newVariantOptions: { type: Array },
    newOptionName: { type: String },
    newOptionValues: { type: String },
    defaultVariantPrice: { type: String },
    defaultVariantStock: { type: String },
    newBaseSku: { type: String },
    newProductImageUrl: { type: String },
    newCreateImageUrl: { type: String },
    imageUploading: { type: Boolean },
    creatingProduct: { type: Boolean },
    newProduct: { type: Object },
    createProductErrors: { type: Object },
    createSaving: { type: Boolean },
    addingVariant: { type: Boolean },
    newVariant: { type: Object },
    addVariantErrors: { type: Object },
    newProductVariantOptionName: { type: String },
    newProductVariantOptionValues: { type: String },
    newProductOptionCardValues: { type: Object },
    newProductType: { type: String },
    editingOptions: { type: Boolean },
    editOptionsDraft: { type: Array },
    editOptionsNewName: { type: String },
    editOptionsDraftNewValues: { type: Object },
    highlightsText: { type: String },
    newProductHighlightsText: { type: String },
    selectedProductId: { type: String },
    productSearchQuery: { type: String },
    variantSearchQuery: { type: String },
    productId: { type: String },
    _mode: { type: String },
    // Market property templates (global custom fields shown on every product)
    propertyTemplates: { type: Array },
    // Market product-attributes library (predefined values for bound property templates)
    marketAttributes: { type: Array },
    // External photo provider
    _photoProviderConfigured: { type: Boolean, state: true },
    providerBrowserOpen: { type: Boolean },
    providerPhotos: { type: Array },
    providerContinuationToken: { type: String },
    providerLoading: { type: Boolean },
    uploadToProviderAlso: { type: Boolean },
    providerWarning: { type: String },
  };

  constructor() {
    super();
    this.categoryId = null;
    this.storeId = null;
    this.propertyTemplates = [];
    this.marketAttributes = [];
    this.products = [];
    this.loading = false;
    this.error = null;
    this.defaultAliases = null;
    this.expandedProductId = null;
    this.editedProduct = null;
    this.editedVariantId = null;
    this.saving = false;
    this.saveSuccess = null;
    this.validationErrors = {};
    this.currentUser = null;
    this.creatingVariants = false;
    this.newVariantOptions = [];
    this.newOptionName = '';
    this.newOptionValues = '';
    this.defaultVariantPrice = '';
    this.defaultVariantStock = '';
    this.newBaseSku = '';
    this.newProductImageUrl = '';
    this.newCreateImageUrl = '';
    this.imageUploading = false;
    this._imageMediaTypeId = null;
    this.creatingProduct = false;
    this.addingVariant = false;
    this.newVariant = null;
    this.addVariantErrors = {};
    this.newProduct = null;
    this.createProductErrors = {};
    this.createSaving = false;
    this.newProductVariantOptionName = '';
    this.newProductVariantOptionValues = '';
    this.newProductType = null;
    this.editingOptions = false;
    this.editOptionsDraft = [];
    this.editOptionsNewName = '';
    this.editOptionsDraftNewValues = {};
    this.highlightsText = '';
    this.newProductHighlightsText = '';
    this.selectedProductId = null;
    this.productSearchQuery = '';
    this.variantSearchQuery = '';
    this.productId = null;
    this._mode = 'category';
    this._storeResolveSeq = 0;
    // External photo provider
    this._photoProviderConfigured = false;
    this.providerBrowserOpen = false;
    this._providerBrowserContext = 'edit';
    this.providerPhotos = [];
    this.providerContinuationToken = null;
    this.providerLoading = false;
    this.uploadToProviderAlso = false; // must default OFF — uploads only copy to the provider on explicit opt-in
    this.providerWarning = null;

    // Consume auth context for API calls. loadDefaultAliases() is fired from here rather
    // than connectedCallback() - the auth context resolves asynchronously, so calling it
    // unconditionally in connectedCallback() could race ahead of _authContext being set,
    // sending an unauthenticated request that gets a 401.
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
      this.loadDefaultAliases();
      this.loadPhotoProviderState();
    });

    // Consume current user context
    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserContext) => {
      if (currentUserContext?.currentUser) {
        this.observe(currentUserContext.currentUser, (user) => {
          this.currentUser = user;
        });
      }
    });

    // Consume modal manager context for media picker
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (ctx) => {
      this._modalManager = ctx;
    });

    // Consume workspace context to get document data
    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (workspaceContext) => {
      if (!workspaceContext) return;

      this._workspaceContext = workspaceContext;

      // Observe workspace data for property changes
      if (workspaceContext.data) {
        this.observe(
          workspaceContext.data,
          (data) => {
            if (!data) return;

            let newCategoryId = null;
            let newProductId = null;
            let newStoreId = null;
            if (data.values && Array.isArray(data.values)) {
              const aliasToUse = this.defaultAliases?.categoryIdPropertyAlias || 'categoryId';
              const categoryIdProp = data.values.find(v => v?.alias === aliasToUse);
              if (categoryIdProp) newCategoryId = categoryIdProp.value;

              const productIdAlias = this.defaultAliases?.productIdPropertyAlias || 'productId';
              const productIdProp = data.values.find(v => v?.alias === productIdAlias);
              if (productIdProp) newProductId = productIdProp.value;

              // Sibling store/market picker - same alias category-picker.js watches, so
              // products load from whichever market the category itself belongs to.
              const storeIdAlias = this.defaultAliases?.storeIdPropertyAlias || 'storeId';
              const storeIdProp = data.values.find(v => v?.alias === storeIdAlias);
              if (storeIdProp) newStoreId = storeIdProp.value;
            }

            const categoryChanged = newCategoryId !== this.categoryId;
            const productChanged = newProductId !== this.productId;
            const storeChanged = newStoreId !== this._ownStoreId;

            this.categoryId = newCategoryId;
            this.productId = newProductId;
            this._ownStoreId = newStoreId;

            if (categoryChanged || productChanged || storeChanged) {
              this._resolveStoreIdAndRefresh();
            }
          }
        );
      }
    });
  }

  // Own node has no store set - walk up the ancestor chain (e.g. the shop root) so a
  // store set once higher in the tree still scopes this node's product list.
  //
  // The seq token guards against an in-flight ancestor lookup (started while the node had
  // no store of its own) clobbering a store the user explicitly picks before that lookup
  // resolves - without it the slower ancestor fetch wins the race and silently reverts the
  // just-selected store.
  async _resolveStoreIdAndRefresh() {
    const seq = ++this._storeResolveSeq;
    this.storeId = this._ownStoreId;

    if (!this.storeId) {
      const nodeKey = this._workspaceContext?.getUnique?.();
      if (nodeKey) {
        const inherited = await this._fetchEffectiveStoreId(nodeKey);
        if (seq !== this._storeResolveSeq) return; // superseded by a newer resolution
        this.storeId = inherited;
      }
    }

    this.loadPropertyTemplates();
    this.loadMarketAttributes();
    this._refreshView();
  }

  // Global custom fields defined for this market (shown as editable fields on every product).
  async loadPropertyTemplates() {
    try {
      const qs = this.storeId ? `?marketId=${encodeURIComponent(this.storeId)}` : '';
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/umbraco/management/api/ecomm-commerce/property-templates${qs}`, {
        headers, credentials: 'include',
      });
      this.propertyTemplates = res.ok ? (await res.json()) || [] : [];
    } catch { this.propertyTemplates = []; }
  }

  // The market's product-attributes library (supplies predefined values for bound property templates).
  async loadMarketAttributes() {
    try {
      const qs = this.storeId ? `?marketId=${encodeURIComponent(this.storeId)}` : '';
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/umbraco/management/api/ecomm-commerce/attributes${qs}`, {
        headers, credentials: 'include',
      });
      this.marketAttributes = res.ok ? (await res.json()) || [] : [];
    } catch { this.marketAttributes = []; }
  }

  // Predefined value names for a property (by its template's bound attribute), or null for free text.
  _propertyOptions(name) {
    const tmpl = (this.propertyTemplates || []).find(t => (t.name || '').toLowerCase() === (name || '').toLowerCase());
    if (!tmpl?.attributeId) return null;
    const attr = (this.marketAttributes || []).find(a => a.id === tmpl.attributeId);
    return attr ? attr.values.map(v => v.name) : null;
  }

  // ── Variant option value-shape helpers ──────────────────────────────────────
  // The API stores attribute values as { name, alias } objects, but this view's variant
  // editing works with plain value-name strings. Normalize on load, denormalize on save.
  _slug(s) { return (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  _normalizeVariantOptions(variantOptions) {
    return (variantOptions || []).map(o => ({
      ...o,
      values: (o.values || []).map(v => (v && typeof v === 'object') ? v.name : v),
    }));
  }

  _denormalizeVariantOptions(variantOptions) {
    return (variantOptions || []).map(o => ({
      name: o.name,
      alias: o.alias || this._slug(o.name),
      attributeId: o.attributeId || null,
      values: (o.values || []).map(v => (v && typeof v === 'object')
        ? { name: v.name, alias: v.alias || this._slug(v.name) }
        : { name: v, alias: this._slug(v) }),
    }));
  }

  // Value-name options for a variant axis. Global axes (attributeId set) resolve to the store
  // attribute's full unique value set (from the market library) so any value is reusable per
  // variant; local axes use their own inline values.
  _optionValueNames(opt) {
    if (opt?.attributeId) {
      const attr = (this.marketAttributes || []).find(a => a.id === opt.attributeId);
      if (attr) return (attr.values || []).map(v => (v && typeof v === 'object') ? v.name : v);
    }
    return (opt?.values || []).map(v => (v && typeof v === 'object') ? v.name : v);
  }

  // Store-library attributes not yet used by the given axis list (for the "add global" pickers).
  _availableGlobalAttributes(existing) {
    const used = new Set((existing || []).flatMap(o => [o.attributeId, (o.name || '').toLowerCase()]));
    return (this.marketAttributes || []).filter(a => !used.has(a.id) && !used.has((a.name || '').toLowerCase()));
  }

  // ── Variant selection shape helpers ─────────────────────────────────────────
  // Persisted variant.options is a list of { attributeId?, alias, name, valueAlias, valueName }.
  // This view edits variants as a plain { axisName: valueName } dict, so we convert on load/save.
  // On load we resolve the CURRENT display name/value from the market library (global axes), so a
  // renamed attribute/value shows fresh — the original bug was frozen name→value pairs going stale.

  // Chosen value's alias for an axis + value name (from the library when global, else a slug).
  _valueAlias(ax, valueName) {
    if (ax?.attributeId) {
      const attr = (this.marketAttributes || []).find(a => a.id === ax.attributeId);
      const v = (attr?.values || []).find(x => ((x && typeof x === 'object') ? x.name : x) === valueName);
      if (v && typeof v === 'object' && v.alias) return v.alias;
    }
    return this._slug(valueName);
  }

  // One persisted selection → [freshName, freshValueName] for the editing dict.
  _resolveSelection(o) {
    let name = o.name, value = o.valueName;
    if (o.attributeId) {
      const attr = (this.marketAttributes || []).find(a => a.id === o.attributeId);
      if (attr) {
        name = attr.name || name;
        const v = (attr.values || []).find(x => (x && typeof x === 'object') && x.alias === o.valueAlias);
        if (v) value = v.name;
      }
    }
    return [name, value];
  }

  _variantsFromApi(variants) {
    return (variants || []).map(v => ({
      ...v,
      options: Array.isArray(v.options)
        ? Object.fromEntries(v.options.map(o => this._resolveSelection(o)))
        : (v.options || {}),   // tolerate legacy dict rows until migration runs
    }));
  }

  _variantsToApi(variants, axes) {
    const axByName = new Map((axes || []).map(a => [a.name, a]));
    return (variants || []).map(v => ({
      ...v,
      options: Object.entries(v.options || {}).map(([name, valueName]) => {
        const ax = axByName.get(name);
        return {
          attributeId: ax?.attributeId || null,
          alias: ax?.alias || this._slug(name),
          name,
          valueAlias: this._valueAlias(ax, valueName),
          valueName,
        };
      }),
    }));
  }

  // Returns a product copy with variant-option values normalized to strings for editing.
  // Global axis names are refreshed from the market library so a renamed attribute shows fresh
  // (and stays consistent with the value names resolved in _variantsFromApi, which key the dict).
  _productFromApi(product) {
    if (!product) return product;
    const axes = this._normalizeVariantOptions(product.variantOptions).map(o => {
      if (o.attributeId) {
        const attr = (this.marketAttributes || []).find(a => a.id === o.attributeId);
        if (attr?.name) return { ...o, name: attr.name, alias: attr.alias || o.alias };
      }
      return o;
    });
    return {
      ...product,
      variantOptions: axes,
      variants: this._variantsFromApi(product.variants),
    };
  }

  // Merge the product's own custom properties with the market templates (unfilled templates
  // seeded from their default value), mirroring the React admin's ProductForm. Template-backed
  // rows are flagged so they can't be removed. Sorted by sortOrder.
  _mergedCustomProperties() {
    const templates = this.propertyTemplates || [];
    const props = Array.isArray(this.editedProduct?.customProperties) ? this.editedProduct.customProperties : [];
    const templateNames = new Set(templates.map(t => (t.name || '').toLowerCase()));
    const productProps = props.map((p, i) => ({
      name: p.name, value: p.value ?? '',
      sortOrder: p.sortOrder ?? i + 1,
      isMarketTemplate: templateNames.has((p.name || '').toLowerCase()),
    }));
    const existing = new Set(productProps.map(p => (p.name || '').toLowerCase()));
    const unfilled = templates
      .filter(t => !existing.has((t.name || '').toLowerCase()))
      .map(t => ({ name: t.name, value: t.defaultValue || '', sortOrder: (t.sortOrder ?? 0) + 1000, isMarketTemplate: true }));
    return [...productProps, ...unfilled].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Write an edited value/name back into editedProduct.customProperties, materializing an
  // unfilled template row on first edit.
  _setCustomProperty(mergedProp, field, value) {
    const props = Array.isArray(this.editedProduct?.customProperties) ? [...this.editedProduct.customProperties] : [];
    const idx = props.findIndex(p => (p.name || '').toLowerCase() === (mergedProp.name || '').toLowerCase());
    if (idx !== -1) {
      props[idx] = { ...props[idx], [field]: value };
    } else {
      const maxSort = props.reduce((m, p) => Math.max(m, p.sortOrder ?? 0), 0);
      props.push({
        name: field === 'name' ? value : mergedProp.name,
        value: field === 'value' ? value : (mergedProp.value || ''),
        sortOrder: maxSort + 1,
      });
    }
    this.editedProduct = { ...this.editedProduct, customProperties: props };
  }

  _addCustomProperty() {
    const props = Array.isArray(this.editedProduct?.customProperties) ? [...this.editedProduct.customProperties] : [];
    const maxSort = props.reduce((m, p) => Math.max(m, p.sortOrder ?? 0), 0);
    props.push({ name: '', value: '', sortOrder: maxSort + 1 });
    this.editedProduct = { ...this.editedProduct, customProperties: props };
  }

  _removeCustomProperty(mergedProp) {
    if (mergedProp.isMarketTemplate) return; // template-backed rows aren't removable
    const props = (this.editedProduct?.customProperties || [])
      .filter(p => (p.name || '').toLowerCase() !== (mergedProp.name || '').toLowerCase());
    this.editedProduct = { ...this.editedProduct, customProperties: props };
  }

  // Editable "Attributes" block: global custom fields (from market templates) + ad-hoc ones.
  renderCustomPropertiesEditor() {
    const merged = this._mergedCustomProperties();
    return html`
      <div class="attributes-section">
        <h4 class="section-heading">Product specifications</h4>
        <div class="custom-props-list">
          ${merged.map(prop => html`
            <div class="custom-prop-row" @click=${(e) => e.stopPropagation()}>
              ${prop.isMarketTemplate
                ? html`<span class="attribute-label" title="Global field for this market">${prop.name}</span>`
                : html`<uui-input class="cp-name" placeholder="Name" .value=${prop.name || ''}
                    ?disabled=${this.saving}
                    @input=${(e) => this._setCustomProperty(prop, 'name', e.target.value)}></uui-input>`}
              ${(() => {
                const opts = this._propertyOptions(prop.name);
                if (opts) {
                  return html`<select class="cp-value variant-status-select" ?disabled=${this.saving}
                    @change=${(e) => this._setCustomProperty(prop, 'value', e.target.value)}>
                    <option value="" ?selected=${!prop.value}>Select a value…</option>
                    ${prop.value && !opts.includes(prop.value)
                      ? html`<option value=${prop.value} selected>${prop.value}</option>` : ''}
                    ${opts.map(o => html`<option value=${o} ?selected=${o === prop.value}>${o}</option>`)}
                  </select>`;
                }
                return html`<uui-input class="cp-value" placeholder="Value" .value=${prop.value || ''}
                  ?disabled=${this.saving}
                  @input=${(e) => this._setCustomProperty(prop, 'value', e.target.value)}></uui-input>`;
              })()}
              ${prop.isMarketTemplate
                ? html`<span class="pill pill--info" title="Applied to all products">global</span>`
                : html`<uui-button compact look="secondary" color="danger" label="Remove"
                    ?disabled=${this.saving}
                    @click=${() => this._removeCustomProperty(prop)}>✕</uui-button>`}
            </div>
          `)}
        </div>
        <uui-button look="secondary" compact ?disabled=${this.saving}
          @click=${() => this._addCustomProperty()}>+ Add field</uui-button>
      </div>
    `;
  }

  async _fetchEffectiveStoreId(nodeKey) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/nodes/${nodeKey}/effective-store`,
        { headers, credentials: 'include' }
      );
      if (response.ok) {
        const result = await response.json();
        return result.storeId || null;
      }
    } catch (err) {
      console.error('Failed to resolve inherited store:', err);
    }
    return null;
  }

  async loadDefaultAliases() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        '/umbraco/management/api/ecomm-commerce/settings/defaults',
        {
          headers: headers,
          credentials: 'include'
        }
      );

      if (response.ok) {
        this.defaultAliases = await response.json();
      }
    } catch (err) {
      console.error('Failed to load default aliases:', err);
      // Use hardcoded fallbacks if fetch fails
      this.defaultAliases = {
        categoryPageAlias: 'categoryPage',
        categoryIdPropertyAlias: 'categoryId',
        storeIdPropertyAlias: 'storeId',
        productIdPropertyAlias: 'productId'
      };
    }
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async loadProducts() {
    if (!this.categoryId) {
      this.error = 'No category selected';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const qs = this.storeId ? `?marketId=${encodeURIComponent(this.storeId)}` : '';
      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/products/${this.categoryId}${qs}`,
        {
          headers: headers,
          credentials: 'include'
        }
      );

      if (response.ok) {
        const result = await response.json();
        this.products = result.products || [];
      } else if (response.status === 404) {
        this.error = 'API not configured. Please go to Settings > Commerce Settings to configure the eCommerce API connection.';
      } else {
        const errorText = await response.text();
        this.error = `Failed to load products: ${errorText || response.statusText}`;
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      this.error = 'Failed to connect to eCommerce API: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  _refreshView() {
    if (this.productId) {
      this._mode = 'single-product';
      this._loadSingleProduct(this.productId);
    } else if (this.categoryId) {
      this._mode = 'category';
      this.loadProducts();
    } else {
      this._mode = 'category';
      this.products = [];
      this.error = null;
    }
  }

  async _loadSingleProduct(productId) {
    this.loading = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/product/${productId}`,
        { headers, credentials: 'include' }
      );

      if (response.ok) {
        const product = await response.json();
        this.products = [product];
        this.selectProduct(product);
      } else {
        const errorText = await response.text();
        this.error = `Failed to load product: ${errorText || response.statusText}`;
      }
    } catch (err) {
      console.error('Failed to load single product:', err);
      this.error = 'Failed to connect to eCommerce API: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  async toggleProductEdit(product) {
    if (this.expandedProductId === product.id) {
      // Collapse if already editing
      this.expandedProductId = null;
      this.editedProduct = null;
      this.editedVariantId = null;
      this.validationErrors = {};
      this.saveSuccess = null;
      this.creatingVariants = false;
      this.newVariantOptions = [];
      this.newOptionName = '';
      this.newOptionValues = '';
      this.newBaseSku = '';
    } else {
      // Expand and create editable copy. Refresh the attribute library first so global axis /
      // value names resolve to their CURRENT names (they may have been renamed in Commerce →
      // Attributes; the stored variant snapshots hold the old names).
      await this.loadMarketAttributes();
      this.expandedProductId = product.id;
      this.editedProduct = this._productFromApi(product);
      this.highlightsText = (product.highlights || []).join('\n');
      this.editedVariantId = null;
      this.validationErrors = {};
      this.saveSuccess = null;
      this.error = null;
      this.creatingVariants = false;
      this.newVariantOptions = [];
      this.newOptionName = '';
      this.newOptionValues = '';
      this.newBaseSku = '';
    }
  }

  async selectProduct(product) {
    this.selectedProductId = product.id;
    await this.loadMarketAttributes();   // fresh attribute names before resolving stale snapshots
    this.editedProduct = this._productFromApi(product);
    this.highlightsText = (product.highlights || []).join('\n');
    this.editedVariantId = null;
    this.validationErrors = {};
    this.saveSuccess = null;
    this.error = null;
    this.creatingVariants = false;
    this.editingOptions = false;
    this.addingVariant = false;
    this.creatingProduct = false;
    this.variantSearchQuery = '';
  }

  toggleVariantEdit(variant) {
    if (this.editedVariantId === variant.id) {
      this.editedVariantId = null;
      this.validationErrors = {};
      this.saveSuccess = null;
      this.variantActiveTab = 'content';
    } else {
      this.editedVariantId = variant.id;
      this.validationErrors = {};
      this.saveSuccess = null;
      this.error = null;
      this.variantActiveTab = 'content';
    }
  }

  // Repeatable string-list editors (Highlights, Free options content). `which` is the tracked
  // product property to mutate ('editedProduct' | 'newProduct'); reassigned so Lit re-renders.
  addListItem(which, field) {
    const obj = this[which] || {};
    this[which] = { ...obj, [field]: [...(obj[field] || []), ''] };
  }

  updateListItem(which, field, index, value) {
    const obj = this[which] || {};
    const arr = [...(obj[field] || [])];
    arr[index] = value;
    this[which] = { ...obj, [field]: arr };
  }

  removeListItem(which, field, index) {
    const obj = this[which] || {};
    this[which] = { ...obj, [field]: (obj[field] || []).filter((_, i) => i !== index) };
  }

  renderStringListEditor(which, field, title, hint, addLabel, emptyText, disabled) {
    const items = (this[which] && this[which][field]) || [];
    return html`
      <div class="string-list-editor">
        <div class="sle-header">
          <strong>${title}</strong>
          <uui-button
            look="primary"
            label=${addLabel}
            ?disabled=${disabled}
            @click=${() => this.addListItem(which, field)}></uui-button>
        </div>
        <small class="field-hint">${hint}</small>
        ${items.length > 0
          ? html`<div class="sle-rows">
              ${items.map((val, i) => html`
                <div class="sle-row">
                  <span class="sle-bullet">•</span>
                  <uui-input
                    class="sle-input"
                    .value=${val}
                    ?disabled=${disabled}
                    @input=${(e) => this.updateListItem(which, field, i, e.target.value)}></uui-input>
                  <button
                    type="button"
                    class="sle-remove"
                    ?disabled=${disabled}
                    @click=${() => this.removeListItem(which, field, i)}
                    title="Remove">✕</button>
                </div>`)}
            </div>`
          : html`<p class="sle-empty">${emptyText}</p>`}
      </div>`;
  }

  handleProductInput(field, value) {
    this.editedProduct = {
      ...this.editedProduct,
      [field]: value
    };

    // Clear validation error for this field
    if (this.validationErrors[field]) {
      this.validationErrors = {
        ...this.validationErrors,
        [field]: null
      };
    }
  }

  validateProduct() {
    const errors = {};

    if (!this.editedProduct.name || this.editedProduct.name.trim() === '') {
      errors.name = 'Name is required';
    }

    // For products with variants, skip master product price/stock validation
    if (!this.editedProduct.hasVariants) {
      if (!Number.isFinite(this.editedProduct.price) || this.editedProduct.price < 0) {
        errors.price = 'Valid price is required';
      }

      if (!Number.isFinite(this.editedProduct.stockQuantity) || this.editedProduct.stockQuantity < 0) {
        errors.stockQuantity = 'Stock quantity must be 0 or greater';
      }
    } else {
      // Validate all variants if product has variants
      if (this.editedProduct.variants && this.editedProduct.variants.length > 0) {
        this.editedProduct.variants.forEach(variant => {
          const variantErrors = this.validateVariant(variant);
          Object.assign(errors, variantErrors);
        });

        // Each variant must be a unique combination of attribute values (all values identical => duplicate)
        const comboKey = (opts) => Object.keys(opts || {}).sort()
          .map(k => `${k}=${opts[k]}`).join('|');
        const seen = new Set();
        for (const v of this.editedProduct.variants) {
          const key = comboKey(v.options);
          if (seen.has(key)) {
            const label = Object.entries(v.options || {}).map(([k, val]) => `${k}: ${val}`).join(', ') || '(no attributes)';
            errors.variants = `Duplicate variant combination — ${label}. Each variant must have a unique set of attribute values.`;
            break;
          }
          seen.add(key);
        }
      }
    }

    this.validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async saveProduct() {
    if (!this.validateProduct()) {
      this.error = 'Please fix validation errors';
      return;
    }

    this.saving = true;
    this.error = null;
    this.saveSuccess = null;

    try {
      const headers = await this.getAuthHeaders();

      // Get current user from current user context
      let userName = 'system';

      if (this.currentUser) {
        // Use email as primary identifier
        userName = this.currentUser.email || this.currentUser.name || this.currentUser.userName || 'system';
      }

      // Set version creator on the product; drop blank string-list rows.
      const productToSave = {
        ...this.editedProduct,
        highlights: (this.editedProduct.highlights || []).map(s => (s || '').trim()).filter(s => s.length > 0),
        variantOptions: this._denormalizeVariantOptions(this.editedProduct.variantOptions),
        variants: this._variantsToApi(this.editedProduct.variants, this.editedProduct.variantOptions),
        versionCreatedBy: userName
      };

      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/products/${this.editedProduct.id}`,
        {
          method: 'PUT',
          headers: headers,
          credentials: 'include',
          body: JSON.stringify({
            product: productToSave,
            changeNotes: `Updated via Umbraco at ${new Date().toISOString()}`
          })
        }
      );

      if (response.ok) {
        const updated = await response.json();

        // Update product in local list
        this.products = this.products.map(p =>
          p.id === updated.id ? updated : p
        );

        this.editedProduct = this._productFromApi(updated);
        this.highlightsText = (updated.highlights || []).join('\n');
        this.saveSuccess = `Product updated successfully (v${updated.version})`;

        setTimeout(() => { this.saveSuccess = null; }, 2000);

      } else {
        const errorText = await response.text();
        console.error('Failed to save product:', errorText);
        toastError(this, 'Product not saved', errorText || response.statusText);
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      toastError(this, 'Product not saved', err);
    } finally {
      this.saving = false;
    }
  }

  cancelEdit() {
    this.expandedProductId = null;
    this.selectedProductId = null;
    this.editedProduct = null;
    this.editedVariantId = null;
    this.validationErrors = {};
    this.saveSuccess = null;
    this.error = null;
    this.creatingVariants = false;
    this.newVariantOptions = [];
    this.newOptionName = '';
    this.newOptionValues = '';
    this.addingVariant = false;
    this.newVariant = null;
    this.addVariantErrors = {};
    this.editingOptions = false;
    this.editOptionsDraft = [];
    this.editOptionsNewName = '';
    this.editOptionsDraftNewValues = {};
  }

  startEditOptions() {
    this.editOptionsDraft = (this.editedProduct?.variantOptions || []).map(opt => ({
      originalName: opt.name,
      name: opt.name,
      alias: opt.alias,
      attributeId: opt.attributeId || null,
      values: [...(opt.values || [])],
    }));
    this.editOptionsNewName = '';
    this.editOptionsDraftNewValues = {};
    this.editingOptions = true;
    this.error = null;
  }

  cancelEditOptions() {
    this.editingOptions = false;
    this.editOptionsDraft = [];
    this.editOptionsNewName = '';
    this.editOptionsDraftNewValues = {};
    this.error = null;
  }

  handleOptionDraftName(index, value) {
    this.editOptionsDraft = this.editOptionsDraft.map((opt, i) =>
      i === index ? { ...opt, name: value } : opt
    );
  }

  removeOptionDraft(index) {
    this.editOptionsDraft = this.editOptionsDraft.filter((_, i) => i !== index);
  }

  addOptionDraft() {
    const name = (this.editOptionsNewName || '').trim();
    if (!name) return;
    if (this.editOptionsDraft.some(o => o.name.toLowerCase() === name.toLowerCase())) {
      this.error = `Option "${name}" already exists`;
      return;
    }
    this.editOptionsDraft = [...this.editOptionsDraft,
      { originalName: null, name, alias: this._slug(name), attributeId: null, values: [] }];
    this.editOptionsNewName = '';
    this.error = null;
  }

  /** Add a store-library (global) attribute to the edit-options draft. */
  addGlobalOptionDraft(attrId) {
    const attr = (this.marketAttributes || []).find(a => a.id === attrId);
    if (!attr) return;
    if (this.editOptionsDraft.some(o => o.attributeId === attr.id
        || (o.name || '').toLowerCase() === (attr.name || '').toLowerCase())) {
      this.error = `"${attr.name}" is already added`;
      return;
    }
    this.editOptionsDraft = [...this.editOptionsDraft, {
      originalName: null, name: attr.name, alias: attr.alias, attributeId: attr.id,
      values: (attr.values || []).map(v => (v && typeof v === 'object') ? v.name : v),
    }];
    this.error = null;
  }

  handleOptionDraftNewValue(index, value) {
    this.editOptionsDraftNewValues = { ...this.editOptionsDraftNewValues, [index]: value };
  }

  addValueToOptionDraft(index) {
    const value = (this.editOptionsDraftNewValues[index] || '').trim();
    if (!value) return;
    const opt = this.editOptionsDraft[index];
    if (opt.values.some(v => v.toLowerCase() === value.toLowerCase())) {
      this.error = `Value "${value}" already exists for "${opt.name}"`;
      return;
    }
    this.editOptionsDraft = this.editOptionsDraft.map((o, i) =>
      i === index ? { ...o, values: [...o.values, value] } : o
    );
    this.editOptionsDraftNewValues = { ...this.editOptionsDraftNewValues, [index]: '' };
    this.error = null;
  }

  removeValueFromOptionDraft(optionIndex, valueIndex) {
    this.editOptionsDraft = this.editOptionsDraft.map((o, i) =>
      i === optionIndex ? { ...o, values: o.values.filter((_, vi) => vi !== valueIndex) } : o
    );
  }

  async saveOptionsUpdate() {
    // Validate: no duplicate or empty names
    const names = this.editOptionsDraft.map(o => o.name.trim()).filter(Boolean);
    if (names.length !== new Set(names.map(n => n.toLowerCase())).size) {
      this.error = 'Attribute names must be unique';
      return;
    }

    // Build rename map: originalName → new name (only for renames)
    const renameMap = {};
    for (const opt of this.editOptionsDraft) {
      if (opt.originalName && opt.originalName !== opt.name) {
        renameMap[opt.originalName] = opt.name;
      }
    }

    // Names that were removed entirely
    const remainingOriginals = new Set(
      this.editOptionsDraft.map(o => o.originalName).filter(Boolean)
    );
    const removedNames = (this.editedProduct?.variantOptions || [])
      .map(o => o.name)
      .filter(name => !remainingOriginals.has(name));

    // Apply renames and removals to existing variants
    const updatedVariants = (this.editedProduct?.variants || []).map(variant => {
      const newOptions = { ...variant.options };
      for (const [oldName, newName] of Object.entries(renameMap)) {
        if (oldName in newOptions) {
          newOptions[newName] = newOptions[oldName];
          delete newOptions[oldName];
        }
      }
      for (const removed of removedNames) {
        delete newOptions[removed];
      }
      return { ...variant, options: newOptions };
    });

    this.editedProduct = {
      ...this.editedProduct,
      variantOptions: this.editOptionsDraft.map(d => ({
        name: d.name.trim(), alias: d.alias || this._slug(d.name), attributeId: d.attributeId || null, values: d.values
      })),
      variants: updatedVariants,
    };

    await this.saveProduct();
    this.editingOptions = false;
    this.editOptionsDraft = [];
    this.editOptionsNewName = '';
    this.editOptionsDraftNewValues = {};
  }

  /** Umbraco's confirm dialog, so a product is never one click from gone. */
  async _confirmDeleteProduct(product) {
    if (!await confirmDelete(this, product?.name)) return;
    await this.deleteProduct(product.id);
  }

  async _confirmDeleteVariant(variant) {
    const label = variant?.sku || Object.values(variant?.options || {}).join(' / ') || 'this variant';
    if (!await confirmDelete(this, label)) return;
    this.deleteVariant(variant.id);
  }

  async deleteProduct(productId) {
    this.saving = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/products/${productId}/delete`,
        { method: 'POST', headers, credentials: 'include' }
      );

      if (response.ok) {
        this.products = this.products.filter(p => p.id !== productId);
        this.expandedProductId = null;
        this.selectedProductId = null;
        this.editedProduct = null;
      } else {
        const text = await response.text();
        console.error('Failed to delete product:', text);
        toastError(this, 'Product not deleted', text || response.statusText);
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      toastError(this, 'Product not deleted', err);
    } finally {
      this.saving = false;
    }
  }

  deleteVariant(variantId) {
    if (!this.editedProduct?.variants) return;
    this.editedProduct = {
      ...this.editedProduct,
      variants: this.editedProduct.variants.filter(v => v.id !== variantId)
    };
    this.editedVariantId = null;
    this.saveProduct();
  }

  startCreateVariants() {
    this.creatingVariants = true;
    this.newVariantOptions = [];
    this.newOptionName = '';
    this.newOptionValues = '';
    this.defaultVariantPrice = String(this.editedProduct?.price || '');
    this.defaultVariantStock = '';
    this.newBaseSku = this.editedProduct?.sku
      || (this.editedProduct?.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      || '';
    this.error = null;
    this.validationErrors = {};
  }

  cancelCreateVariants() {
    this.creatingVariants = false;
    this.newVariantOptions = [];
    this.newOptionName = '';
    this.newOptionValues = '';
    this.newBaseSku = '';
    this.error = null;
  }

  startAddVariant() {
    // Pre-fill options with first available value for each existing option type
    const options = {};
    for (const opt of (this.editedProduct?.variantOptions || [])) {
      options[opt.name] = this._optionValueNames(opt)[0] || '';
    }
    this.addingVariant = true;
    this.newVariant = {
      sku: '',
      price: this.editedProduct?.variants?.[0]?.price ?? this.editedProduct?.price ?? 0,
      stockQuantity: 0,
      status: 'active',
      isDefault: false,
      options,
    };
    this.addVariantErrors = {};
    this.error = null;
  }

  cancelAddVariant() {
    this.addingVariant = false;
    this.newVariant = null;
    this.addVariantErrors = {};
  }

  handleNewVariantInput(field, value) {
    this.newVariant = { ...this.newVariant, [field]: value };
    if (this.addVariantErrors[field]) {
      this.addVariantErrors = { ...this.addVariantErrors, [field]: null };
    }
  }

  handleNewVariantOption(optionName, value) {
    this.newVariant = {
      ...this.newVariant,
      options: { ...this.newVariant.options, [optionName]: value },
    };
  }

  validateNewVariant() {
    const errors = {};
    if (!this.newVariant.sku || this.newVariant.sku.trim() === '') {
      errors.sku = 'SKU is required';
    }
    const price = parseFloat(this.newVariant.price);
    if (isNaN(price) || price < 0) {
      errors.price = 'Valid price is required';
    }
    this.addVariantErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async submitAddVariant() {
    if (!this.validateNewVariant()) return;

    const newVariant = {
      id: `new-${Date.now()}`,
      sku: (this.newVariant.sku || '').trim(),
      price: parseFloat(this.newVariant.price) || 0,
      salePrice: null,
      stockQuantity: parseInt(this.newVariant.stockQuantity) || 0,
      lowStockThreshold: 5,
      images: [],
      options: this.newVariant.options || {},
      status: this.newVariant.status || 'active',
      isDefault: false,
    };

    this.editedProduct = {
      ...this.editedProduct,
      hasVariants: true,
      variants: [...(this.editedProduct.variants || []), newVariant],
    };

    this.addingVariant = false;
    this.newVariant = null;
    this.addVariantErrors = {};

    await this.saveProduct();
  }

  addVariantOption() {
    const name = (this.newOptionName || '').trim();
    const valuesRaw = (this.newOptionValues || '').trim();

    if (!name) {
      this.error = 'Attribute name is required';
      return;
    }
    if (!valuesRaw) {
      this.error = 'At least one value is required';
      return;
    }
    if (this.newVariantOptions.some(o => o.name.toLowerCase() === name.toLowerCase())) {
      this.error = `Option "${name}" already exists`;
      return;
    }

    const values = valuesRaw.split(',').map(v => v.trim()).filter(v => v.length > 0);
    if (values.length === 0) {
      this.error = 'At least one non-empty value is required';
      return;
    }

    this.newVariantOptions = [...this.newVariantOptions, { name, alias: this._slug(name), attributeId: null, values }];
    this.newOptionName = '';
    this.newOptionValues = '';
    this.error = null;
  }

  /** Add a store-library (global) attribute to the create-variants draft. */
  addGlobalVariantOption(attrId) {
    const attr = (this.marketAttributes || []).find(a => a.id === attrId);
    if (!attr) return;
    if (this.newVariantOptions.some(o => o.attributeId === attr.id
        || (o.name || '').toLowerCase() === (attr.name || '').toLowerCase())) {
      this.error = `"${attr.name}" is already added`;
      return;
    }
    this.newVariantOptions = [...this.newVariantOptions, {
      name: attr.name, alias: attr.alias, attributeId: attr.id,
      values: (attr.values || []).map(v => (v && typeof v === 'object') ? v.name : v),
    }];
    this.error = null;
  }

  removeVariantOption(index) {
    this.newVariantOptions = this.newVariantOptions.filter((_, i) => i !== index);
  }

  // Cross-product of all axis values → variant combos. Returns null when the product would
  // exceed MAX_VARIANT_COMBINATIONS (e.g. a global axis with a large value library) — callers
  // warn instead of freezing the browser building millions of rows. Add variants manually then.
  generateVariantCombinations() {
    const total = this.newVariantOptions.reduce(
      (n, opt) => n * Math.max(1, (opt.values || []).length), 1);
    if (total > 500) return null;
    let combinations = [{}];
    for (const opt of this.newVariantOptions) {
      const next = [];
      for (const combo of combinations) {
        for (const val of opt.values) {
          next.push({ ...combo, [opt.name]: val });
        }
      }
      combinations = next;
    }
    return combinations;
  }

  async saveProductWithVariants() {
    const combinations = this.generateVariantCombinations();
    if (!combinations) {
      this.error = 'Too many combinations (over 500). Use fewer values, or save and add variants manually.';
      return;
    }
    const basePrice = parseFloat(this.defaultVariantPrice) || 0;
    const baseStock = parseInt(this.defaultVariantStock) || 0;
    const baseSku = (this.newBaseSku || '').trim() || this.editedProduct?.id || 'variant';

    const variants = combinations.map((combo, i) => ({
      id: `new-${i}`,
      sku: Object.keys(combo).length > 0
        ? `${baseSku}-${Object.values(combo).join('-').toLowerCase().replace(/\s+/g, '-')}`
        : baseSku,
      price: basePrice,
      salePrice: null,
      stockQuantity: baseStock,
      lowStockThreshold: 5,
      images: [],
      options: combo,
      status: 'active',
      isDefault: i === 0,
    }));

    this.editedProduct = {
      ...this.editedProduct,
      hasVariants: true,
      variantOptions: this.newVariantOptions.map(o => ({
        name: o.name, alias: o.alias || this._slug(o.name), attributeId: o.attributeId || null, values: o.values
      })),
      variants,
    };

    await this.saveProduct();
    this.creatingVariants = false;
    this.newVariantOptions = [];
    this.defaultVariantPrice = '';
    this.defaultVariantStock = '';
  }

  handleVariantInput(variantId, field, value) {
    if (!this.editedProduct || !this.editedProduct.variants) return;

    const variantIndex = this.editedProduct.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) return;

    const updatedVariants = [...this.editedProduct.variants];
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      [field]: value
    };

    this.editedProduct = {
      ...this.editedProduct,
      variants: updatedVariants
    };

    // Clear validation error for this field
    const errorKey = `variant_${variantId}_${field}`;
    if (this.validationErrors[errorKey]) {
      this.validationErrors = {
        ...this.validationErrors,
        [errorKey]: null
      };
    }
  }

  handleVariantOptionInput(variantId, optionName, value) {
    if (!this.editedProduct?.variants) return;
    const idx = this.editedProduct.variants.findIndex(v => v.id === variantId);
    if (idx === -1) return;
    const updated = [...this.editedProduct.variants];
    const options = { ...updated[idx].options };
    // Blank = axis not set for this variant; drop the key rather than persist an empty valueName.
    if (value) options[optionName] = value; else delete options[optionName];
    updated[idx] = { ...updated[idx], options };
    this.editedProduct = { ...this.editedProduct, variants: updated };
  }

  validateVariant(variant) {
    const errors = {};

    if (!variant.sku || variant.sku.trim() === '') {
      errors[`variant_${variant.id}_sku`] = 'SKU is required';
    }

    // Number.isFinite, not `== null || < 0`: an emptied number field parses to NaN, which fails
    // both of those and would then serialize to JSON null — the server answers 400 "could not be
    // converted to System.Int32" instead of the field telling the editor what's wrong.
    if (!Number.isFinite(variant.price) || variant.price < 0) {
      errors[`variant_${variant.id}_price`] = 'Valid price is required';
    }

    if (!Number.isFinite(variant.stockQuantity) || variant.stockQuantity < 0) {
      errors[`variant_${variant.id}_stockQuantity`] = 'Stock quantity must be 0 or greater';
    }

    return errors;
  }

  addImageToEditedProduct() {
    const url = (this.newProductImageUrl || '').trim();
    if (!url) return;
    this.editedProduct = {
      ...this.editedProduct,
      images: [...(this.editedProduct.images || []), url],
    };
    this.newProductImageUrl = '';
  }

  removeImageFromEditedProduct(index) {
    this.editedProduct = {
      ...this.editedProduct,
      images: (this.editedProduct.images || []).filter((_, i) => i !== index),
    };
  }

  addImageToNewProduct() {
    const url = (this.newCreateImageUrl || '').trim();
    if (!url) return;
    this.newProduct = {
      ...this.newProduct,
      images: [...(this.newProduct.images || []), url],
    };
    this.newCreateImageUrl = '';
  }

  removeImageFromNewProduct(index) {
    this.newProduct = {
      ...this.newProduct,
      images: (this.newProduct.images || []).filter((_, i) => i !== index),
    };
  }

  openFilePicker(context) {
    // Must be called synchronously from a user gesture (button click) to avoid browser security block
    const input = this.shadowRoot?.querySelector(`#file-input-${context}`);
    input?.click();
  }

  async handleFileSelected(event, context) {
    const file = event.target?.files?.[0];
    if (!file) return;
    event.target.value = ''; // Allow re-selecting same file

    this.imageUploading = true;
    this.error = null;
    this.providerWarning = null;
    try {
      const url = await this.uploadToUmbracoMedia(file);
      if (url) {
        // Optional copy to the external provider — additive; never affects the primary upload
        if (this.uploadToProviderAlso && this._photoProviderConfigured) {
          await this.uploadFileToProvider(file);
        }
        if (context === 'edit') {
          this.editedProduct = {
            ...this.editedProduct,
            images: [...(this.editedProduct.images || []), url],
          };
        } else {
          this.newProduct = {
            ...this.newProduct,
            images: [...(this.newProduct.images || []), url],
          };
        }
      } else {
        this.error = 'Image upload failed. Try pasting a URL instead.';
      }
    } finally {
      this.imageUploading = false;
    }
  }

  async uploadToUmbracoMedia(file) {
    try {
      const token = await this._authContext?.getLatestToken();
      const authHeader = `Bearer ${token}`;

      // Step 1: Upload to Umbraco temporary file slot
      const tempId = crypto.randomUUID();
      const form = new FormData();
      form.append('Id', tempId);
      form.append('File', file);

      const uploadRes = await fetch('/umbraco/management/api/v1/temporary-file', {
        method: 'POST',
        headers: { 'Authorization': authHeader },
        credentials: 'include',
        body: form,
        // Do NOT set Content-Type — browser sets multipart boundary automatically
      });

      if (!uploadRes.ok) {
        console.error('Temp file upload failed:', uploadRes.status, await uploadRes.text());
        return null;
      }

      // Step 2: Look up the Image media type GUID (cached after first call)
      const mediaTypeId = await this.getImageMediaTypeId(authHeader);
      if (!mediaTypeId) {
        console.error('Could not resolve Image media type ID');
        return null;
      }

      // Step 3: Create a media item referencing the temp file
      const mediaId = crypto.randomUUID();
      const createRes = await fetch('/umbraco/management/api/v1/media', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: mediaId,
          parent: null,
          mediaType: { id: mediaTypeId },
          variants: [{ culture: null, segment: null, name: file.name }],
          values: [{
            alias: 'umbracoFile',
            editorAlias: '',
            culture: null,
            segment: null,
            value: { temporaryFileId: tempId },
          }],
        }),
      });

      if (!createRes.ok) {
        console.error('Media create failed:', createRes.status, await createRes.text());
        return null;
      }

      // Step 4: Resolve the public URL — prefer Location header, fall back to the ID we sent
      const locationHeader = createRes.headers.get('Location');
      const newMediaKey = locationHeader?.split('/').pop() || mediaId;

      const urls = await this.resolveUmbracoMediaUrls([newMediaKey], authHeader);
      return urls[0] || null;
    } catch (err) {
      console.error('uploadToUmbracoMedia error:', err);
      return null;
    }
  }

  async getImageMediaTypeId(authHeader) {
    if (this._imageMediaTypeId) return this._imageMediaTypeId;

    try {
      // Umbraco 17 has no flat /media-type collection endpoint — list root media types via the tree API
      const res = await fetch('/umbraco/management/api/v1/tree/media-type/root?skip=0&take=100', {
        headers: { 'Authorization': authHeader },
        credentials: 'include',
      });
      if (!res.ok) return null;

      const data = await res.json();
      const imageType = (data.items || []).find(t =>
        t.name === 'Image' || t.alias === 'Image' || t.name?.toLowerCase() === 'image'
      );

      if (imageType?.id) {
        this._imageMediaTypeId = imageType.id;
      }
      return this._imageMediaTypeId || null;
    } catch {
      return null;
    }
  }

  async resolveUmbracoMediaUrls(keys, authHeader) {
    try {
      if (!authHeader) {
        const token = await this._authContext?.getLatestToken();
        authHeader = `Bearer ${token}`;
      }

      const params = keys.map(k => `id=${encodeURIComponent(k)}`).join('&');
      const res = await fetch(`/umbraco/management/api/v1/media/urls?${params}`, {
        headers: { 'Authorization': authHeader },
        credentials: 'include',
      });
      if (!res.ok) return [];

      const data = await res.json();
      // Response: Array of { unique: string, urlInfos: [{ url: string, culture: string|null }] }
      return (Array.isArray(data) ? data : [])
        .map(item => item.urlInfos?.[0]?.url || null)
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async pickFromUmbraco(context) {
    if (!this._modalManager) {
      this.error = 'Media picker not available. Try refreshing the page.';
      return;
    }

    try {
      const modal = this._modalManager.open(this, UMB_MEDIA_PICKER_MODAL, {
        data: { multiple: true },
        value: { selection: [] },
      });

      const result = await modal.onSubmit().catch(() => null);
      const keys = (result?.selection || []).filter(Boolean);
      if (!keys.length) return;

      this.imageUploading = true;
      try {
        const urls = await this.resolveUmbracoMediaUrls(keys);
        if (!urls.length) {
          this.error = 'Could not resolve media URLs. The selected items may not have a public URL.';
          return;
        }

        if (context === 'edit') {
          this.editedProduct = {
            ...this.editedProduct,
            images: [...(this.editedProduct.images || []), ...urls],
          };
        } else {
          this.newProduct = {
            ...this.newProduct,
            images: [...(this.newProduct.images || []), ...urls],
          };
        }
      } finally {
        this.imageUploading = false;
      }
    } catch (err) {
      console.error('Media picker error:', err);
      this.error = 'Media picker failed. Please try again.';
    }
  }

  // ─── External photo provider ──────────────────────────────────────────────

  async loadPhotoProviderState() {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/umbraco/management/api/ecomm-commerce/photo-provider/settings', {
        headers: headers,
        credentials: 'include',
      });
      if (res.ok) {
        const dto = await res.json();
        this._photoProviderConfigured = !!(dto.providerKey && dto.connectionStringSet);
      }
    } catch (err) {
      console.error('Failed to load photo provider state:', err);
    }
  }

  async openProviderBrowser(context) {
    this._providerBrowserContext = context;
    this.providerBrowserOpen = true;
    this.providerPhotos = [];
    this.providerContinuationToken = null;
    this.providerWarning = null;
    await this.loadProviderPhotos();
  }

  closeProviderBrowser() {
    this.providerBrowserOpen = false;
  }

  async loadProviderPhotos() {
    this.providerLoading = true;
    try {
      const headers = await this.getAuthHeaders();
      const tokenParam = this.providerContinuationToken
        ? `&continuationToken=${encodeURIComponent(this.providerContinuationToken)}`
        : '';
      const res = await fetch(`/umbraco/management/api/ecomm-commerce/photo-provider/photos?pageSize=24${tokenParam}`, {
        headers: headers,
        credentials: 'include',
      });
      if (!res.ok) {
        this.providerWarning = `Could not load provider photos: ${(await res.text()) || res.statusText}`;
        return;
      }
      const page = await res.json();
      this.providerPhotos = [...this.providerPhotos, ...(page.items || [])];
      this.providerContinuationToken = page.continuationToken || null;
    } catch (err) {
      console.error('Failed to load provider photos:', err);
      this.providerWarning = 'Could not load provider photos.';
    } finally {
      this.providerLoading = false;
    }
  }

  pickProviderPhoto(url) {
    // Provider photos are external blob URLs (no Umbraco mediaKey) — store as a plain ProductImage.
    if (this._providerBrowserContext === 'edit') {
      this.editedProduct = {
        ...this.editedProduct,
        images: [...(this.editedProduct.images || []), { url }],
      };
    } else {
      this.newProduct = {
        ...this.newProduct,
        images: [...(this.newProduct.images || []), { url }],
      };
    }
    this.providerBrowserOpen = false;
  }

  async uploadFileToProvider(file) {
    try {
      const token = await this._authContext?.getLatestToken();
      const form = new FormData();
      form.append('file', file);
      // Raw auth header only — getAuthHeaders() forces JSON content-type, which breaks multipart
      const res = await fetch('/umbraco/management/api/ecomm-commerce/photo-provider/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: form,
      });
      if (!res.ok) {
        this.providerWarning = `Image saved to the media library, but the copy to provider storage failed: ${(await res.text()) || res.statusText}`;
      }
    } catch (err) {
      console.error('Provider upload failed:', err);
      this.providerWarning = 'Image saved to the media library, but the copy to provider storage failed.';
    }
  }

  renderProviderBrowser() {
    if (!this.providerBrowserOpen) return '';
    return modalShell({
      headline: 'Provider photos',
      size: 'lg',
      onClose: () => this.closeProviderBrowser(),
      body: html`
        ${this.providerWarning ? html`<p class="modal-error">${this.providerWarning}</p>` : ''}

        ${this.providerPhotos.length === 0 && !this.providerLoading ? html`
          <p class="form-hint">No photos found in the provider container.</p>
        ` : html`
          <div class="provider-photos-grid">
            ${this.providerPhotos.map((photo) => html`
              <button class="provider-photo-item" title=${photo.name}
                @click=${() => this.pickProviderPhoto(photo.url)}>
                <img src="${photo.url}" alt="${photo.name}" loading="lazy"
                  @error=${(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                <div class="image-error-placeholder" style="display:none;">
                  <uui-icon name="icon-picture"></uui-icon>
                </div>
                <span class="provider-photo-name">${photo.name}</span>
              </button>
            `)}
          </div>
        `}

        ${this.providerLoading ? html`<div class="provider-browser-footer"><uui-loader></uui-loader></div>` : ''}`,
      actions: html`
        ${this.providerContinuationToken && !this.providerLoading ? html`
          <uui-button slot="actions" look="outline" label="Load more"
            @click=${this.loadProviderPhotos}>Load more</uui-button>` : ''}
        <uui-button slot="actions" label="Close" @click=${this.closeProviderBrowser}>Close</uui-button>`,
    });
  }

  /**
   * Product image editor. Umbraco-media images are managed by the NATIVE <umb-input-rich-media>
   * element (pick / dropzone-upload / drag-reorder / focal-point + crop editor). External images
   * (provider blobs, pasted URLs) are kept in a secondary list. `onChange(newImages)` receives the
   * combined ProductImage[] to store on the product.
   */
  renderImageGallery(images, onChange, context) {
    const imgs = images || [];
    const mediaValue = this._toRichMediaValue(imgs);
    const externals = [];
    imgs.forEach((im, i) => { if (!(im && im.mediaKey)) externals.push({ im, index: i }); });
    const urlField = context === 'create' ? 'newCreateImageUrl' : 'newProductImageUrl';

    return html`
      <div class="images-section">
        <umb-input-rich-media
          .value=${mediaValue}
          ?multiple=${true}
          .focalPointEnabled=${this.defaultAliases?.enableFocalPoint ?? true}
          .preselectedCrops=${this._preselectedCrops()}
          @change=${(e) => this._onRichMediaChange(e.target.value, imgs, onChange)}>
        </umb-input-rich-media>

        ${externals.length > 0 ? html`
          <div class="external-images">
            <span class="ext-label">External images (provider / URL)</span>
            <div class="images-grid">
              ${externals.map(({ im, index }) => html`
                <div class="image-item">
                  <img src="${im.url}" alt="${im.altText || ''}" class="image-preview"
                    @error=${(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                  <div class="image-error-placeholder" style="display:none;"><uui-icon name="icon-picture"></uui-icon></div>
                  <button class="image-remove-btn" title="Remove"
                    @click=${() => onChange(imgs.filter((_, i) => i !== index))}>×</button>
                  <uui-input class="ext-alt" placeholder="Alt text" .value=${im.altText || ''}
                    @change=${(e) => onChange(imgs.map((x, i) => i === index ? { ...x, altText: e.target.value || undefined } : x))}>
                  </uui-input>
                </div>
              `)}
            </div>
          </div>
        ` : ''}

        ${this.imageUploading ? html`
          <div class="image-uploading-row"><uui-loader></uui-loader><span>Working…</span></div>
        ` : ''}

        <div class="image-upload-actions">
          ${this._photoProviderConfigured ? html`
            <uui-button look="secondary" @click=${() => this.openProviderBrowser(context)} ?disabled=${this.imageUploading}>
              <uui-icon name="icon-cloud" slot="icon"></uui-icon>
              Browse Provider Photos
            </uui-button>
          ` : ''}
        </div>

        ${this.providerWarning && !this.providerBrowserOpen ? html`
          <div class="notice notice--warning">${this.providerWarning}</div>
        ` : ''}

        <div class="add-image-row">
          <uui-input
            type="url"
            placeholder="https://example.com/image.jpg"
            .value=${this[urlField] || ''}
            @input=${(e) => { this[urlField] = e.target.value; }}
            @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this._addExternalUrl(imgs, onChange, urlField); } }}>
          </uui-input>
          <uui-button look="secondary" @click=${() => this._addExternalUrl(imgs, onChange, urlField)} ?disabled=${this.imageUploading}>
            Add URL
          </uui-button>
        </div>
      </div>
    `;
  }

  /** The single configured crop preset (Settings → Images), as the native picker's preselectedCrops. */
  _preselectedCrops() {
    const c = this.defaultAliases?.productImageCrop;
    if (!c || !(c.width > 0) || !(c.height > 0)) return [];
    return [{ alias: c.alias || 'product', label: c.label, width: c.width, height: c.height }];
  }

  /** Build the <umb-input-rich-media> value (media-backed images only) from our ProductImage[]. */
  _toRichMediaValue(images) {
    return (images || [])
      .filter((im) => im && im.mediaKey)
      .map((im) => ({
        key: im.mediaKey,
        mediaKey: im.mediaKey,
        mediaTypeAlias: '',
        focalPoint: im.focalPoint || null,
        crops: im.crops || [],
      }));
  }

  /** Map the native element value back to ProductImage[], resolving URLs + alt, keeping externals. */
  async _onRichMediaChange(value, currentImages, onChange) {
    const entries = Array.isArray(value) ? value : [];
    const current = currentImages || [];
    const externals = current.filter((im) => !(im && im.mediaKey));
    const byKey = new Map(current.filter((im) => im && im.mediaKey).map((im) => [im.mediaKey, im]));

    const mediaImages = [];
    for (const entry of entries) {
      const mediaKey = entry && entry.mediaKey;
      if (!mediaKey) continue;
      const existing = byKey.get(mediaKey);
      const info = await this._mediaInfo(mediaKey);
      // Store the CLEAN base URL (strip any legacy crop querystring). The global crop is applied
      // dynamically when the storefront renders (IProductImageUrlHelper), so changing the crop
      // setting updates every image without re-saving products.
      const baseUrl = (info.url && info.url.split('?')[0])
        || (existing && existing.url && existing.url.split('?')[0]) || '';
      mediaImages.push({
        url: baseUrl,
        mediaKey,
        altText: (existing && existing.altText) || info.altText || undefined,
        focalPoint: entry.focalPoint || undefined,
        crops: (entry.crops && entry.crops.length) ? entry.crops : undefined,
      });
    }
    onChange([...mediaImages, ...externals]);
  }

  /** Resolve a media item's public URL + a default alt text (cached per session). */
  async _mediaInfo(mediaKey) {
    this._mediaInfoCache = this._mediaInfoCache || {};
    if (this._mediaInfoCache[mediaKey]) return this._mediaInfoCache[mediaKey];

    const token = await this._authContext?.getLatestToken();
    const authHeader = `Bearer ${token}`;
    let url = '';
    try { url = (await this.resolveUmbracoMediaUrls([mediaKey], authHeader))[0] || ''; } catch { /* ignore */ }

    let altText;
    try {
      const res = await fetch(`/umbraco/management/api/v1/media/${mediaKey}`, {
        headers: { Authorization: authHeader }, credentials: 'include',
      });
      if (res.ok) altText = this._readAltFromMediaDetail(await res.json());
    } catch { /* ignore */ }

    const info = { url, altText };
    this._mediaInfoCache[mediaKey] = info;
    return info;
  }

  /** Alt text fallback chain: altText / alt / alternativeText property, then the media item name. */
  _readAltFromMediaDetail(detail) {
    const values = (detail && detail.values) || [];
    const aliases = ['alttext', 'alt', 'alternativetext'];
    for (const alias of aliases) {
      const v = values.find((x) =>
        (x.alias || '').toLowerCase() === alias &&
        typeof x.value === 'string' && x.value.trim());
      if (v) return v.value.trim();
    }
    const name = detail && detail.variants && detail.variants[0] && detail.variants[0].name;
    return name || undefined;
  }

  _addExternalUrl(images, onChange, urlField) {
    const url = (this[urlField] || '').trim();
    if (!url) return;
    onChange([...(images || []), { url }]);
    this[urlField] = '';
  }

  /** URL accessor tolerant of both the object shape and legacy bare-string entries. */
  _imgSrc(entry) {
    if (!entry) return '';
    return typeof entry === 'string' ? entry : (entry.url || '');
  }

  startCreateProduct() {
    this.creatingProduct = true;
    this.newProductType = null;
    this.newProduct = {
      name: '',
      sku: '',
      price: '',
      stockQuantity: 0,
      status: 'active',
      description: '',
      categoryId: this.categoryId,
      images: [],
      variantOptions: [],
    };
    this.newProductVariantOptionName = '';
    this.newProductVariantOptionValues = '';
    this.newProductOptionCardValues = {};
    this.newCreateImageUrl = '';
    this.createProductErrors = {};
    this.error = null;
  }

  cancelCreateProduct() {
    this.creatingProduct = false;
    this.newProductType = null;
    this.newProduct = null;
    this.createProductErrors = {};
    this.newProductVariantOptionName = '';
    this.newProductVariantOptionValues = '';
    this.newProductOptionCardValues = {};
    this.newProductHighlightsText = '';
  }

  addNewProductVariantOption() {
    const name = (this.newProductVariantOptionName || '').trim();
    if (!name) return;

    const existing = this.newProduct?.variantOptions || [];
    if (existing.some(o => o.name.toLowerCase() === name.toLowerCase())) {
      this.error = `Option "${name}" already exists`;
      return;
    }

    const values = (this.newProductVariantOptionValues || '')
      .split(',').map(v => v.trim()).filter(v => v.length > 0);

    this.newProduct = {
      ...this.newProduct,
      variantOptions: [...existing, { name, alias: this._slug(name), attributeId: null, values }],
    };
    this.newProductVariantOptionName = '';
    this.newProductVariantOptionValues = '';
    this.error = null;
  }

  /** Add a store-library (global) attribute to the new-product draft. */
  addGlobalNewProductOption(attrId) {
    const attr = (this.marketAttributes || []).find(a => a.id === attrId);
    if (!attr) return;
    const existing = this.newProduct?.variantOptions || [];
    if (existing.some(o => o.attributeId === attr.id
        || (o.name || '').toLowerCase() === (attr.name || '').toLowerCase())) {
      this.error = `"${attr.name}" is already added`;
      return;
    }
    this.newProduct = {
      ...this.newProduct,
      variantOptions: [...existing, {
        name: attr.name, alias: attr.alias, attributeId: attr.id,
        values: (attr.values || []).map(v => (v && typeof v === 'object') ? v.name : v),
      }],
    };
    this.error = null;
  }

  removeNewProductVariantOption(index) {
    this.newProduct = {
      ...this.newProduct,
      variantOptions: (this.newProduct?.variantOptions || []).filter((_, i) => i !== index),
    };
  }

  removeValueFromNewProductOption(optIndex, valIndex) {
    const options = (this.newProduct?.variantOptions || []).map((o, i) =>
      i === optIndex ? { ...o, values: o.values.filter((_, vi) => vi !== valIndex) } : o
    );
    this.newProduct = { ...this.newProduct, variantOptions: options };
  }

  handleNewProductOptionCardValue(index, value) {
    this.newProductOptionCardValues = { ...this.newProductOptionCardValues, [index]: value };
  }

  addValueToNewProductOption(index) {
    const value = (this.newProductOptionCardValues[index] || '').trim();
    if (!value) return;
    const opt = (this.newProduct?.variantOptions || [])[index];
    if (!opt) return;
    if (opt.values.some(v => v.toLowerCase() === value.toLowerCase())) {
      this.error = `Value "${value}" already exists for "${opt.name}"`;
      return;
    }
    const options = (this.newProduct.variantOptions).map((o, i) =>
      i === index ? { ...o, values: [...o.values, value] } : o
    );
    this.newProduct = { ...this.newProduct, variantOptions: options };
    this.newProductOptionCardValues = { ...this.newProductOptionCardValues, [index]: '' };
    this.error = null;
  }

  handleNewProductInput(field, value) {
    this.newProduct = { ...this.newProduct, [field]: value };
    if (this.createProductErrors[field]) {
      this.createProductErrors = { ...this.createProductErrors, [field]: null };
    }
  }

  validateNewProduct() {
    const errors = {};
    if (!this.newProduct.name || this.newProduct.name.trim() === '') {
      errors.name = 'Name is required';
    }
    if (this.newProductType === 'single') {
      if (!this.newProduct.sku || this.newProduct.sku.trim() === '') {
        errors.sku = 'SKU is required';
      }
      const price = parseFloat(this.newProduct.price);
      if (isNaN(price) || price < 0) {
        errors.price = 'Valid price is required';
      }
    } else {
      // variants: at least one option with at least one value required
      const validOptions = (this.newProduct?.variantOptions || []).filter(o => o.values && o.values.length > 0);
      if (validOptions.length === 0) {
        errors.variantOptions = 'Add at least one attribute with values (e.g., Size: S, M, L)';
      }
    }
    this.createProductErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async submitCreateProduct() {
    if (!this.validateNewProduct()) return;

    this.createSaving = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const userName = this.currentUser?.email || this.currentUser?.name || 'system';

      const hasVariants = this.newProductType === 'variants';
      const variantOptions = hasVariants ? this._denormalizeVariantOptions(this.newProduct?.variantOptions || []) : [];

      const payload = {
        name: (this.newProduct.name || '').trim(),
        sku: (this.newProduct.sku || '').trim(),
        price: hasVariants ? 0 : (parseFloat(this.newProduct.price) || 0),
        stockQuantity: hasVariants ? 0 : (parseInt(String(this.newProduct.stockQuantity ?? 0), 10) || 0),
        status: this.newProduct.status || 'active',
        description: (this.newProduct.description || '').trim() || null,
        categoryId: this.categoryId || null,
        images: this.newProduct.images || [],
        highlights: (this.newProduct.highlights || []).map(s => (s || '').trim()).filter(s => s.length > 0),
        versionCreatedBy: userName,
        hasVariants,
        variantOptions,
        variants: [],
      };

      const response = await fetch(
        '/umbraco/management/api/ecomm-commerce/products',
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const created = await response.json();
        this.products = [created, ...this.products];
        this.creatingProduct = false;
        this.newProduct = null;
        this.createProductErrors = {};
        this.selectedProductId = created.id;
        this.editedProduct = { ...created };
        this.highlightsText = (created.highlights || []).join('\n');
        this.variantSearchQuery = '';
      } else {
        const text = await response.text();
        console.error('Failed to create product:', text);
        toastError(this, 'Product not created', text || response.statusText);
      }
    } catch (err) {
      console.error('Failed to create product:', err);
      toastError(this, 'Product not created', err);
    } finally {
      this.createSaving = false;
    }
  }

  renderCreateProductForm() {
    return html`
      <div class="create-product-form">
        <h4 class="section-heading">New Product</h4>

        ${this.error ? html`
          <div class="notice notice--error">${this.error}</div>
        ` : ''}

        ${this.newProductType === null
          ? this.renderProductTypeSelector()
          : this.newProductType === 'single'
            ? this.renderSingleProductForm()
            : this.renderVariantProductForm()
        }
      </div>
    `;
  }

  renderProductTypeSelector() {
    return html`
      <p class="variant-options-hint">Choose the product type to continue.</p>
      <div class="product-type-cards">
        <div class="product-type-card" @click=${() => { this.newProductType = 'single'; }}>
          <div class="product-type-card-icon">📦</div>
          <strong>Single Product</strong>
          <p>One SKU, fixed price and stock quantity</p>
        </div>
        <div class="product-type-card" @click=${() => { this.newProductType = 'variants'; }}>
          <div class="product-type-card-icon">🎛️</div>
          <strong>Product with Variants</strong>
          <p>Multiple options (e.g., Size, Color) — price and stock set per variant</p>
        </div>
      </div>
      <div class="button-group">
        <uui-button look="secondary" @click=${this.cancelCreateProduct}>Cancel</uui-button>
      </div>
    `;
  }

  renderSingleProductForm() {
    return html`
      <div class="edit-form-grid">
        <div class="form-group">
          <uui-label for="new-product-name" required>Name</uui-label>
          <uui-input
            id="new-product-name"
            type="text"
            placeholder="Product name"
            .value=${this.newProduct?.name || ''}
            @input=${(e) => this.handleNewProductInput('name', e.target.value)}
            ?disabled=${this.createSaving}
            required>
          </uui-input>
          ${this.createProductErrors.name ? html`<small class="error-text">${this.createProductErrors.name}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="new-product-sku" required>SKU</uui-label>
          <uui-input
            id="new-product-sku"
            type="text"
            placeholder="e.g. PROD-001"
            .value=${this.newProduct?.sku || ''}
            @input=${(e) => this.handleNewProductInput('sku', e.target.value)}
            ?disabled=${this.createSaving}
            required>
          </uui-input>
          ${this.createProductErrors.sku ? html`<small class="error-text">${this.createProductErrors.sku}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="new-product-price" required>Price</uui-label>
          <uui-input
            id="new-product-price"
            type="number"
            step="0.01"
            placeholder="0.00"
            .value=${String(this.newProduct?.price ?? '')}
            @input=${(e) => this.handleNewProductInput('price', e.target.value)}
            ?disabled=${this.createSaving}
            required>
          </uui-input>
          ${this.createProductErrors.price ? html`<small class="error-text">${this.createProductErrors.price}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="new-product-sale-price">Sale Price</uui-label>
          <uui-input
            id="new-product-sale-price"
            type="number"
            step="0.01"
            placeholder="Leave blank if not on sale"
            .value=${String(this.newProduct?.salePrice ?? '')}
            @input=${(e) => this.handleNewProductInput('salePrice', e.target.value ? parseFloat(e.target.value) : null)}
            ?disabled=${this.createSaving}>
          </uui-input>
        </div>

        <div class="form-group">
          <uui-label for="new-product-stock">Stock Quantity</uui-label>
          <uui-input
            id="new-product-stock"
            type="number"
            placeholder="0"
            .value=${String(this.newProduct?.stockQuantity ?? 0)}
            @input=${(e) => this.handleNewProductInput('stockQuantity', e.target.value)}
            ?disabled=${this.createSaving}>
          </uui-input>
        </div>

        <div class="form-group">
          <uui-label for="new-product-status">Status</uui-label>
          <select
            id="new-product-status"
            class="variant-status-select"
            @change=${(e) => this.handleNewProductInput('status', e.target.value)}
            ?disabled=${this.createSaving}>
            <option value="active" ?selected=${(this.newProduct?.status || 'active') === 'active'}>Active</option>
            <option value="inactive" ?selected=${this.newProduct?.status === 'inactive'}>Inactive</option>
            <option value="draft" ?selected=${this.newProduct?.status === 'draft'}>Draft</option>
          </select>
        </div>

        <div class="form-group full-width">
          <uui-label for="new-product-description">Description</uui-label>
          <textarea
            id="new-product-description"
            class="description-textarea"
            .value=${this.newProduct?.description || ''}
            @input=${(e) => this.handleNewProductInput('description', e.target.value)}
            ?disabled=${this.createSaving}
            rows="3"
            placeholder="Product description..."></textarea>
        </div>

        <div class="form-group full-width">
          ${this.renderStringListEditor('newProduct', 'highlights', 'Highlights',
            'Short bullet points shown on the product page.', '+ Highlight', 'No highlights yet.', this.createSaving)}
        </div>

        <div class="form-group">
          <uui-label for="new-product-leasing-factor">Leasing Factor</uui-label>
          <uui-input
            id="new-product-leasing-factor"
            type="number"
            step="0.0001"
            placeholder="e.g. 0.0285"
            .value=${String(this.newProduct?.leasingFactor ?? '')}
            @input=${(e) => this.handleNewProductInput('leasingFactor', e.target.value ? parseFloat(e.target.value) : null)}
            ?disabled=${this.createSaving}>
          </uui-input>
          <small class="field-hint">Monthly price = Price × Leasing Factor</small>
        </div>

        <div class="form-group full-width">
          <uui-label>Images</uui-label>
          ${this.renderImageGallery(
            this.newProduct?.images || [],
            (imgs) => { this.newProduct = { ...this.newProduct, images: imgs }; },
            'create'
          )}
        </div>
      </div>

      <div class="button-group">
        <uui-button look="secondary" @click=${() => { this.newProductType = null; }} ?disabled=${this.createSaving}>
          Back
        </uui-button>
        <uui-button look="secondary" @click=${this.cancelCreateProduct} ?disabled=${this.createSaving}>
          Cancel
        </uui-button>
        <uui-button look="primary" color="positive" @click=${this.submitCreateProduct} ?disabled=${this.createSaving}>
          ${this.createSaving ? 'Creating...' : 'Create Product'}
        </uui-button>
      </div>
    `;
  }

  renderVariantProductForm() {
    return html`
      <div class="edit-form-grid">
        <div class="form-group">
          <uui-label for="new-product-name" required>Name</uui-label>
          <uui-input
            id="new-product-name"
            type="text"
            placeholder="Product name"
            .value=${this.newProduct?.name || ''}
            @input=${(e) => this.handleNewProductInput('name', e.target.value)}
            ?disabled=${this.createSaving}
            required>
          </uui-input>
          ${this.createProductErrors.name ? html`<small class="error-text">${this.createProductErrors.name}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="new-product-status">Status</uui-label>
          <select
            id="new-product-status"
            class="variant-status-select"
            @change=${(e) => this.handleNewProductInput('status', e.target.value)}
            ?disabled=${this.createSaving}>
            <option value="active" ?selected=${(this.newProduct?.status || 'active') === 'active'}>Active</option>
            <option value="inactive" ?selected=${this.newProduct?.status === 'inactive'}>Inactive</option>
            <option value="draft" ?selected=${this.newProduct?.status === 'draft'}>Draft</option>
          </select>
        </div>

        <div class="form-group full-width">
          <uui-label>Images</uui-label>
          ${this.renderImageGallery(
            this.newProduct?.images || [],
            (imgs) => { this.newProduct = { ...this.newProduct, images: imgs }; },
            'create'
          )}
        </div>

        <!-- Variant Options (required for this type) -->
        <div class="form-group full-width">
          <uui-label required>Attributes</uui-label>
          <p class="variant-options-hint">Define attributes and their values (e.g., Size: S, M, L). At least one attribute is required.</p>

          ${this.createProductErrors.variantOptions ? html`
            <small class="error-text">${this.createProductErrors.variantOptions}</small>
          ` : ''}

          ${(this.newProduct?.variantOptions || []).length > 0 ? html`
            <div class="new-product-option-list">
              ${(this.newProduct?.variantOptions || []).map((opt, optIndex) => opt.attributeId ? html`
                <div class="new-product-option-card">
                  <div class="new-product-option-header">
                    <strong>${opt.name}</strong>
                    <span class="pill pill--info" title="From the store attribute library">global</span>
                    <button class="option-tag-remove"
                      @click=${() => this.removeNewProductVariantOption(optIndex)}
                      ?disabled=${this.createSaving}
                      type="button">Remove</button>
                  </div>
                  <div class="option-value-chips">
                    ${this._optionValueNames(opt).map(val => html`<span class="option-value-chip">${val}</span>`)}
                  </div>
                  <p class="no-values-hint">Values are managed in Commerce → Attributes.</p>
                </div>
              ` : html`
                <div class="new-product-option-card">
                  <div class="new-product-option-header">
                    <strong>${opt.name}</strong>
                    <button class="option-tag-remove"
                      @click=${() => this.removeNewProductVariantOption(optIndex)}
                      ?disabled=${this.createSaving}
                      type="button">Remove</button>
                  </div>

                  ${opt.values.length > 0 ? html`
                    <div class="option-value-chips">
                      ${opt.values.map((val, vi) => html`
                        <span class="option-value-chip">
                          ${val}
                          <button class="chip-remove" type="button"
                            @click=${() => this.removeValueFromNewProductOption(optIndex, vi)}
                            ?disabled=${this.createSaving}>×</button>
                        </span>
                      `)}
                    </div>
                  ` : html`<p class="no-values-hint">No values yet.</p>`}

                  <div class="add-value-row">
                    <uui-input
                      type="text"
                      placeholder="Add a value (e.g., Small)"
                      .value=${this.newProductOptionCardValues[optIndex] || ''}
                      @input=${(e) => this.handleNewProductOptionCardValue(optIndex, e.target.value)}
                      @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addValueToNewProductOption(optIndex); } }}
                      ?disabled=${this.createSaving}>
                    </uui-input>
                    <uui-button look="secondary"
                      @click=${() => this.addValueToNewProductOption(optIndex)}
                      ?disabled=${this.createSaving}>
                      Add Value
                    </uui-button>
                  </div>
                </div>
              `)}
            </div>
          ` : ''}

          ${this._availableGlobalAttributes(this.newProduct?.variantOptions).length > 0 ? html`
            <div class="add-option-card">
              <select class="variant-status-select"
                @change=${(e) => { if (e.target.value) { this.addGlobalNewProductOption(e.target.value); e.target.value = ''; } }}
                ?disabled=${this.createSaving}>
                <option value="">+ Add store attribute…</option>
                ${this._availableGlobalAttributes(this.newProduct?.variantOptions).map(a => html`
                  <option value="${a.id}">${a.name} (${(a.values || []).length} values)</option>
                `)}
              </select>
            </div>
          ` : ''}

          <div class="add-option-card">
            <div class="add-option-name-row">
              <uui-input
                type="text"
                placeholder="Local attribute name (e.g., Size)"
                .value=${this.newProductVariantOptionName}
                @input=${(e) => { this.newProductVariantOptionName = e.target.value; }}
                @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addNewProductVariantOption(); } }}
                ?disabled=${this.createSaving}>
              </uui-input>
              <uui-input
                type="text"
                placeholder="Values, comma-separated (e.g., S, M, L)"
                .value=${this.newProductVariantOptionValues}
                @input=${(e) => { this.newProductVariantOptionValues = e.target.value; }}
                @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addNewProductVariantOption(); } }}
                ?disabled=${this.createSaving}>
              </uui-input>
              <uui-button look="secondary" @click=${this.addNewProductVariantOption} ?disabled=${this.createSaving}>
                Add Attribute
              </uui-button>
            </div>
          </div>
        </div>
      </div>

      <div class="button-group">
        <uui-button look="secondary" @click=${() => { this.newProductType = null; }} ?disabled=${this.createSaving}>
          Back
        </uui-button>
        <uui-button look="secondary" @click=${this.cancelCreateProduct} ?disabled=${this.createSaving}>
          Cancel
        </uui-button>
        <uui-button look="primary" color="positive" @click=${this.submitCreateProduct} ?disabled=${this.createSaving}>
          ${this.createSaving ? 'Creating...' : 'Create Product'}
        </uui-button>
      </div>
    `;
  }

  formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  renderAddVariantForm() {
    const variantOptions = this.editedProduct?.variantOptions || [];
    const optionsWithValues = variantOptions.filter(opt => this._optionValueNames(opt).length > 0);

    return html`
      <div class="add-variant-form">
        <h5 class="section-heading">Add New Variant</h5>

        <div class="edit-form-grid">
          <!-- SKU -->
          <div class="form-group">
            <uui-label for="new-av-sku" required>SKU</uui-label>
            <uui-input
              id="new-av-sku"
              type="text"
              placeholder="e.g. PROD-001-XL-RED"
              .value=${this.newVariant?.sku || ''}
              @input=${(e) => this.handleNewVariantInput('sku', e.target.value)}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.addVariantErrors.sku ? html`
              <small class="error-text">${this.addVariantErrors.sku}</small>
            ` : ''}
          </div>

          <!-- Price -->
          <div class="form-group">
            <uui-label for="new-av-price" required>Price</uui-label>
            <uui-input
              id="new-av-price"
              type="number"
              step="0.01"
              placeholder="0.00"
              .value=${String(this.newVariant?.price ?? '')}
              @input=${(e) => this.handleNewVariantInput('price', e.target.value)}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.addVariantErrors.price ? html`
              <small class="error-text">${this.addVariantErrors.price}</small>
            ` : ''}
          </div>

          <!-- Stock -->
          <div class="form-group">
            <uui-label for="new-av-stock">Stock Quantity</uui-label>
            <uui-input
              id="new-av-stock"
              type="number"
              placeholder="0"
              .value=${String(this.newVariant?.stockQuantity ?? 0)}
              @input=${(e) => this.handleNewVariantInput('stockQuantity', e.target.value)}
              ?disabled=${this.saving}>
            </uui-input>
          </div>

          <!-- Status -->
          <div class="form-group">
            <uui-label for="new-av-status">Status</uui-label>
            <select
              id="new-av-status"
              class="variant-status-select"
              .value=${this.newVariant?.status || 'active'}
              @change=${(e) => this.handleNewVariantInput('status', e.target.value)}
              ?disabled=${this.saving}>
              <option value="active" ?selected=${this.newVariant?.status === 'active'}>Active</option>
              <option value="inactive" ?selected=${this.newVariant?.status === 'inactive'}>Inactive</option>
            </select>
          </div>

          ${optionsWithValues.length > 0 ? html`
            <div class="form-group full-width">
              <uui-label>Attributes</uui-label>
              <div class="edit-form-grid">
                ${optionsWithValues.map(opt => html`
                  <div class="form-group">
                    <uui-label>${opt.name}</uui-label>
                    <select
                      class="variant-status-select"
                      @change=${(e) => this.handleNewVariantOption(opt.name, e.target.value)}
                      ?disabled=${this.saving}>
                      ${this._optionValueNames(opt).map(v => html`
                        <option value="${v}"
                          ?selected=${(this.newVariant?.options?.[opt.name] ?? this._optionValueNames(opt)[0]) === v}>
                          ${v}
                        </option>
                      `)}
                    </select>
                  </div>
                `)}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="button-group">
          <uui-button look="secondary" @click=${this.cancelAddVariant} ?disabled=${this.saving}>
            Cancel
          </uui-button>
          <uui-button look="primary" color="positive" @click=${this.submitAddVariant} ?disabled=${this.saving}>
            ${this.saving ? 'Saving...' : 'Add Variant'}
          </uui-button>
        </div>
      </div>
    `;
  }

  renderVariantRow(variant) {
    const isEditing = this.editedVariantId === variant.id;
    const optionsText = Object.entries(variant.options || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    return html`
      <div class="variant-row ${isEditing ? 'editing' : ''}" @click=${() => this.toggleVariantEdit(variant)}>
        <div class="variant-header">
          <div class="variant-options">
            <uui-icon name="icon-box"></uui-icon>
            <strong>${optionsText}</strong>
            ${variant.isDefault ? html`<span class="pill pill--active">Default</span>` : ''}
          </div>
          <div class="variant-summary">
            <span class="variant-sku">${variant.sku}</span>
            <span class="variant-price">${this.formatPrice(variant.price)}</span>
            <span class="variant-tag ${variant.stockQuantity > 0 ? 'tag-positive' : 'tag-danger'}">
              Stock: ${Number.isFinite(variant.stockQuantity) ? variant.stockQuantity : '—'}
            </span>
            <span class="variant-tag ${variant.status === 'active' ? 'tag-positive' : 'tag-default'}">
              ${variant.status}
            </span>

            <uui-button look="secondary" color="danger" label="Delete variant" ?disabled=${this.saving}
              @click=${(e) => { e.stopPropagation(); this._confirmDeleteVariant(variant); }}>
              Delete
            </uui-button>
          </div>
        </div>

        ${isEditing ? this.renderVariantEditForm(variant) : ''}
      </div>
    `;
  }

  renderVariantEditForm(variant) {
    const variantOptions = this.editedProduct?.variantOptions || [];
    const optionsToShow = variantOptions.length > 0
      ? variantOptions
      : Object.keys(variant.options || {}).map(name => ({ name, values: [] }));

    return html`
      <div class="variant-edit-form" @click=${(e) => e.stopPropagation()}>

        ${optionsToShow.length > 0 ? html`
          <div class="attributes-section">
            <h4 class="section-heading">Attributes</h4>
            <div class="edit-form-grid">
              ${optionsToShow.map(opt => html`
                <div class="form-group">
                  <uui-label>${opt.name}</uui-label>
                  ${this._optionValueNames(opt).length > 0 ? html`
                    <select
                      class="variant-status-select"
                      @change=${(e) => this.handleVariantOptionInput(variant.id, opt.name, e.target.value)}
                      ?disabled=${this.saving}>
                      <option value="" ?selected=${!variant.options?.[opt.name]}>— not set —</option>
                      ${this._optionValueNames(opt).map(v => html`
                        <option value="${v}" ?selected=${variant.options?.[opt.name] === v}>
                          ${v}
                        </option>
                      `)}
                    </select>
                  ` : html`
                    <uui-input
                      type="text"
                      placeholder="Enter ${opt.name} value"
                      .value=${variant.options?.[opt.name] || ''}
                      @input=${(e) => this.handleVariantOptionInput(variant.id, opt.name, e.target.value)}
                      ?disabled=${this.saving}>
                    </uui-input>
                  `}
                </div>
              `)}
            </div>
          </div>
        ` : ''}

        <h4 class="section-heading">Content</h4>
        <div class="edit-form-grid">
          <!-- SKU -->
          <div class="form-group">
            <uui-label for="variant-sku-${variant.id}" required>SKU</uui-label>
            <uui-input
              id="variant-sku-${variant.id}"
              type="text"
              .value=${variant.sku || ''}
              @input=${(e) => this.handleVariantInput(variant.id, 'sku', e.target.value)}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.validationErrors[`variant_${variant.id}_sku`] ? html`
              <small class="error-text">${this.validationErrors[`variant_${variant.id}_sku`]}</small>
            ` : ''}
          </div>

          <!-- Display Name -->
          <div class="form-group">
            <uui-label for="variant-display-name-${variant.id}">Display Name</uui-label>
            <uui-input
              id="variant-display-name-${variant.id}"
              type="text"
              .value=${variant.displayName || ''}
              @input=${(e) => this.handleVariantInput(variant.id, 'displayName', e.target.value)}
              ?disabled=${this.saving}
              placeholder="e.g. 2500×1500 mm — shown in variant selector">
            </uui-input>
          </div>

          <!-- Price -->
          <div class="form-group">
            <uui-label for="variant-price-${variant.id}" required>Price</uui-label>
            <uui-input
              id="variant-price-${variant.id}"
              type="number"
              step="0.01"
              .value=${String(variant.price || '')}
              @input=${(e) => this.handleVariantInput(variant.id, 'price', parseFloat(e.target.value))}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.validationErrors[`variant_${variant.id}_price`] ? html`
              <small class="error-text">${this.validationErrors[`variant_${variant.id}_price`]}</small>
            ` : ''}
          </div>

          <!-- Stock -->
          <div class="form-group">
            <uui-label for="variant-stock-${variant.id}" required>Stock Quantity</uui-label>
            <uui-input
              id="variant-stock-${variant.id}"
              type="number"
              min="0"
              .value=${String(variant.stockQuantity ?? '')}
              @input=${(e) => this.handleVariantInput(variant.id, 'stockQuantity', parseInt(e.target.value))}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.validationErrors[`variant_${variant.id}_stockQuantity`] ? html`
              <small class="error-text">${this.validationErrors[`variant_${variant.id}_stockQuantity`]}</small>
            ` : ''}
          </div>

          <!-- Status -->
          <div class="form-group">
            <uui-label for="variant-status-${variant.id}">Status</uui-label>
            <select
              id="variant-status-${variant.id}"
              class="variant-status-select"
              .value=${variant.status || 'active'}
              @change=${(e) => this.handleVariantInput(variant.id, 'status', e.target.value)}
              ?disabled=${this.saving}>
              <option value="active" ?selected=${variant.status === 'active'}>Active</option>
              <option value="inactive" ?selected=${variant.status === 'inactive'}>Inactive</option>
            </select>
          </div>

          <!-- Description -->
          <div class="form-group full-width">
            <uui-label for="variant-description-${variant.id}">Description</uui-label>
            <textarea
              id="variant-description-${variant.id}"
              class="description-textarea"
              .value=${variant.description || ''}
              @input=${(e) => this.handleVariantInput(variant.id, 'description', e.target.value)}
              ?disabled=${this.saving}
              rows="3"
              placeholder="Variant description..."></textarea>
          </div>
        </div>

        <div class="button-group">
          <uui-button
            look="secondary"
            @click=${() => this.toggleVariantEdit(variant)}
            ?disabled=${this.saving}>
            Cancel
          </uui-button>

          <uui-button
            look="primary"
            color="positive"
            @click=${() => this.saveProduct()}
            ?disabled=${this.saving}>
            ${this.saving ? 'Saving...' : 'Save Variant'}
          </uui-button>
        </div>
      </div>
    `;
  }

  renderOptionsEditor() {
    return html`
      <div class="options-editor-container">

            <div class="options-editor-header">
              <h4 class="options-editor-title">Update Attributes</h4>
              <uui-button look="secondary" @click=${this.cancelEditOptions} ?disabled=${this.saving}>
                Cancel
              </uui-button>
            </div>

            <p class="options-editor-intro">
              Rename or remove attributes. Renaming updates all existing variants automatically.
            </p>

            ${this.error ? html`
              <div class="notice notice--error">${this.error}</div>
            ` : ''}

            ${this.editOptionsDraft.length > 0 ? html`
              <div class="options-draft-list">
                ${this.editOptionsDraft.map((opt, index) => opt.attributeId ? html`
                  <div class="option-draft-card">
                    <div class="option-draft-name-row">
                      <strong class="option-draft-global-name">${opt.name}</strong>
                      <span class="pill pill--info" title="From the store attribute library">global</span>
                      <!-- Detaches the axis from THIS product only; the library entry in
                           Commerce → Attributes is untouched. Existing variants lose their
                           selection for it (handled by _saveOptions). -->
                      <uui-button look="secondary" color="danger"
                        title="Remove this attribute from this product (the store library keeps it)"
                        @click=${() => this.removeOptionDraft(index)}
                        ?disabled=${this.saving}>
                        Remove
                      </uui-button>
                    </div>
                    <div class="option-draft-values">
                      <div class="option-value-chips">
                        ${this._optionValueNames(opt).map(val => html`<span class="option-value-chip">${val}</span>`)}
                      </div>
                      <p class="no-values-hint">Values are managed in Commerce → Attributes.</p>
                    </div>
                  </div>
                ` : html`
                  <div class="option-draft-card">
                    <div class="option-draft-name-row">
                      <uui-input
                        type="text"
                        placeholder="Attribute name"
                        .value=${opt.name}
                        @input=${(e) => this.handleOptionDraftName(index, e.target.value)}
                        ?disabled=${this.saving}>
                      </uui-input>
                      <uui-button look="secondary" color="danger"
                        @click=${() => this.removeOptionDraft(index)}
                        ?disabled=${this.saving}>
                        Remove
                      </uui-button>
                    </div>

                    <div class="option-draft-values">
                      ${opt.values.length > 0 ? html`
                        <div class="option-value-chips">
                          ${opt.values.map((val, vi) => html`
                            <span class="option-value-chip">
                              ${val}
                              <button class="chip-remove" type="button"
                                @click=${() => this.removeValueFromOptionDraft(index, vi)}
                                ?disabled=${this.saving}>×</button>
                            </span>
                          `)}
                        </div>
                      ` : html`<p class="no-values-hint">No values yet.</p>`}

                      <div class="add-value-row">
                        <uui-input
                          type="text"
                          placeholder="Add a value (e.g., Small)"
                          .value=${this.editOptionsDraftNewValues[index] || ''}
                          @input=${(e) => this.handleOptionDraftNewValue(index, e.target.value)}
                          @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addValueToOptionDraft(index); } }}
                          ?disabled=${this.saving}>
                        </uui-input>
                        <uui-button look="secondary"
                          @click=${() => this.addValueToOptionDraft(index)}
                          ?disabled=${this.saving}>
                          Add Value
                        </uui-button>
                      </div>
                    </div>
                  </div>
                `)}
              </div>
            ` : html`
              <p class="no-options-hint">No attributes configured yet. Add one below.</p>
            `}

            ${this._availableGlobalAttributes(this.editOptionsDraft).length > 0 ? html`
              <div class="add-option-draft-row">
                <select class="variant-status-select"
                  @change=${(e) => { if (e.target.value) { this.addGlobalOptionDraft(e.target.value); e.target.value = ''; } }}
                  ?disabled=${this.saving}>
                  <option value="">+ Add store attribute…</option>
                  ${this._availableGlobalAttributes(this.editOptionsDraft).map(a => html`
                    <option value="${a.id}">${a.name} (${(a.values || []).length} values)</option>
                  `)}
                </select>
              </div>
            ` : ''}

            <div class="add-option-draft-row">
              <uui-input
                type="text"
                placeholder="New local attribute (e.g., Size)"
                .value=${this.editOptionsNewName}
                @input=${(e) => { this.editOptionsNewName = e.target.value; }}
                @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addOptionDraft(); } }}
                ?disabled=${this.saving}>
              </uui-input>
              <uui-button look="secondary" @click=${this.addOptionDraft} ?disabled=${this.saving}>
                Add Local
              </uui-button>
            </div>

            <div class="button-group">
              <uui-button look="secondary" @click=${this.cancelEditOptions} ?disabled=${this.saving}>
                Cancel
              </uui-button>
              <uui-button look="primary" color="positive" @click=${this.saveOptionsUpdate} ?disabled=${this.saving}>
                ${this.saving ? 'Saving...' : 'Save Options'}
              </uui-button>
            </div>

      </div>
    `;
  }

  renderVariantBuilder() {
    const combinations = this.generateVariantCombinations();
    const tooMany = combinations === null;
    const combos = combinations || [];
    const previewBaseSku = (this.newBaseSku || '').trim() || this.editedProduct?.id || 'variant';

    return html`
      <div class="variant-builder-container">

            <div class="variant-builder-header">
              <h4 class="variant-builder-title">Create Product Variants</h4>
              <uui-button look="secondary" @click=${this.cancelCreateVariants} ?disabled=${this.saving}>
                Cancel
              </uui-button>
            </div>

            <p class="variant-builder-intro">
              Define attributes and their values. All combinations are auto-generated as variants.
              The product will be converted to a variant product when saved.
            </p>

            ${this.error ? html`
              <div class="notice notice--error">${this.error}</div>
            ` : ''}

            <!-- Option Types -->
            <div class="builder-section">
              <h5 class="section-heading">Attributes</h5>

              ${this.newVariantOptions.length > 0 ? html`
                <div class="option-types-list">
                  ${this.newVariantOptions.map((opt, index) => html`
                    <div class="option-type-card">
                      <div class="option-type-header">
                        <strong>${opt.name}</strong>
                        ${opt.attributeId ? html`<span class="pill pill--info" title="From the store attribute library">global</span>` : ''}
                        <uui-button look="secondary"
                          @click=${() => this.removeVariantOption(index)}
                          ?disabled=${this.saving}>
                          Remove
                        </uui-button>
                      </div>
                      <div class="option-values-list">
                        ${this._optionValueNames(opt).map(val => html`<span class="option-value-tag">${val}</span>`)}
                      </div>
                    </div>
                  `)}
                </div>
              ` : html`
                <p class="no-options-hint">No attributes yet. Add one below (e.g., Size with values Small, Medium, Large).</p>
              `}

              ${this._availableGlobalAttributes(this.newVariantOptions).length > 0 ? html`
                <div class="add-option-form">
                  <select class="variant-status-select"
                    @change=${(e) => { if (e.target.value) { this.addGlobalVariantOption(e.target.value); e.target.value = ''; } }}
                    ?disabled=${this.saving}>
                    <option value="">+ Add store attribute…</option>
                    ${this._availableGlobalAttributes(this.newVariantOptions).map(a => html`
                      <option value="${a.id}">${a.name} (${(a.values || []).length} values)</option>
                    `)}
                  </select>
                </div>
              ` : ''}

              <!-- Add local option form -->
              <div class="add-option-form">
                <div class="add-option-inputs">
                  <div class="form-group">
                    <uui-label>Attribute Name</uui-label>
                    <uui-input
                      type="text"
                      placeholder="e.g., Size"
                      .value=${this.newOptionName}
                      @input=${(e) => { this.newOptionName = e.target.value; }}
                      @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addVariantOption(); } }}
                      ?disabled=${this.saving}>
                    </uui-input>
                  </div>
                  <div class="form-group">
                    <uui-label>Values (comma-separated)</uui-label>
                    <uui-input
                      type="text"
                      placeholder="e.g., Small, Medium, Large"
                      .value=${this.newOptionValues}
                      @input=${(e) => { this.newOptionValues = e.target.value; }}
                      @keydown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); this.addVariantOption(); } }}
                      ?disabled=${this.saving}>
                    </uui-input>
                  </div>
                </div>
                <uui-button look="secondary" @click=${this.addVariantOption} ?disabled=${this.saving}>
                  Add Attribute
                </uui-button>
              </div>
            </div>

            <!-- Default Values -->
            <div class="builder-section">
              <h5 class="section-heading">Default Values for Generated Variants</h5>
              <div class="default-values-grid">
                <div class="form-group">
                  <uui-label required>Base SKU</uui-label>
                  <uui-input
                    type="text"
                    placeholder="e.g., SHIRT-001"
                    .value=${this.newBaseSku}
                    @input=${(e) => { this.newBaseSku = e.target.value; }}
                    ?disabled=${this.saving}>
                  </uui-input>
                  <small style="color: var(--uui-color-text-alt);">Variant SKU = Base SKU + option values</small>
                </div>
                <div class="form-group">
                  <uui-label required>Default Price</uui-label>
                  <uui-input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    .value=${this.defaultVariantPrice}
                    @input=${(e) => { this.defaultVariantPrice = e.target.value; }}
                    ?disabled=${this.saving}>
                  </uui-input>
                </div>
                <div class="form-group">
                  <uui-label>Default Stock</uui-label>
                  <uui-input
                    type="number"
                    placeholder="0"
                    .value=${this.defaultVariantStock}
                    @input=${(e) => { this.defaultVariantStock = e.target.value; }}
                    ?disabled=${this.saving}>
                  </uui-input>
                </div>
              </div>
            </div>

            <!-- Combinations Preview -->
            ${tooMany ? html`
              <div class="notice notice--warning">
                Too many combinations (over 500) — reduce the number of values, or save and add variants manually.
              </div>
            ` : combos.length > 0 ? html`
              <div class="builder-section">
                <h5 class="section-heading">Preview — ${combos.length} variant${combos.length !== 1 ? 's' : ''} will be created</h5>
                <div class="combinations-table-wrapper">
                  <table class="combinations-table">
                    <thead>
                      <tr>
                        ${this.newVariantOptions.map(opt => html`<th>${opt.name}</th>`)}
                        <th>SKU Preview</th>
                        <th>Price</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${combos.slice(0, 12).map((combo) => html`
                        <tr>
                          ${this.newVariantOptions.map(opt => html`<td>${combo[opt.name]}</td>`)}
                          <td><code class="sku">${previewBaseSku}${Object.keys(combo).length > 0 ? '-' + Object.values(combo).join('-').toLowerCase().replace(/\s+/g, '-') : ''}</code></td>
                          <td>${this.formatPrice(parseFloat(this.defaultVariantPrice || '0'))}</td>
                          <td>${parseInt(this.defaultVariantStock || '0')}</td>
                        </tr>
                      `)}
                      ${combos.length > 12 ? html`
                        <tr>
                          <td colspan="${this.newVariantOptions.length + 3}" class="more-combinations">
                            … and ${combos.length - 12} more variants
                          </td>
                        </tr>
                      ` : ''}
                    </tbody>
                  </table>
                </div>
              </div>
            ` : ''}

            <!-- Builder Action Buttons -->
            <div class="button-group">
              <uui-button
                look="secondary"
                @click=${this.cancelCreateVariants}
                ?disabled=${this.saving}>
                Cancel
              </uui-button>
              <uui-button
                look="primary"
                color="positive"
                @click=${this.saveProductWithVariants}
                ?disabled=${this.saving || tooMany}>
                ${this.saving
                  ? 'Saving...'
                  : `Create ${combos.length} Variant${combos.length !== 1 ? 's' : ''}`}
              </uui-button>
            </div>

      </div>
    `;
  }

  renderProductListPanel() {
    const query = (this.productSearchQuery || '').toLowerCase();
    const filtered = this.products.filter(p =>
      !query || p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query)
    );

    return html`
      <div class="product-list-panel">
        <div class="product-list-header">
          <div class="search-wrap">
            <uui-icon name="icon-search" class="search-icon"></uui-icon>
            <input class="search-input" type="search" placeholder="Search products…"
              .value=${this.productSearchQuery}
              @input=${(e) => { this.productSearchQuery = e.target.value; }}>
          </div>
          ${this._mode !== 'single-product' ? html`
            <uui-button look="primary" label="Create Product" @click=${this.startCreateProduct} class="new-product-btn">
              + Create
            </uui-button>
          ` : ''}
        </div>

        ${filtered.length === 0 ? html`
          <p class="product-list-empty">No products found</p>
        ` : filtered.map(p => this.renderProductListItem(p))}
      </div>
    `;
  }

  renderProductListItem(product) {
    const isSelected = this.selectedProductId === product.id;
    return html`
      <div class="product-list-item ${isSelected ? 'selected' : ''}"
        @click=${() => this.selectProduct(product)}>
        <div class="product-list-item-image">
          ${product.images?.length > 0 ? html`
            <img src="${this._imgSrc(product.images[0])}" alt="${product.name}" class="product-list-thumb" />
          ` : html`
            <div class="product-list-thumb-placeholder">
              <uui-icon name="icon-picture"></uui-icon>
            </div>
          `}
        </div>
        <div class="product-list-item-info">
          <strong class="product-list-item-name">${product.name}</strong>
          <div class="product-list-item-meta">
            ${product.hasVariants
              ? pill(`${product.variants?.length || 0} variants`, 'group')
              : html`<span class="product-list-sku">${product.sku || 'No SKU'}</span>`}
            ${pill(product.status || 'active', (product.status || 'active') === 'active' ? 'active' : 'inactive')}
          </div>
        </div>
      </div>
    `;
  }

  renderProductDetailPanel() {
    if (this.creatingProduct) {
      return html`
        <div class="product-detail-panel">
          ${this.renderCreateProductForm()}
        </div>
      `;
    }

    if (!this.selectedProductId || !this.editedProduct) {
      return html`
        <div class="product-detail-panel product-detail-empty">
          <uui-icon name="icon-box"></uui-icon>
          <p>Select a product from the list to edit it, or click <strong>+ New</strong> to create one.</p>
        </div>
      `;
    }

    if (this.editingOptions) {
      return html`<div class="product-detail-panel">${this.renderOptionsEditor()}</div>`;
    }

    if (this.creatingVariants) {
      return html`<div class="product-detail-panel">${this.renderVariantBuilder()}</div>`;
    }

    return html`
      <div class="product-detail-panel">
        ${this.editedProduct.hasVariants
          ? this.renderVariantProductFields()
          : this.renderSimpleProductFields()}
      </div>
    `;
  }

  renderSimpleProductFields() {
    const product = this.editedProduct;
    const productOptions = Array.isArray(product.customProperties) ? product.customProperties : [];

    return html`
      ${this.saveSuccess ? html`
        <div class="notice notice--success">${this.saveSuccess}</div>
      ` : ''}

      ${this.error ? html`
        <div class="notice notice--error">${this.error}</div>
      ` : ''}


      <h4 class="section-heading">Content</h4>
      <div class="edit-form-grid">

        <div class="form-group">
          <uui-label for="sp-name" required>Name</uui-label>
          <uui-input id="sp-name" .value=${product.name}
            @input=${(e) => this.handleProductInput('name', e.target.value)}
            ?disabled=${this.saving} required>
          </uui-input>
          ${this.validationErrors.name ? html`<small class="error-text">${this.validationErrors.name}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="sp-status">Status</uui-label>
          <select id="sp-status" class="variant-status-select"
            @change=${(e) => this.handleProductInput('status', e.target.value)}
            ?disabled=${this.saving}>
            <option value="active" ?selected=${product.status === 'active'}>Active</option>
            <option value="inactive" ?selected=${product.status === 'inactive'}>Inactive</option>
            <option value="draft" ?selected=${product.status === 'draft'}>Draft</option>
          </select>
        </div>

        <div class="form-group">
          <uui-label for="sp-price" required>Price</uui-label>
          <uui-input id="sp-price" type="number" step="0.01"
            .value=${String(product.price || '')}
            @input=${(e) => this.handleProductInput('price', parseFloat(e.target.value))}
            ?disabled=${this.saving} required>
          </uui-input>
          ${this.validationErrors.price ? html`<small class="error-text">${this.validationErrors.price}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="sp-sale-price">Sale Price</uui-label>
          <uui-input id="sp-sale-price" type="number" step="0.01"
            .value=${String(product.salePrice ?? '')}
            @input=${(e) => this.handleProductInput('salePrice', e.target.value ? parseFloat(e.target.value) : null)}
            ?disabled=${this.saving}
            placeholder="Leave blank if not on sale">
          </uui-input>
        </div>

        <div class="form-group">
          <uui-label for="sp-stock" required>Stock Quantity</uui-label>
          <uui-input id="sp-stock" type="number" min="0"
            .value=${String(product.stockQuantity ?? '')}
            @input=${(e) => this.handleProductInput('stockQuantity', parseInt(e.target.value))}
            ?disabled=${this.saving} required>
          </uui-input>
          ${this.validationErrors.stockQuantity ? html`<small class="error-text">${this.validationErrors.stockQuantity}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="sp-sku">SKU</uui-label>
          <uui-input id="sp-sku" type="text"
            .value=${product.sku || ''}
            @input=${(e) => this.handleProductInput('sku', e.target.value)}
            ?disabled=${this.saving}>
          </uui-input>
        </div>

        <div class="form-group full-width">
          <uui-label for="sp-description">Description</uui-label>
          <textarea id="sp-description" class="description-textarea"
            .value=${product.description || ''}
            @input=${(e) => this.handleProductInput('description', e.target.value)}
            ?disabled=${this.saving} rows="3"
            placeholder="Product description..."></textarea>
        </div>

        <div class="form-group full-width">
          ${this.renderStringListEditor('editedProduct', 'highlights', 'Highlights',
            'Short bullet points shown on the product page.', '+ Highlight', 'No highlights yet.', this.saving)}
        </div>

        <div class="form-group full-width">
          <uui-label>Images</uui-label>
          ${this.renderImageGallery(
            product.images || [],
            (imgs) => { this.editedProduct = { ...this.editedProduct, images: imgs }; },
            'edit'
          )}
        </div>
      </div>

      <h4 class="section-heading">Leasing &amp; Visibility</h4>
      <div class="edit-form-grid">
        <div class="form-group">
          <uui-label for="sp-leasing">Leasing Factor</uui-label>
          <uui-input id="sp-leasing" type="number" step="0.0001"
            .value=${String(product.leasingFactor ?? '')}
            @input=${(e) => this.handleProductInput('leasingFactor', e.target.value ? parseFloat(e.target.value) : null)}
            ?disabled=${this.saving} placeholder="e.g. 0.0285">
          </uui-input>
          <small class="field-hint">Monthly price = Price × Leasing Factor. Leave blank to hide leasing option.</small>
        </div>

        <div class="form-group">
          <uui-label for="sp-hide-price">Hide Price</uui-label>
          <div style="display:flex;align-items:center;gap:0.5rem;padding-top:0.25rem;">
            <input id="sp-hide-price" type="checkbox"
              style="width:1rem;height:1rem;cursor:pointer;"
              .checked=${product.hidePrice || false}
              @change=${(e) => this.handleProductInput('hidePrice', e.target.checked)}
              ?disabled=${this.saving}>
            <small>Replace price with a custom message (enquiry-only products)</small>
          </div>
        </div>

        ${product.hidePrice ? html`
          <div class="form-group full-width">
            <uui-label for="sp-hidden-price-desc">Hidden Price Message</uui-label>
            <uui-input id="sp-hidden-price-desc" type="text"
              .value=${product.hiddenPriceDescription || ''}
              @input=${(e) => this.handleProductInput('hiddenPriceDescription', e.target.value)}
              ?disabled=${this.saving}
              placeholder="e.g. Price on request — contact us">
            </uui-input>
          </div>
        ` : ''}
      </div>

      <div class="version-info">
        <small>
          <strong>Version:</strong> ${product.version || 1} |
          <strong>Last Updated:</strong> ${this.formatDate(product.updatedAt)} |
          <strong>Updated By:</strong> ${product.versionCreatedBy || 'System'}
        </small>
      </div>

      <div class="button-group">
        <uui-button look="secondary" @click=${this.cancelEdit} ?disabled=${this.saving}>
          Close
        </uui-button>
        <uui-button look="primary" color="positive" @click=${this.saveProduct} ?disabled=${this.saving}>
          ${this.saving ? 'Saving...' : 'Save Changes'}
        </uui-button>
        <span class="button-group-separator"></span>
        <uui-button look="secondary" color="danger" label="Delete Product" ?disabled=${this.saving}
          @click=${() => this._confirmDeleteProduct(product)}>
          Delete Product
        </uui-button>
      </div>
    `;
  }

  renderVariantProductFields() {
    const product = this.editedProduct;
    const productOptions = Array.isArray(product.customProperties) ? product.customProperties : [];

    return html`
      ${this.saveSuccess ? html`
        <div class="notice notice--success">${this.saveSuccess}</div>
      ` : ''}

      ${this.error ? html`
        <div class="notice notice--error">${this.error}</div>
      ` : ''}


      <h4 class="section-heading">Product</h4>
      <div class="edit-form-grid">
        <div class="form-group">
          <uui-label for="vp-name" required>Name</uui-label>
          <uui-input id="vp-name" .value=${product.name}
            @input=${(e) => this.handleProductInput('name', e.target.value)}
            ?disabled=${this.saving} required>
          </uui-input>
          ${this.validationErrors.name ? html`<small class="error-text">${this.validationErrors.name}</small>` : ''}
        </div>

        <div class="form-group">
          <uui-label for="vp-status">Status</uui-label>
          <select id="vp-status" class="variant-status-select"
            @change=${(e) => this.handleProductInput('status', e.target.value)}
            ?disabled=${this.saving}>
            <option value="active" ?selected=${product.status === 'active'}>Active</option>
            <option value="inactive" ?selected=${product.status === 'inactive'}>Inactive</option>
            <option value="draft" ?selected=${product.status === 'draft'}>Draft</option>
          </select>
        </div>

        <div class="form-group full-width">
          <uui-label for="vp-description">Description</uui-label>
          <textarea id="vp-description" class="description-textarea"
            .value=${product.description || ''}
            @input=${(e) => this.handleProductInput('description', e.target.value)}
            ?disabled=${this.saving} rows="3"
            placeholder="Product description..."></textarea>
        </div>

        <div class="form-group full-width">
          ${this.renderStringListEditor('editedProduct', 'highlights', 'Highlights',
            'Short bullet points shown on the product page.', '+ Highlight', 'No highlights yet.', this.saving)}
        </div>

        <div class="form-group full-width">
          <uui-label>Images</uui-label>
          ${this.renderImageGallery(
            product.images || [],
            (imgs) => { this.editedProduct = { ...this.editedProduct, images: imgs }; },
            'edit'
          )}
        </div>
      </div>

      <div class="version-info">
        <small>
          <strong>Version:</strong> ${product.version || 1} |
          <strong>Last Updated:</strong> ${this.formatDate(product.updatedAt)} |
          <strong>Updated By:</strong> ${product.versionCreatedBy || 'System'}
        </small>
      </div>

      <div class="button-group">
        <uui-button look="secondary" @click=${this.cancelEdit} ?disabled=${this.saving}>
          Close
        </uui-button>
        <uui-button look="secondary" @click=${this.startEditOptions} ?disabled=${this.saving}>
          Attributes
        </uui-button>
        <uui-button look="primary" color="positive" @click=${this.saveProduct} ?disabled=${this.saving}>
          ${this.saving ? 'Saving...' : 'Save Changes'}
        </uui-button>
        <span class="button-group-separator"></span>
        <uui-button look="secondary" color="danger" label="Delete Product" ?disabled=${this.saving}
          @click=${() => this._confirmDeleteProduct(product)}>
          Delete Product
        </uui-button>
      </div>

      ${this.renderVariantTable()}
    `;
  }

  renderVariantTable() {
    const allVariants = this.editedProduct?.variants || [];
    const q = (this.variantSearchQuery || '').toLowerCase();
    const filtered = allVariants.filter(v => {
      if (!q) return true;
      const optionStr = Object.values(v.options || {}).join(' ').toLowerCase();
      return v.sku?.toLowerCase().includes(q) || optionStr.includes(q);
    });

    const variantOptions = this.editedProduct?.variantOptions || [];
    const optionNames = variantOptions.map(o => o.name);

    return html`
      <div class="variant-table-section">
        <div class="variant-table-header">
          <h4 class="section-heading">Variants (${allVariants.length})</h4>
          <div class="variant-table-actions">
            <uui-input type="text" placeholder="Search variants..."
              .value=${this.variantSearchQuery}
              @input=${(e) => { this.variantSearchQuery = e.target.value; }}
              class="variant-search-input">
            </uui-input>
            ${!this.addingVariant ? html`
              <uui-button look="secondary" color="positive" @click=${this.startAddVariant} ?disabled=${this.saving}>
                + Add Variant
              </uui-button>
            ` : ''}
          </div>
        </div>

        ${this.addingVariant ? html`
          <div class="variant-add-inline">
            ${this.renderAddVariantForm()}
          </div>
        ` : ''}

        ${filtered.length === 0 ? html`
          <p class="no-variants-hint">${allVariants.length === 0 ? 'No variants yet.' : 'No variants match your search.'}</p>
        ` : html`
          <div class="variants-table-wrapper">
            <table class="variants-table">
              <thead>
                <tr>
                  ${optionNames.map(name => html`<th>${name}</th>`)}
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(v => this.renderVariantTableRow(v, optionNames))}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  renderVariantTableRow(variant, optionNames) {
    const isEditing = this.editedVariantId === variant.id;
    const totalCols = optionNames.length + 5;
    return html`
      <tr class="variant-table-row ${isEditing ? 'variant-table-row-active' : ''}"
        @click=${() => this.toggleVariantEdit(variant)}>
        ${optionNames.map(name => html`<td>${variant.options?.[name] || '—'}</td>`)}
        <td><code class="sku">${variant.sku || '—'}</code></td>
        <td>${this.formatPrice(variant.price)}</td>
        <td>
          <span class="${(variant.stockQuantity ?? 0) > 0 ? 'tag-positive' : 'tag-danger'} variant-tag">
            ${Number.isFinite(variant.stockQuantity) ? variant.stockQuantity : '—'}
          </span>
        </td>
        <td>
          <span class="${variant.status === 'active' ? 'tag-positive' : 'tag-default'} variant-tag">
            ${variant.status || 'active'}
          </span>
        </td>
        <td class="variant-expand-cell">
          <uui-icon name="${isEditing ? 'icon-collapse' : 'icon-expand'}"></uui-icon>
        </td>
      </tr>
      ${isEditing ? html`
        <tr class="variant-edit-inline-row">
          <td colspan="${totalCols}" @click=${(e) => e.stopPropagation()}>
            <div class="variant-edit-inline-content">
              ${this.renderVariantEditForm(variant)}
            </div>
          </td>
        </tr>
      ` : ''}
    `;
  }

  // Price currency comes from the market (single currency per market), read off the loaded products
  // / edited product rather than hardcoding $.
  formatPrice(n) {
    const code = this.products?.find(p => p.currency)?.currency || this.editedProduct?.currency || 'USD';
    const locale = { SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK', EUR: 'de-DE', GBP: 'en-GB', USD: 'en-US' }[code] || 'en-US';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(n || 0);
    } catch {
      return `${code} ${(n || 0).toFixed(2)}`;
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="workspace-panel">${loadingState('Loading products…')}</div>`;
    }

    if (!this.categoryId && this._mode !== 'single-product') {
      return html`
        <div class="workspace-panel">
          ${stateCenter(html`
            <uui-icon name="icon-info" class="state-icon"></uui-icon>
            <h3>No product selected</h3>
            <p>To edit product data from the eCommerce API, pick a product first.</p>
            <ol class="state-steps">
              <li>Go to the <strong>Content</strong> tab</li>
              <li>Find the <strong>Product</strong> property</li>
              <li>Select a product from the picker</li>
              <li>Save the document</li>
              <li>Return to this tab to edit the product</li>
            </ol>`)}
        </div>
      `;
    }

    if (this.error && !this.selectedProductId && !this.creatingProduct) {
      return html`
        <div class="workspace-panel">
          ${stateCenter(html`
            <uui-icon name="icon-alert" class="state-icon state-icon--danger"></uui-icon>
            <h3>Error loading products</h3>
            <p>${this.error}</p>
            <uui-button look="outline" label="Retry" @click=${() => this._refreshView()}>
              <uui-icon name="icon-refresh"></uui-icon>Retry
            </uui-button>`)}
        </div>
      `;
    }

    if (this.products.length === 0 && !this.creatingProduct) {
      return html`
        <div class="workspace-panel">
          ${stateCenter(html`
            <uui-icon name="icon-box" class="state-icon"></uui-icon>
            <h3>No products found</h3>
            <p>This category doesn't have any products yet.</p>
            <uui-button look="primary" label="Create Product" @click=${this.startCreateProduct}>
              + Create Product
            </uui-button>`)}
        </div>
      `;
    }

    return html`
      <div class="workspace-panel">
        <div class="view-header">
          <h2 class="view-title">Products (${this.products.length})</h2>
        </div>
        <div class="split-panel-layout">
          ${this.renderProductListPanel()}
          ${this.renderProductDetailPanel()}
        </div>
      </div>
      ${this.renderProviderBrowser()}
    `;
  }

  // Kit first, then this editor's own layout (split panels, variant tables, image gallery).
  // See umbraco/docs/DESIGN-SYSTEM.md.
  static styles = [commerceStyles, css`
    .provider-upload-toggle {
      display: block;
      margin-top: var(--uui-size-space-2);
    }

    .provider-photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--uui-size-space-3);
      overflow-y: auto;
      flex: 1;
    }

    .provider-photo-item {
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      padding: var(--uui-size-space-2);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--uui-size-space-1);
    }

    .provider-photo-item:hover {
      border-color: var(--uui-color-selected);
      background: var(--uui-color-surface-alt);
    }

    .provider-photo-item img {
      width: 100%;
      height: 100px;
      object-fit: contain;
    }

    .provider-photo-name {
      font-size: var(--uui-size-4);
      color: var(--uui-color-text-alt);
      word-break: break-all;
      max-width: 100%;
    }

    .provider-browser-footer {
      display: flex;
      justify-content: center;
      padding-top: var(--uui-size-space-4);
    }

    :host {
      display: block;
      padding: var(--uui-size-space-5);
      overflow: visible;
    }

    /* The workspace equivalent of a view: a surface card inside Umbraco's content editor. */
    .workspace-panel {
      background: var(--ec-surface);
      border: 1px solid var(--ec-border);
      border-radius: var(--ec-radius-lg);
      overflow: visible;
    }
    .workspace-panel .view-header { background: none; padding: 16px 20px 0; }
    .workspace-panel .state-center h3 { margin: 0; color: var(--ec-text); }
    .state-icon--danger { color: var(--uui-color-danger); opacity: 0.6; }
    .state-steps { text-align: left; color: var(--ec-text-alt); font-size: 0.84rem; margin: 0; }

    .info-state h3,
    .error-state h3,
    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .info-state p,
    .error-state p,
    .empty-state p {
      margin: 0 0 var(--uui-size-space-3) 0;
      color: var(--uui-color-text-alt);
    }

    .info-state ol {
      text-align: left;
      margin: var(--uui-size-space-3) 0;
      padding-left: var(--uui-size-space-5);
    }

    .info-state li {
      margin-bottom: var(--uui-size-space-2);
    }

    .error-state uui-button {
      margin-top: var(--uui-size-space-3);
    }

    .empty-state small {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
    }

    .description {
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    uui-table {
      width: 100%;
    }

    .product-thumbnail {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .no-image-icon {
      font-size: 32px;
      color: var(--uui-color-text-alt);
    }

    .product-description {
      font-size: var(--uui-size-4);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .slug {
      font-family: monospace;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface-alt);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .sku {
      font-family: monospace;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface-alt);
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--uui-color-border);
      display: inline-block;
    }

    .price {
      font-weight: 500;
    }

    .product-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .product-row:hover {
      background-color: var(--uui-color-surface-alt);
    }

    .product-row.expanded {
      background-color: var(--uui-color-surface-alt);
      box-shadow: inset 0 0 0 1px var(--uui-color-border);
    }

    .edit-form-row {
      background-color: var(--uui-color-surface);
    }

    .edit-form-container {
      padding: var(--uui-size-space-5);
      border-top: 1px solid var(--uui-color-border);
    }

    .edit-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .edit-form-grid .form-group {
      display: flex;
      flex-direction: column;
    }

    .edit-form-grid .form-group.full-width {
      grid-column: 1 / -1;
    }

    .edit-form-grid uui-label {
      margin-bottom: var(--uui-size-space-1);
    }

    .edit-form-grid uui-input,
    .edit-form-grid uui-select {
      width: 100%;
    }

    .description-textarea {
      width: 100%;
      padding: var(--uui-size-space-2);
      font-family: inherit;
      font-size: var(--uui-size-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      resize: vertical;
    }

    .description-textarea:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .error-text {
      color: var(--uui-color-danger);
      font-size: var(--uui-size-3);
      margin-top: var(--uui-size-space-1);
    }

    .field-hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-3);
      margin-top: var(--uui-size-space-1);
      display: block;
    }

    /* Repeatable string-list editor (Highlights, Free options content) */
    .string-list-editor .sle-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
    }
    .string-list-editor .sle-header strong {
      font-size: var(--uui-size-5);
    }
    .string-list-editor .sle-rows {
      margin-top: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }
    .string-list-editor .sle-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }
    .string-list-editor .sle-bullet {
      color: var(--uui-color-text-alt);
    }
    .string-list-editor .sle-input {
      flex: 1;
      min-width: 0;
    }
    .string-list-editor .sle-remove {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--uui-color-danger);
      font-size: var(--uui-size-5);
      padding: 0 var(--uui-size-space-2);
    }
    .string-list-editor .sle-remove:hover {
      color: var(--uui-color-danger-emphasis);
    }
    .string-list-editor .sle-empty {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin-top: var(--uui-size-space-2);
    }

    .version-info {
      margin: var(--uui-size-space-4) 0;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .version-info small {
      color: var(--uui-color-text-alt);
    }

    .save-success,
    .save-error {
      margin-bottom: var(--uui-size-space-4);
    }

    /* Variant styles */
    .variants-section-row {
      background-color: var(--uui-color-surface);
    }

    .variants-container {
      padding: var(--uui-size-space-5);
      border-top: 1px solid var(--uui-color-border);
    }

    .variants-container h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .variant-info {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .variants-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .variant-row {
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .variant-row:hover {
      background: var(--uui-color-surface);
    }

    .variant-row.editing {
      background: var(--uui-color-surface-alt);
      border-color: var(--uui-color-border);
      box-shadow: inset 0 0 0 1px var(--uui-color-border);
    }

    .variant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .variant-options {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .variant-options uui-icon {
      color: var(--uui-color-text-alt);
    }

    .variant-header-sku {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
    }

    .variant-header-sku code {
      font-family: monospace;
      background: var(--uui-color-surface);
      padding: 1px 5px;
      border-radius: 3px;
    }

    .variant-summary {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .variant-sku {
      font-family: monospace;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .variant-price {
      font-weight: 500;
    }

    .variant-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: var(--uui-size-4);
      font-weight: 500;
      border: 1px solid currentColor;
    }

    .tag-positive {
      color: var(--uui-color-positive);
      background: color-mix(in srgb, var(--uui-color-positive) 10%, transparent);
    }

    .tag-danger {
      color: var(--uui-color-danger);
      background: color-mix(in srgb, var(--uui-color-danger) 10%, transparent);
    }

    .tag-default {
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
    }

    .variant-edit-form {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .attributes-section {
      margin-bottom: var(--uui-size-space-5);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .section-heading {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: var(--uui-size-5);
      font-weight: 600;
      color: var(--uui-color-text);
    }

    .attributes-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: var(--uui-size-space-2) var(--uui-size-space-6);
      align-items: baseline;
    }

    .attribute-label {
      font-weight: 500;
      color: var(--uui-color-text);
    }

    .attribute-value {
      color: var(--uui-color-text-alt);
    }

    .custom-props-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .custom-prop-row {
      display: grid;
      grid-template-columns: minmax(8rem, 12rem) 1fr auto;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .custom-prop-row .attribute-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .custom-prop-row .cp-name,
    .custom-prop-row .cp-value {
      width: 100%;
    }

    .variant-status-select {
      width: 100%;
      padding: var(--uui-size-space-2);
      font-family: inherit;
      font-size: var(--uui-size-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
    }

    .variant-status-select:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .variant-status-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Button group shared across all panels */
    .button-group {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
      margin-top: var(--uui-size-space-4);
    }

    .button-group-separator {
      flex: 1;
    }

    .inline-confirm {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .inline-confirm small {
      color: var(--uui-color-danger);
      font-weight: 500;
      white-space: nowrap;
    }

    /* Form group layout for variant builder inputs */
    .add-option-inputs .form-group,
    .default-values-grid .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .add-option-inputs uui-input,
    .default-values-grid uui-input {
      width: 100%;
    }

    /* Variant builder */
    .variant-builder-row {
      background-color: var(--uui-color-surface);
    }

    .variant-builder-container {
      padding: var(--uui-size-space-5);
      border-top: 2px solid var(--uui-color-selected);
    }

    .variant-builder-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--uui-size-space-3);
    }

    .variant-builder-title {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin: 0;
      font-size: var(--uui-size-5);
      font-weight: 600;
    }

    .variant-builder-intro {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .builder-section {
      margin-bottom: var(--uui-size-space-5);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .no-options-hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      margin-bottom: var(--uui-size-space-3);
    }

    .option-types-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .option-type-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .option-type-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--uui-size-space-2);
    }

    .option-values-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .option-value-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: var(--uui-size-4);
      background: color-mix(in srgb, var(--uui-color-selected) 15%, transparent);
      color: var(--uui-color-selected-contrast);
      border: 1px solid color-mix(in srgb, var(--uui-color-selected) 40%, transparent);
    }

    .add-option-form {
      border-top: 1px dashed var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .add-option-inputs {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: var(--uui-size-space-3);
    }

    .default-values-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: var(--uui-size-space-4);
    }

    .combinations-table-wrapper {
      overflow-x: auto;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .combinations-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface);
    }

    .combinations-table th {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid var(--uui-color-border);
      white-space: nowrap;
    }

    .combinations-table td {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .combinations-table tbody tr:last-child td {
      border-bottom: none;
    }

    .combinations-table tbody tr:hover td {
      background: var(--uui-color-surface-alt);
    }

    .more-combinations {
      text-align: center;
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .product-actions {
      margin-bottom: var(--uui-size-space-4);
    }

    .create-product-form {
      margin-bottom: var(--uui-size-space-5);
      padding: var(--uui-size-space-5);
      background: var(--uui-color-surface-alt);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      border-left: 3px solid var(--uui-color-selected);
    }

    .create-product-form .section-heading {
      margin-bottom: var(--uui-size-space-4);
    }

    .product-type-cards {
      display: flex;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-5);
    }

    .product-type-card {
      flex: 1;
      padding: var(--uui-size-space-5);
      border: 2px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
      background: var(--uui-color-surface);
      transition: border-color 0.15s, box-shadow 0.15s;
      text-align: center;
    }

    .product-type-card:hover {
      border-color: var(--uui-color-selected);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .product-type-card-icon {
      font-size: 2rem;
      margin-bottom: var(--uui-size-space-3);
    }

    .product-type-card strong {
      display: block;
      font-size: 1rem;
      margin-bottom: var(--uui-size-space-2);
      color: var(--uui-color-text);
    }

    .product-type-card p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--uui-color-text-alt);
    }

    /* Image gallery */
    .images-section {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .external-images {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .ext-label {
      font-size: 0.8rem;
      color: var(--uui-color-text-alt);
    }

    .ext-alt {
      width: 100%;
      margin-top: var(--uui-size-space-1);
    }

    .images-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-3);
    }

    .image-item {
      position: relative;
      width: 96px;
      height: 96px;
      border-radius: var(--uui-border-radius);
      overflow: visible;
    }

    .image-preview {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
      display: block;
    }

    .image-error-placeholder {
      width: 96px;
      height: 96px;
      border-radius: var(--uui-border-radius);
      border: 1px dashed var(--uui-color-border);
      background: var(--uui-color-surface-alt);
      align-items: center;
      justify-content: center;
      color: var(--uui-color-text-alt);
      font-size: 24px;
    }

    .image-remove-btn {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--uui-color-danger);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      padding: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      z-index: 1;
    }

    .image-remove-btn:hover {
      background: color-mix(in srgb, var(--uui-color-danger) 75%, black);
    }

    .image-index {
      position: absolute;
      bottom: 4px;
      left: 4px;
      background: rgba(0,0,0,0.55);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 3px;
      line-height: 1.4;
    }

    .no-images-hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      font-size: var(--uui-size-4);
      margin: 0;
    }

    .add-image-row {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .add-image-row uui-input {
      flex: 1;
    }

    .image-upload-actions {
      display: flex;
      gap: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .image-uploading-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
      padding: var(--uui-size-space-2) 0;
    }

    .add-variant-form {
      margin: var(--uui-size-space-4) 0;
      padding: var(--uui-size-space-4);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-left: 3px solid var(--uui-color-positive);
      border-radius: var(--uui-border-radius);
    }

    .add-variant-form .section-heading {
      margin-bottom: var(--uui-size-space-3);
    }

    /* Variant options configuration in create product form */
    .variant-options-hint {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .new-product-option-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .new-product-option-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .new-product-option-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: var(--uui-size-space-2);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .option-tag-remove {
      padding: 2px 8px;
      font-size: var(--uui-size-4);
      background: none;
      border: 1px solid var(--uui-color-danger);
      color: var(--uui-color-danger);
      border-radius: var(--uui-border-radius);
      cursor: pointer;
    }

    .option-tag-remove:hover:not(:disabled) {
      background: var(--uui-color-danger);
      color: white;
    }

    .add-option-card {
      border-top: 1px dashed var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .add-option-name-row {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .add-option-name-row uui-input {
      flex: 1;
    }

    /* Options editor panel */
    .options-editor-container {
      padding: var(--uui-size-space-5);
      border-top: 2px solid var(--uui-color-selected);
    }

    .options-editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--uui-size-space-3);
    }

    .options-editor-title {
      margin: 0;
      font-size: var(--uui-size-5);
      font-weight: 600;
    }

    .options-editor-intro {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    /* Shared value chip styles (used in create product form + Variant Options panel) */
    .option-value-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2);
    }

    .option-value-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px 2px 10px;
      border-radius: 20px;
      background: color-mix(in srgb, var(--uui-color-selected) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--uui-color-selected) 40%, transparent);
      font-size: var(--uui-size-4);
    }

    .chip-remove {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: none;
      color: var(--uui-color-text-alt);
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      padding: 0;
      line-height: 1;
    }

    .chip-remove:hover:not(:disabled) {
      background: var(--uui-color-danger);
      color: white;
    }

    .no-values-hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      font-size: var(--uui-size-4);
      margin: 0;
    }

    .add-value-row {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .add-value-row uui-input {
      flex: 1;
    }

    /* Variant Options panel */
    .options-draft-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .option-draft-card {
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .option-draft-name-row {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .option-draft-name-row uui-input {
      flex: 1;
    }

    /* Right-align Remove. On the local card the flex:1 input already absorbs the space, so this
       only matters for the global card (name + pill, both intrinsically sized). */
    .option-draft-name-row uui-button {
      margin-left: auto;
    }

    .option-draft-values {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-2);
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .add-option-draft-row {
      display: flex;
      gap: var(--uui-size-space-3);
      align-items: center;
      border-top: 1px dashed var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-2);
    }

    .add-option-draft-row uui-input {
      flex: 1;
    }

    /* Split-panel layout */
    .split-panel-layout {
      display: flex;
      min-height: 500px;
      gap: 0;
    }

    .product-list-panel {
      width: 280px;
      min-width: 220px;
      border-right: 1px solid var(--uui-color-border);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .product-list-header {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
      align-items: center;
    }

    .product-search-input {
      flex: 1;
      min-width: 0;
    }

    .new-product-btn {
      flex-shrink: 0;
    }

    .product-list-empty {
      color: var(--uui-color-text-alt);
      font-style: italic;
      font-size: var(--uui-size-4);
      padding: var(--uui-size-space-4);
      text-align: center;
      margin: 0;
    }

    .product-list-item {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-3) var(--uui-size-space-3);
      cursor: pointer;
      border-bottom: 1px solid var(--uui-color-border);
      transition: background 0.15s;
    }

    .product-list-item:hover {
      background: var(--uui-color-surface-alt);
    }

    .product-list-item.selected {
      background: color-mix(in srgb, var(--uui-color-selected) 12%, transparent);
      border-left: 3px solid var(--uui-color-selected);
    }

    .product-list-item-image {
      flex-shrink: 0;
    }

    .product-list-thumb {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
      display: block;
    }

    .product-list-thumb-placeholder {
      width: 40px;
      height: 40px;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--uui-color-text-alt);
      font-size: 18px;
    }

    .product-list-item-info {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .product-list-item-name {
      display: block;
      font-size: var(--uui-size-4);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-list-item-meta {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-top: 2px;
    }

    .variant-count-badge {
      font-size: var(--uui-size-3);
      background: color-mix(in srgb, var(--uui-color-selected) 15%, transparent);
      color: var(--uui-color-selected-contrast);
      border: 1px solid color-mix(in srgb, var(--uui-color-selected) 40%, transparent);
      padding: 1px 6px;
      border-radius: 20px;
    }

    .product-list-sku {
      font-size: var(--uui-size-3);
      font-family: monospace;
      color: var(--uui-color-text-alt);
    }

    .product-list-status {
      font-size: var(--uui-size-3);
      padding: 1px 6px;
      border-radius: 20px;
      border: 1px solid currentColor;
    }

    .product-list-status.status-active {
      color: var(--uui-color-positive);
      background: color-mix(in srgb, var(--uui-color-positive) 10%, transparent);
    }

    .product-list-status.status-inactive,
    .product-list-status.status-draft {
      color: var(--uui-color-text-alt);
      background: var(--uui-color-surface-alt);
    }

    .product-detail-panel {
      flex: 1;
      overflow-y: auto;
      padding: var(--uui-size-space-5);
      min-width: 0;
    }

    .product-detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
      text-align: center;
    }

    .product-detail-empty uui-icon {
      font-size: 48px;
    }

    .product-detail-empty p {
      margin: 0;
      font-size: var(--uui-size-4);
    }

    /* Variant table in detail panel */
    .variant-table-section {
      margin-top: var(--uui-size-space-5);
      border-top: 2px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .variant-table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
      flex-wrap: wrap;
    }

    .variant-table-actions {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .variant-search-input {
      width: 180px;
    }

    .variant-add-inline {
      margin-bottom: var(--uui-size-space-4);
    }

    .no-variants-hint {
      color: var(--uui-color-text-alt);
      font-style: italic;
      font-size: var(--uui-size-4);
      margin: var(--uui-size-space-3) 0;
    }

    .variants-table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
    }

    .variants-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface);
    }

    .variants-table th {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid var(--uui-color-border);
      white-space: nowrap;
    }

    .variants-table td {
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
      vertical-align: middle;
    }

    .variants-table tbody tr:last-child td {
      border-bottom: none;
    }

    .variant-table-row {
      cursor: pointer;
      transition: background 0.15s;
    }

    .variant-table-row:hover td {
      background: var(--uui-color-surface-alt);
    }

    .variant-table-row-active td {
      background: color-mix(in srgb, var(--uui-color-selected) 8%, transparent);
    }

    .variant-expand-cell {
      text-align: center;
      color: var(--uui-color-text-alt);
      width: 32px;
    }

    .variant-edit-inline-row td {
      padding: 0;
      background: var(--uui-color-surface-alt);
    }

    .variant-edit-inline-content {
      padding: var(--uui-size-space-4);
      border-top: 2px solid var(--uui-color-selected);
    }
  `];
}

customElements.define('ecomm-products-workspace-view', ECommProductsWorkspaceView);

export default ECommProductsWorkspaceView;
