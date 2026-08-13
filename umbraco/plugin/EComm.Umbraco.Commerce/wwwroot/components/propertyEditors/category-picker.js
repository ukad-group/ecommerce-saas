import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
// The shared design kit — see umbraco/docs/DESIGN-SYSTEM.md before adding UI here.
import { commerceStyles, modalShell, modalActions, formRow } from '../shared/commerce-ui.js';
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';

class ECommCategoryPicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: String },
    categories: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
    storeId: { type: String },
    _showCreate: { type: Boolean, state: true },
    _newName: { type: String, state: true },
    _creating: { type: Boolean, state: true },
    _createError: { type: String, state: true }
  };

  constructor() {
    super();
    this.value = '';
    this.categories = [];
    this.loading = true;
    this.error = null;
    this.storeId = '';
    this.storeIdPropertyAlias = 'storeId';
    this._storeResolveSeq = 0;
    this._showCreate = false;
    this._newName = '';
    this._creating = false;
    this._createError = null;

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (workspaceContext) => {
      this._workspaceContext = workspaceContext;
      // Don't rely solely on connectedCallback() ordering - re-resolve once the workspace
      // context is actually available so getUnique() has something to return.
      this.resolveStoreIdAndReload();
    });

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
      // Re-resolve now that authenticated fetches are possible - the effective-store lookup
      // triggered from connectedCallback()/the workspace context above may have fired before
      // auth was ready and silently no-op'd (unauthenticated fetch -> null), with no other
      // trigger to retry it for a category that has no storeId property of its own.
      this.resolveStoreIdAndReload();

      // Load the configurable alias first, then watch that property on the document so
      // categories reload when the store/market picker changes - mirrors how
      // categoryIdPropertyAlias is configurable in Commerce Settings.
      this.loadStoreIdPropertyAlias().then(() => {
        this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, async (datasetContext) => {
          this.observe(
            await datasetContext.propertyValueByAlias(this.storeIdPropertyAlias),
            (value) => {
              if (value !== this._ownStoreId) {
                this._ownStoreId = value || '';
                this.resolveStoreIdAndReload();
              }
            }
          );
        });
      });
    });
  }

  // Own node has no store set - walk up the ancestor chain (e.g. the shop root) so a
  // store set once higher in the tree still scopes this node's category dropdown.
  //
  // The seq token guards against an in-flight ancestor lookup (started while the node had
  // no store of its own) clobbering a store the user explicitly picks before that lookup
  // resolves - without it the slower ancestor fetch wins the race and silently reverts the
  // just-selected store.
  async resolveStoreIdAndReload() {
    const seq = ++this._storeResolveSeq;
    this.storeId = this._ownStoreId;

    if (!this.storeId) {
      const nodeKey = this._workspaceContext?.getUnique?.();
      if (nodeKey) {
        const inherited = await this.fetchEffectiveStoreId(nodeKey);
        if (seq !== this._storeResolveSeq) return; // superseded by a newer resolution
        this.storeId = inherited;
      }
    }

    this.loadCategories();
  }

  async fetchEffectiveStoreId(nodeKey) {
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

  async loadStoreIdPropertyAlias() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/settings/defaults', {
        headers, credentials: 'include'
      });
      if (response.ok) {
        const defaults = await response.json();
        this.storeIdPropertyAlias = defaults?.storeIdPropertyAlias || 'storeId';
      }
    } catch (err) {
      console.error('Failed to load default aliases:', err);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Go through the ancestor-aware resolver, not a raw loadCategories() - a category with no
    // storeId property of its own (relying purely on inheritance from a parent/root) never fires
    // the sibling-property observer below, so this is the only chance to resolve it on load.
    this.resolveStoreIdAndReload();
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async loadCategories() {
    this.loading = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const qs = this.storeId ? `?marketId=${encodeURIComponent(this.storeId)}` : '';
      const response = await fetch(`/umbraco/management/api/ecomm-commerce/categories${qs}`, {
        headers, credentials: 'include'
      });

      if (response.ok) {
        this.categories = await response.json();
      } else {
        this.error = 'Failed to load categories. Please check your Commerce Settings.';
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      this.error = 'Failed to load categories: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  handleChange(e) {
    this.selectCategory(e.target.value);
  }

  selectCategory(categoryId) {
    this.value = categoryId;
    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this.value }, bubbles: true, composed: true
    }));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value }, bubbles: true, composed: true
    }));
  }

  openCreate() {
    this._newName = '';
    this._createError = null;
    this._showCreate = true;
  }

  async submitCreate() {
    const name = this._newName.trim();
    if (!name) { this._createError = 'Name is required.'; return; }

    this._creating = true;
    this._createError = null;
    try {
      // Make sure the market is resolved before creating. If a create fires before the async
      // effective-store lookup has settled, this.storeId is still empty and the category lands
      // in the settings-default market — then vanishes when the picker later scopes to the
      // node's real (inherited) market. Resolve it the same way the listing does, so create
      // and list always target the same market.
      if (!this.storeId) {
        const nodeKey = this._workspaceContext?.getUnique?.();
        if (nodeKey) this.storeId = (await this.fetchEffectiveStoreId(nodeKey)) || '';
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/categories', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ name, marketId: this.storeId || null })
      });

      if (response.ok) {
        const created = await response.json();
        this._showCreate = false;
        await this.loadCategories(); // refresh the tree (server dropped the cache) so it lists
        this.selectCategory(created.id);
      } else {
        this._createError = (await response.text()) || 'Failed to create category.';
      }
    } catch (err) {
      console.error('Failed to create category:', err);
      this._createError = 'Failed to create category: ' + err.message;
    } finally {
      this._creating = false;
    }
  }

  flattenCategories(categories, level = 0) {
    let result = [];
    for (const cat of categories) {
      result.push({
        id: cat.id, name: cat.name, level,
        displayName: '—'.repeat(level) + (level > 0 ? ' ' : '') + cat.name
      });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(this.flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
          <span>Loading categories...</span>
        </div>`;
    }

    if (this.error) {
      return html`
        <div class="error">
          <uui-icon name="alert"></uui-icon>
          <span>${this.error}</span>
          <uui-button look="secondary" @click=${this.loadCategories}>Retry</uui-button>
        </div>`;
    }

    const flatCategories = this.flattenCategories(this.categories);
    const options = [
      { name: '-- Select a category --', value: '', selected: !this.value },
      ...flatCategories.map(cat => ({ name: cat.displayName, value: cat.id, selected: this.value === cat.id }))
    ];

    return html`
      <div class="picker-row">
        <uui-select
          .value=${this.value}
          .options=${options}
          @change=${this.handleChange}
          placeholder="Select a category">
        </uui-select>
        ${!this.value ? html`
          <uui-button
            look="outline"
            label="Create category"
            title="Create a new category"
            @click=${this.openCreate}>
            <uui-icon name="icon-add"></uui-icon>
          </uui-button>
        ` : ''}
      </div>
      ${this.value ? html`<small class="selected-info">Selected: ${this.value}</small>` : ''}
      ${this._showCreate ? this.renderCreatePopup() : ''}
    `;
  }

  renderCreatePopup() {
    return modalShell({
      headline: 'Create category',
      size: 'sm',
      onClose: () => { this._showCreate = false; },
      body: html`
        ${formRow('Name', html`
          <input class="form-input" id="new-cat-name" .value=${this._newName}
            @input=${(e) => { this._newName = e.target.value; }}
            placeholder="Category name">`)}
        ${this._createError ? html`<p class="modal-error">${this._createError}</p>` : ''}`,
      actions: modalActions({
        onCancel: () => { this._showCreate = false; },
        onConfirm: this.submitCreate,
        confirmLabel: this._creating ? 'Creating…' : 'Create',
        disabled: this._creating,
      }),
    });
  }

  // The create dialog comes from the kit; only the picker row itself is local.
  static styles = [commerceStyles, css`
    :host { display: block; }
    .loading { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); }
    .error { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); color: var(--uui-color-danger); }
    .picker-row { display: flex; align-items: center; gap: var(--uui-size-space-2); }
    .picker-row uui-select { flex: 1; }
    uui-select { width: 100%; }
    .selected-info { display: block; margin-top: var(--uui-size-space-1); color: var(--uui-color-text-alt); font-size: var(--uui-size-4); }
  `];
}

customElements.define('ecomm-category-picker', ECommCategoryPicker);
export default ECommCategoryPicker;
