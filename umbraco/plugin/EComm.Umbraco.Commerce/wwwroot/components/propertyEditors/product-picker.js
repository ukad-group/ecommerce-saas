import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
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

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });

    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (ctx) => {
      this._documentContext = ctx;
      // Resolves the parent server-side from the node's own key rather than
      // ctx.parentUnique, which is unreliable (umbraco/Umbraco-CMS#19213).
      // ctx.unique itself has turned out to be just as unreliable here (it can
      // report the parent's key instead of the current document's), so prefer
      // the key embedded in the edit URL - unambiguous once the doc is saved -
      // and only fall back to ctx.unique while creating a brand new node
      // (before an /edit/ URL exists for it).
      this.observe(ctx.unique, (key) => {
        const resolvedKey = this._getNodeKeyFromUrl() || key;
        this._documentKey = resolvedKey;
        if (resolvedKey) this._loadProducts(resolvedKey);
        else { this._loading = false; this._error = 'No document key found.'; }
      });
    });
  }

  _getNodeKeyFromUrl() {
    const match = window.location.pathname.match(
      /\/document\/edit\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
    );
    return match ? match[1] : null;
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
        <small class="selected-info">Selected: ${this.value}</small>
      ` : ''}

      ${this._showCreate ? this._renderCreatePopup() : ''}
    `;
  }

  _renderCreatePopup() {
    return html`
      <div class="overlay" @click=${() => { this._showCreate = false; }}>
        <div class="dialog" @click=${(e) => e.stopPropagation()}>
          <h3>Create product</h3>

          <uui-radio-group
            .value=${this._newType}
            @change=${(e) => { this._newType = e.target.value; }}>
            <uui-radio value="single" label="Solo product"></uui-radio>
            <uui-radio value="variants" label="With variants"></uui-radio>
          </uui-radio-group>

          <uui-label for="new-name">Name</uui-label>
          <uui-input
            id="new-name"
            .value=${this._newName}
            @input=${(e) => { this._newName = e.target.value; }}
            placeholder="Product name">
          </uui-input>

          ${this._newType === 'single' ? html`
            <uui-label for="new-sku">SKU</uui-label>
            <uui-input
              id="new-sku"
              .value=${this._newSku}
              @input=${(e) => { this._newSku = e.target.value; }}
              placeholder="SKU">
            </uui-input>

            <uui-label for="new-price">Price</uui-label>
            <uui-input
              id="new-price"
              type="number"
              min="0"
              step="0.01"
              .value=${this._newPrice}
              @input=${(e) => { this._newPrice = e.target.value; }}
              placeholder="0.00">
            </uui-input>
          ` : ''}

          ${this._createError ? html`<div class="error">${this._createError}</div>` : ''}

          <div class="dialog-actions">
            <uui-button look="secondary" label="Cancel"
              ?disabled=${this._creating}
              @click=${() => { this._showCreate = false; }}>
              Cancel
            </uui-button>
            <uui-button look="primary" color="positive" label="Create"
              ?disabled=${this._creating}
              @click=${this._submitCreate}>
              ${this._creating ? 'Creating…' : 'Create'}
            </uui-button>
          </div>
        </div>
      </div>
    `;
  }

  static styles = css`
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

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: var(--uui-color-surface);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-5);
      width: 400px;
      max-width: 90vw;
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      box-shadow: var(--uui-shadow-depth-3);
    }

    .dialog h3 {
      margin: 0;
    }

    .dialog uui-input {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
    }
  `;
}

customElements.define('ecomm-product-picker', ECommProductPicker);

export default ECommProductPicker;
