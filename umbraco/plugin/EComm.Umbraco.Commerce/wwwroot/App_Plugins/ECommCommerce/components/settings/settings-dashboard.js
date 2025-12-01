import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nicholasxjy/lit-cdn@latest/lit.min.js';

class ECommSettingsDashboard extends LitElement {
  static properties = {
    settings: { type: Object },
    loading: { type: Boolean },
    saving: { type: Boolean },
    testing: { type: Boolean },
    testResult: { type: Object },
    error: { type: String }
  };

  constructor() {
    super();
    this.settings = {
      apiBaseUrl: '',
      tenantId: '',
      marketId: '',
      apiKey: ''
    };
    this.loading = true;
    this.saving = false;
    this.testing = false;
    this.testResult = null;
    this.error = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  async loadSettings() {
    this.loading = true;
    this.error = null;

    try {
      const response = await fetch('/api/v1/commerce/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        this.settings = await response.json();
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      this.error = 'Failed to load settings';
    } finally {
      this.loading = false;
    }
  }

  async saveSettings(e) {
    e.preventDefault();
    this.saving = true;
    this.error = null;

    try {
      const response = await fetch('/api/v1/commerce/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(this.settings)
      });

      if (response.ok) {
        this.testResult = { success: true, message: 'Settings saved successfully!' };
      } else {
        const error = await response.text();
        this.error = error || 'Failed to save settings';
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      this.error = 'Failed to save settings';
    } finally {
      this.saving = false;
    }
  }

  async testConnection() {
    this.testing = true;
    this.testResult = null;
    this.error = null;

    try {
      const response = await fetch('/api/v1/commerce/settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(this.settings)
      });

      this.testResult = await response.json();
    } catch (err) {
      console.error('Connection test failed:', err);
      this.testResult = { success: false, message: 'Connection test failed: ' + err.message };
    } finally {
      this.testing = false;
    }
  }

  handleInput(field, e) {
    this.settings = {
      ...this.settings,
      [field]: e.target.value
    };
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          <uui-loader></uui-loader>
          <p>Loading settings...</p>
        </div>
      `;
    }

    return html`
      <uui-box headline="eCommerce API Settings">
        <p class="description">
          Configure the connection to your eCommerce API. These settings determine which tenant and market
          this Umbraco site will use for product and category data.
        </p>

        ${this.error ? html`
          <uui-badge color="danger" look="primary">${this.error}</uui-badge>
        ` : ''}

        ${this.testResult ? html`
          <uui-badge
            color="${this.testResult.success ? 'positive' : 'danger'}"
            look="primary">
            ${this.testResult.message}
          </uui-badge>
        ` : ''}

        <form @submit=${this.saveSettings}>
          <div class="form-group">
            <uui-label for="apiBaseUrl" required>API Base URL</uui-label>
            <uui-input
              id="apiBaseUrl"
              type="url"
              placeholder="https://api.yourplatform.com/api/v1"
              .value=${this.settings.apiBaseUrl}
              @input=${(e) => this.handleInput('apiBaseUrl', e)}
              required>
            </uui-input>
            <small>The base URL of the eCommerce API (e.g., http://localhost:5180/api/v1)</small>
          </div>

          <div class="form-group">
            <uui-label for="tenantId" required>Tenant ID</uui-label>
            <uui-input
              id="tenantId"
              placeholder="tenant-a"
              .value=${this.settings.tenantId}
              @input=${(e) => this.handleInput('tenantId', e)}
              required>
            </uui-input>
            <small>The tenant identifier from your eCommerce platform</small>
          </div>

          <div class="form-group">
            <uui-label for="marketId" required>Market ID</uui-label>
            <uui-input
              id="marketId"
              placeholder="market-1"
              .value=${this.settings.marketId}
              @input=${(e) => this.handleInput('marketId', e)}
              required>
            </uui-input>
            <small>The market identifier for this site's catalog</small>
          </div>

          <div class="form-group">
            <uui-label for="apiKey">API Key</uui-label>
            <uui-input
              id="apiKey"
              type="password"
              placeholder="Optional API key for authentication"
              .value=${this.settings.apiKey}
              @input=${(e) => this.handleInput('apiKey', e)}>
            </uui-input>
            <small>Optional API key for authenticated requests</small>
          </div>

          <div class="button-group">
            <uui-button
              type="button"
              look="secondary"
              @click=${this.testConnection}
              ?disabled=${this.testing || !this.settings.apiBaseUrl}>
              ${this.testing ? 'Testing...' : 'Test Connection'}
            </uui-button>

            <uui-button
              type="submit"
              look="primary"
              color="positive"
              ?disabled=${this.saving}>
              ${this.saving ? 'Saving...' : 'Save Settings'}
            </uui-button>
          </div>
        </form>

        ${this.testResult?.markets?.length > 0 ? html`
          <div class="markets-list">
            <h4>Available Markets:</h4>
            <ul>
              ${this.testResult.markets.map(m => html`
                <li>${m.name} (${m.id})</li>
              `)}
            </ul>
          </div>
        ` : ''}
      </uui-box>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
    }

    .description {
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    .form-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .form-group uui-label {
      display: block;
      margin-bottom: var(--uui-size-space-1);
    }

    .form-group uui-input {
      width: 100%;
    }

    .form-group small {
      display: block;
      margin-top: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
    }

    .button-group {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-5);
    }

    uui-badge {
      margin-bottom: var(--uui-size-space-4);
    }

    .markets-list {
      margin-top: var(--uui-size-space-4);
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .markets-list h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .markets-list ul {
      margin: 0;
      padding-left: var(--uui-size-space-4);
    }
  `;
}

customElements.define('ecomm-settings-dashboard', ECommSettingsDashboard);

export default ECommSettingsDashboard;
