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
  };

  constructor() {
    super();
    this.value = '';
    this._products = [];
    this._loading = true;
    this._error = null;
    this._documentContext = null;
    this._documentKey = null;

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
    this.value = e.target.value;

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
      <uui-select
        .value=${this.value}
        .options=${options}
        @change=${this._handleChange}
        placeholder="Select a product">
      </uui-select>

      ${this.value ? html`
        <small class="selected-info">Selected: ${this.value}</small>
      ` : ''}
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

    uui-select {
      width: 100%;
    }

    .selected-info {
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
    }
  `;
}

customElements.define('ecomm-product-picker', ECommProductPicker);

export default ECommProductPicker;
