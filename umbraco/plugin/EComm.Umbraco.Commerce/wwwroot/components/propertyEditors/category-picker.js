import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';

class ECommCategoryPicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: String },
    categories: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
    storeId: { type: String }
  };

  constructor() {
    super();
    this.value = '';
    this.categories = [];
    this.loading = true;
    this.error = null;
    this.storeId = '';
    this.storeIdPropertyAlias = 'storeId';

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;

      // Load the configurable alias first, then watch that property on the document so
      // categories reload when the store/market picker changes - mirrors how
      // categoryIdPropertyAlias is configurable in Commerce Settings.
      this.loadStoreIdPropertyAlias().then(() => {
        this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, async (datasetContext) => {
          this.observe(
            await datasetContext.propertyValueByAlias(this.storeIdPropertyAlias),
            (value) => {
              if (value !== this.storeId) {
                this.storeId = value || '';
                this.loadCategories();
              }
            }
          );
        });
      });
    });
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
    this.loadCategories();
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
    this.value = e.target.value;
    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this.value }, bubbles: true, composed: true
    }));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value }, bubbles: true, composed: true
    }));
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
      <uui-select
        .value=${this.value}
        .options=${options}
        @change=${this.handleChange}
        placeholder="Select a category">
      </uui-select>
      ${this.value ? html`<small class="selected-info">Selected: ${this.value}</small>` : ''}
    `;
  }

  static styles = css`
    :host { display: block; }
    .loading { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); }
    .error { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); color: var(--uui-color-danger); }
    uui-select { width: 100%; }
    .selected-info { display: block; margin-top: var(--uui-size-space-1); color: var(--uui-color-text-alt); font-size: var(--uui-size-4); }
  `;
}

customElements.define('ecomm-category-picker', ECommCategoryPicker);
export default ECommCategoryPicker;
