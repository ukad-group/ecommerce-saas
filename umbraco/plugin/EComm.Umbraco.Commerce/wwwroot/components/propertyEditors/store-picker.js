import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

class ECommStorePicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: String },
    markets: { type: Array },
    loading: { type: Boolean },
    error: { type: String }
  };

  constructor() {
    super();
    this.value = '';
    this.markets = [];
    this.loading = true;
    this.error = null;

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadMarkets();
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async loadMarkets() {
    this.loading = true;
    this.error = null;
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/markets', {
        headers, credentials: 'include'
      });
      if (response.ok) {
        this.markets = await response.json();
      } else {
        this.error = 'Failed to load stores. Please check your Commerce Settings.';
      }
    } catch (err) {
      this.error = 'Failed to load stores: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  handleChange(e) {
    this.value = e.target.value;
    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this.value },
      bubbles: true, composed: true
    }));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true, composed: true
    }));
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
          <span>Loading stores...</span>
        </div>`;
    }

    if (this.error) {
      return html`
        <div class="error">
          <uui-icon name="alert"></uui-icon>
          <span>${this.error}</span>
          <uui-button look="secondary" @click=${this.loadMarkets}>Retry</uui-button>
        </div>`;
    }

    if (!this.markets.length) {
      return html`<p class="empty">No stores available — configure Commerce Settings first.</p>`;
    }

    const options = [
      { name: '-- Select a store --', value: '', selected: !this.value },
      ...this.markets.map(m => ({ name: m.name, value: m.id, selected: this.value === m.id }))
    ];

    return html`
      <uui-select
        .value=${this.value}
        .options=${options}
        @change=${this.handleChange}
        placeholder="Select a store">
      </uui-select>
      ${this.value ? html`<small class="selected-info">Selected: ${this.value}</small>` : ''}
    `;
  }

  static styles = css`
    :host { display: block; }
    .loading, .error { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); }
    .error { color: var(--uui-color-danger); }
    .empty { color: var(--uui-color-text-alt); font-size: var(--uui-size-4); margin: 0; }
    uui-select { width: 100%; }
    .selected-info { display: block; margin-top: var(--uui-size-space-1); color: var(--uui-color-text-alt); font-size: var(--uui-size-4); }
  `;
}

customElements.define('ecomm-store-picker', ECommStorePicker);
export default ECommStorePicker;
