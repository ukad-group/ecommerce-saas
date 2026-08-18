import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
// The shared design kit — see umbraco/docs/DESIGN-SYSTEM.md before adding UI here.
import { commerceStyles, modalShell, modalActions, formRow } from '../shared/commerce-ui.js';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';

class ECommProductPicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: String },
    _products: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _showCreate: { type: Boolean, state: true },
    _newType: { type: String, state: true },
    _newName: { type: String, state: true },
    _newSku: { type: String, state: true },
    _newPrice: { type: String, state: true },
    _creating: { type: Boolean, state: true },
    _createError: { type: String, state: true },
    _selectedName: { type: String, state: true },
  };

  constructor() {
    super();
    this.value = '';
    this._products = [];
    this._loading = true;
    this._error = null;
    this._documentContext = null;
    this._documentKey = null;
    this._resolvedCategoryId = null;
    this._resolvedMarketId = null;
    this._showCreate = false;
    this._newType = 'single';
    this._newName = '';
    this._newSku = '';
    this._newPrice = '';
    this._creating = false;
    this._createError = null;
    this._selectedName = null;

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (ctx) => {
      this._documentContext = ctx;
      // Fires again with undefined when the workspace context goes away (node closed/torn down).
      if (!ctx) return;
      // The node key comes from the edit URL. When the picker is edited inside a Block List /
      // infinite-editing overlay the path nests the outer product AND the inner node
      // (.../document/edit/{outer}/.../document/{inner}/edit/{inner}), so _getNodeKeyFromUrl returns
      // the INNERMOST key - the node actually being edited - not the outer product page. ctx.unique
      // is only a fallback for a brand-new unsaved node (no /edit/ URL yet; unreliable per #19213).
      this.observe(ctx.unique, (key) => {
        const resolvedKey = this._getNodeKeyFromUrl() || key;
        this._documentKey = resolvedKey;
        if (resolvedKey) this._loadProducts(resolvedKey);
        else { this._loading = false; this._error = 'No document key found.'; }
      });
    });
  }

  // Fetches the selected product by id (category-independent) so its name shows even when the
  // resolved list doesn't contain it (e.g. before the correct category resolves).
  async _loadSelectedName() {
    if (!this.value) { this._selectedName = null; return; }
    const inList = this._products.find(p => p.id === this.value);
    if (inList) { this._selectedName = inList.name; return; }
    try {
      const headers = await this._getAuthHeaders();
      const r = await fetch(`/umbraco/management/api/ecomm-commerce/product/${this.value}`,
        { headers, credentials: 'include' });
      if (r.ok) { const p = await r.json(); this._selectedName = p?.name || null; }
    } catch { /* name preview is best-effort */ }
  }

  updated(changed) {
    if (changed.has('value')) this._loadSelectedName();
  }

  _getNodeKeyFromUrl() {
    // Matches both the top-level form (/document/edit/{key}) and the nested referenced-document
    // form (/document/{key}/edit/{key}) that infinite editing produces, and returns the LAST
    // (innermost) match - the node actually being edited when nested inside a Block List overlay.
    const guid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
    const re = new RegExp(`/document/(?:edit/|${guid}/edit/)(${guid})`, 'g');
    let m, last = null;
    while ((m = re.exec(window.location.pathname)) !== null) last = m[1];
    return last;
  }

  async _getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async _loadProducts(nodeKey) {
    this._loading = true;
    this._error = null;

    try {
      const headers = await this._getAuthHeaders();
      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/products-for-node/${nodeKey}`,
        { headers, credentials: 'include' }
      );

      if (response.ok) {
        const result = await response.json();
        this._products = result.products || [];
        // Capture the category/market this list resolved from, to reuse verbatim on create.
        this._resolvedCategoryId = result.categoryId || null;
        this._resolvedMarketId = result.marketId || null;
        this._loadSelectedName();
      } else if (response.status === 400) {
        const text = await response.text();
        this._error = text.includes('categoryId')
          ? 'Parent page has no category selected. Set a category on the parent page first.'
          : text;
      } else {
        this._error = 'Failed to load products. Please check Commerce Settings.';
      }
    } catch (err) {
      console.error('Failed to load products for node:', err);
      this._error = 'Failed to load products: ' + err.message;
    } finally {
      this._loading = false;
    }
  }

  _handleChange(e) {
    this._selectProduct(e.target.value);
  }

  // Sets the picked product and syncs the node: fire the value-change events Umbraco
  // persists and mirror the product name onto the node name (shared by the dropdown and
  // the create popup).
  _selectProduct(productId) {
    this.value = productId;
    this._loadSelectedName();

    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));

    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));

    if (this._documentContext && this.value) {
      const product = this._products.find(p => p.id === this.value);
      if (product?.name) {
        this._documentContext.setName(product.name);
      }
    }
  }

  _openCreate() {
    this._newType = 'single';
    this._newName = '';
    this._newSku = '';
    this._newPrice = '';
    this._createError = null;
    this._showCreate = true;
  }

  async _submitCreate() {
    const name = this._newName.trim();
    const sku = this._newSku.trim();
    const isSingle = this._newType === 'single';
    const price = parseFloat(this._newPrice);
    if (!name) { this._createError = 'Name is required.'; return; }
    if (isSingle && !sku) { this._createError = 'SKU is required for a solo product.'; return; }
    if (isSingle && !(price > 0)) { this._createError = 'A price greater than 0 is required for a solo product.'; return; }

    this._creating = true;
    this._createError = null;

    try {
      const headers = await this._getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/products', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name,
          sku: isSingle ? sku : null,
          price: isSingle ? price : 0, // variants carry price per-variant; server skips the price check when hasVariants
          hasVariants: !isSingle,
          categoryId: this._resolvedCategoryId, // captured from products-for-node — the category the visible list came from
          marketId: this._resolvedMarketId,
          nodeKey: this._documentKey, // fallback for server-side resolution
        }),
      });

      if (response.ok) {
        const created = await response.json();
        this._products = [created, ...this._products];
        this._showCreate = false;
        this._selectProduct(created.id);
      } else {
        this._createError = (await response.text()) || 'Failed to create product.';
      }
    } catch (err) {
      console.error('Failed to create product:', err);
      this._createError = 'Failed to create product: ' + err.message;
    } finally {
      this._creating = false;
    }
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
          <span>Loading products...</span>
        </div>
      `;
    }

    if (this._error) {
      return html`
        <div class="error">
          <uui-icon name="alert"></uui-icon>
          <span>${this._error}</span>
          ${this._documentKey ? html`
            <uui-button look="secondary" @click=${() => this._loadProducts(this._documentKey)}>
              Retry
            </uui-button>
          ` : ''}
        </div>
      `;
    }

    const options = [
      { name: '-- Select a product --', value: '', selected: !this.value },
      ...this._products.map(p => ({
        name: `${p.name} (${p.sku || 'no SKU'})`,
        value: p.id,
        selected: this.value === p.id
      }))
    ];
    // Keep the current selection visible even if it isn't in the resolved list (e.g. the list
    // resolved from a different category, or hasn't loaded) so the picker never looks empty.
    if (this.value && !this._products.some(p => p.id === this.value)) {
      options.push({ name: `${this._selectedName || this.value} (selected)`, value: this.value, selected: true });
    }

    return html`
      <div class="picker-row">
        <uui-select
          .value=${this.value}
          .options=${options}
          @change=${this._handleChange}
          placeholder="Select a product">
        </uui-select>
        ${!this.value ? html`
          <uui-button
            look="outline"
            label="Create product"
            title="Create a new product"
            @click=${this._openCreate}>
            <uui-icon name="icon-add"></uui-icon>
          </uui-button>
        ` : ''}
      </div>

      ${this.value ? html`
        <small class="selected-info">Selected: ${this._selectedName || this.value}</small>
      ` : ''}

      ${this._showCreate ? this._renderCreatePopup() : ''}
    `;
  }

  _renderCreatePopup() {
    return modalShell({
      headline: 'Create product',
      size: 'sm',
      onClose: () => { this._showCreate = false; },
      body: html`
        ${formRow('Type', html`
          <uui-radio-group
            .value=${this._newType}
            @change=${(e) => { this._newType = e.target.value; }}>
            <uui-radio value="single" label="Solo product"></uui-radio>
            <uui-radio value="variants" label="With variants"></uui-radio>
          </uui-radio-group>`)}

        ${formRow('Name', html`
          <input class="form-input" id="new-name" .value=${this._newName}
            @input=${(e) => { this._newName = e.target.value; }}
            placeholder="Product name">`)}

        ${this._newType === 'single' ? html`
          ${formRow('SKU', html`
            <input class="form-input" id="new-sku" .value=${this._newSku}
              @input=${(e) => { this._newSku = e.target.value; }}
              placeholder="SKU">`)}
          ${formRow('Price', html`
            <input class="form-input" id="new-price" type="number" min="0" step="0.01"
              .value=${this._newPrice}
              @input=${(e) => { this._newPrice = e.target.value; }}
              placeholder="0.00">`)}` : ''}

        ${this._createError ? html`<p class="modal-error">${this._createError}</p>` : ''}`,
      actions: modalActions({
        onCancel: () => { this._showCreate = false; },
        onConfirm: this._submitCreate,
        confirmLabel: this._creating ? 'Creating…' : 'Create',
        disabled: this._creating,
      }),
    });
  }

  // The create dialog comes from the kit; only the picker row itself is local.
  static styles = [commerceStyles, css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2);
      color: var(--uui-color-danger);
    }

    .picker-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .picker-row uui-select {
      flex: 1;
    }

    uui-select {
      width: 100%;
    }

    .selected-info {
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
    }
  `];
}

customElements.define('ecomm-product-picker', ECommProductPicker);

export default ECommProductPicker;
