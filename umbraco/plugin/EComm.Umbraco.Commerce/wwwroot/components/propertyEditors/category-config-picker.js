import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

/**
 * Config-only property editor UI: picks a single commerce Category, used as the
 * "Category" setting on the Products-By-Category picker data type.
 *
 * This runs on the data-type Settings screen where there is NO document/content
 * node, so it can't resolve a per-node store the way category-picker.js does.
 * It scopes to the market configured in Commerce Settings (GET .../settings ->
 * marketId), mirroring how Umbraco's own ContentPicker.SourceType config field
 * reads no document context. Has no propertyEditorSchemaAlias in the manifest,
 * so it can only be used to configure other property editors.
 */
class ECommCategoryConfigPicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: String },
    _categories: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  constructor() {
    super();
    this.value = '';
    this._categories = [];
    this._loading = true;
    this._error = null;

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
      this._load();
    });
  }

  async _getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async _load() {
    this._loading = true;
    this._error = null;
    try {
      const headers = await this._getAuthHeaders();
      // Resolve the default market from Commerce Settings (no node context here).
      const settingsRes = await fetch('/umbraco/management/api/ecomm-commerce/settings', {
        headers, credentials: 'include'
      });
      const settings = settingsRes.ok ? await settingsRes.json() : null;
      const marketId = settings?.marketId || '';
      const qs = marketId ? `?marketId=${encodeURIComponent(marketId)}` : '';

      const res = await fetch(`/umbraco/management/api/ecomm-commerce/categories${qs}`, {
        headers, credentials: 'include'
      });
      if (res.ok) {
        this._categories = await res.json();
      } else {
        this._error = 'Failed to load categories. Check Commerce Settings.';
      }
    } catch (err) {
      console.error('Failed to load categories for config picker:', err);
      this._error = 'Failed to load categories: ' + err.message;
    } finally {
      this._loading = false;
    }
  }

  _flatten(categories, level = 0) {
    let result = [];
    for (const cat of categories) {
      result.push({
        id: cat.id,
        displayName: '—'.repeat(level) + (level > 0 ? ' ' : '') + cat.name,
      });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(this._flatten(cat.children, level + 1));
      }
    }
    return result;
  }

  _handleChange(e) {
    this.value = e.target.value;
    // Persisted by the property-editor host: dispatch on `this` (never let a nested
    // control's own event bubble unhandled, or the host drops the change).
    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this.value }, bubbles: true, composed: true
    }));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value }, bubbles: true, composed: true
    }));
  }

  render() {
    if (this._loading) {
      return html`<div class="loading"><uui-loader></uui-loader><span>Loading categories...</span></div>`;
    }
    if (this._error) {
      return html`
        <div class="error">
          <uui-icon name="alert"></uui-icon><span>${this._error}</span>
          <uui-button look="secondary" @click=${this._load}>Retry</uui-button>
        </div>`;
    }

    const options = [
      { name: '-- Select a category --', value: '', selected: !this.value },
      ...this._flatten(this._categories).map(c => ({
        name: c.displayName, value: c.id, selected: this.value === c.id
      }))
    ];

    return html`
      <uui-select
        .value=${this.value}
        .options=${options}
        @change=${this._handleChange}
        placeholder="Select a category">
      </uui-select>
    `;
  }

  static styles = css`
    :host { display: block; }
    uui-select { width: 100%; }
    .loading, .error { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); }
    .error { color: var(--uui-color-danger); }
  `;
}

customElements.define('ecomm-category-config-picker', ECommCategoryConfigPicker);
export default ECommCategoryConfigPicker;
