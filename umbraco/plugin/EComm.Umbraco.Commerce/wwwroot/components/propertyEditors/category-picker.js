import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

class ECommCategoryPicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: String },
    categories: { type: Array },
    loading: { type: Boolean },
    error: { type: String }
  };

  constructor() {
    super();
    this.value = '';
    this.categories = [];
    this.loading = true;
    this.error = null;

    // Consume auth context
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadCategories();
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async loadCategories() {
    this.loading = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/categories', {
        headers: headers,
        credentials: 'include'
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

    // Dispatch custom event for Umbraco property editor
    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));

    // Also dispatch the standard change event
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  flattenCategories(categories, level = 0) {
    let result = [];

    for (const cat of categories) {
      result.push({
        id: cat.id,
        name: cat.name,
        level: level,
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
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="error">
          <uui-icon name="alert"></uui-icon>
          <span>${this.error}</span>
          <uui-button
            look="secondary"
            @click=${this.loadCategories}>
            Retry
          </uui-button>
        </div>
      `;
    }

    const flatCategories = this.flattenCategories(this.categories);

    // Convert to options format expected by uui-select
    const options = [
      { name: '-- Select a category --', value: '', selected: !this.value },
      ...flatCategories.map(cat => ({
        name: cat.displayName,
        value: cat.id,
        selected: this.value === cat.id
      }))
    ];

    return html`
      <uui-select
        .value=${this.value}
        .options=${options}
        @change=${this.handleChange}
        placeholder="Select a category">
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

customElements.define('ecomm-category-picker', ECommCategoryPicker);

export default ECommCategoryPicker;
