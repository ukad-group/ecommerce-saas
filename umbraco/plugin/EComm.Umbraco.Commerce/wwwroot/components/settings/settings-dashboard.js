import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

class ECommSettingsDashboard extends UmbElementMixin(LitElement) {
  static properties = {
    settings: { type: Object },
    loading: { type: Boolean },
    saving: { type: Boolean },
    testing: { type: Boolean },
    testResult: { type: Object },
    error: { type: String },
    activeTab: { type: String },
    _productPageAliasRows: { type: Array, state: true }
  };

  constructor() {
    super();
    this.settings = {
      apiBaseUrl: '',
      tenantId: '',
      marketId: '',
      apiKey: '',
      categoryPageAlias: 'categoryPage',
      productPageAliases: 'productPage',
      categoryIdPropertyAlias: 'categoryId',
      storeIdPropertyAlias: 'storeId',
      productIdPropertyAlias: 'productId',
    };
    this._productPageAliasRows = ['productPage'];
    this.loading = true;
    this.saving = false;
    this.testing = false;
    this.testResult = null;
    this.error = null;
    this.activeTab = 'connection';

    // Consume auth context
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadSettings();
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async loadSettings() {
    this.loading = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/settings', {
        headers: headers,
        credentials: 'include'
      });

      if (response.ok) {
        this.settings = await response.json();
        this._productPageAliasRows = this.parseAliasRows(this.settings.productPageAliases);
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
      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/settings', {
        method: 'POST',
        headers: headers,
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
      const headers = await this.getAuthHeaders();
      const response = await fetch('/umbraco/management/api/ecomm-commerce/settings/test', {
        method: 'POST',
        headers: headers,
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

  parseAliasRows(commaSeparated) {
    const rows = (commaSeparated || '').split(',').map((s) => s.trim()).filter(Boolean);
    return rows.length > 0 ? rows : [''];
  }

  syncProductPageAliasRows() {
    this.settings = {
      ...this.settings,
      productPageAliases: this._productPageAliasRows.join(',')
    };
  }

  addProductPageAlias() {
    this._productPageAliasRows = [...this._productPageAliasRows, ''];
    this.syncProductPageAliasRows();
  }

  updateProductPageAlias(index, value) {
    this._productPageAliasRows = this._productPageAliasRows.map((row, i) => i === index ? value : row);
    this.syncProductPageAliasRows();
  }

  removeProductPageAlias(index) {
    const rows = this._productPageAliasRows.filter((_, i) => i !== index);
    this._productPageAliasRows = rows.length > 0 ? rows : [''];
    this.syncProductPageAliasRows();
  }

  resetToDefaults() {
    this._productPageAliasRows = ['productPage'];
    this.settings = {
      ...this.settings,
      categoryPageAlias: 'categoryPage',
      productPageAliases: 'productPage',
      categoryIdPropertyAlias: 'categoryId',
      storeIdPropertyAlias: 'storeId',
      productIdPropertyAlias: 'productId'
    };
  }

  renderConnectionTab() {
    return html`
      <div class="tab-content">
        <p class="description">
          Configure the connection to your eCommerce API. Enter your API URL and Tenant ID — the Commerce
          dashboard will let you select a market per session.
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
      </div>
    `;
  }

  renderDefaultsTab() {
    return html`
      <div class="tab-content">
        <p class="description">
          Configure document type and property aliases used by the plugin. Only change these if you're using
          custom document types that differ from the defaults.
        </p>

        <uui-box look="secondary" class="info-box">
          <div slot="headline">When to Change These Settings</div>
          <p>
            These settings control which Umbraco document types and property aliases the plugin looks for
            when routing product URLs. The defaults work with the standard setup.
          </p>
          <p><strong>Change these only if:</strong></p>
          <ul>
            <li>You've created custom document types with different aliases</li>
            <li>You've renamed the category ID property on your category pages</li>
            <li>You're integrating with an existing Umbraco site structure</li>
          </ul>
        </uui-box>

        ${this.error ? html`
          <uui-badge color="danger" look="primary">${this.error}</uui-badge>
        ` : ''}

        <form @submit=${this.saveSettings}>
          <div class="form-group">
            <uui-label for="categoryPageAlias" required>Category Page Alias</uui-label>
            <uui-input
              id="categoryPageAlias"
              placeholder="categoryPage"
              .value=${this.settings.categoryPageAlias || 'categoryPage'}
              @input=${(e) => this.handleInput('categoryPageAlias', e)}
              required>
            </uui-input>
            <small>
              The document type alias for category nodes (e.g., "categoryPage").
              Used by <code>ProductContentFinder</code> to identify category pages.
            </small>
          </div>

          <div class="form-group">
            <uui-label required>Product Page Aliases</uui-label>
            <div class="alias-list">
              ${this._productPageAliasRows.map((alias, index) => html`
                <div class="alias-row">
                  <uui-input
                    placeholder="productPage"
                    .value=${alias}
                    @input=${(e) => this.updateProductPageAlias(index, e.target.value)}>
                  </uui-input>
                  <uui-button look="secondary" color="danger"
                    @click=${() => this.removeProductPageAlias(index)}
                    ?disabled=${this._productPageAliasRows.length <= 1}>
                    Remove
                  </uui-button>
                </div>
              `)}
              <uui-button look="secondary" @click=${this.addProductPageAlias}>
                + Add Alias
              </uui-button>
            </div>
            <small>
              Document type aliases treated as product pages (e.g., "productPage", "bundleProduct").
              Nodes of any of these types get the "eCommerce" workspace tab; every other content
              type (including category pages) no longer shows it.
            </small>
          </div>

          <div class="form-group">
            <uui-label for="categoryIdPropertyAlias" required>Category ID Property Alias</uui-label>
            <uui-input
              id="categoryIdPropertyAlias"
              placeholder="categoryId"
              .value=${this.settings.categoryIdPropertyAlias || 'categoryId'}
              @input=${(e) => this.handleInput('categoryIdPropertyAlias', e)}
              required>
            </uui-input>
            <small>
              The property alias used to store the eCommerce category ID (e.g., "categoryId").
              Used by both <code>ProductContentFinder</code> and <code>products-workspace-view</code>.
            </small>
          </div>

          <div class="form-group">
            <uui-label for="storeIdPropertyAlias" required>Store ID Property Alias</uui-label>
            <uui-input
              id="storeIdPropertyAlias"
              placeholder="storeId"
              .value=${this.settings.storeIdPropertyAlias || 'storeId'}
              @input=${(e) => this.handleInput('storeIdPropertyAlias', e)}
              required>
            </uui-input>
            <small>
              The property alias for the store/market picker sibling property on category nodes
              (e.g., "storeId"). Used by <code>category-picker</code> and
              <code>products-workspace-view</code> to know which market to fetch from.
            </small>
          </div>

          <div class="form-group">
            <uui-label for="productIdPropertyAlias" required>Product ID Property Alias</uui-label>
            <uui-input
              id="productIdPropertyAlias"
              placeholder="productId"
              .value=${this.settings.productIdPropertyAlias || 'productId'}
              @input=${(e) => this.handleInput('productIdPropertyAlias', e)}
              required>
            </uui-input>
            <small>
              The property alias used to store the selected product ID on product pages
              (e.g., "productId"). Used by <code>products-workspace-view</code> to switch into
              single-product edit mode.
            </small>
          </div>

          <div class="button-group">
            <uui-button
              type="submit"
              look="primary"
              color="positive"
              ?disabled=${this.saving}>
              ${this.saving ? 'Saving...' : 'Save Defaults'}
            </uui-button>

            <uui-button
              type="button"
              look="secondary"
              @click=${this.resetToDefaults}>
              Reset to Defaults
            </uui-button>
          </div>
        </form>
      </div>
    `;
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
      <uui-box>
        <div slot="headline">Commerce Settings</div>

        <uui-tab-group>
          <uui-tab
            label="Connection"
            ?active=${this.activeTab === 'connection'}
            @click=${() => this.activeTab = 'connection'}>
            Connection
          </uui-tab>
          <uui-tab
            label="Defaults"
            ?active=${this.activeTab === 'defaults'}
            @click=${() => this.activeTab = 'defaults'}>
            Defaults
          </uui-tab>
        </uui-tab-group>

        ${this.activeTab === 'connection' ? this.renderConnectionTab() : this.renderDefaultsTab()}
      </uui-box>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--uui-size-space-5);
      overflow: visible;
    }

    uui-box {
      overflow: visible;
    }

    uui-tab-group {
      margin-bottom: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .tab-content {
      padding-top: var(--uui-size-space-4);
    }

    .info-box {
      margin-bottom: var(--uui-size-space-4);
      padding: var(--uui-size-space-4);
    }

    .info-box p {
      margin: var(--uui-size-space-2) 0;
      font-size: var(--uui-size-4);
    }

    .info-box ul {
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-5);
    }

    .info-box li {
      margin-bottom: var(--uui-size-space-1);
      font-size: var(--uui-size-4);
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

    .alias-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .alias-row {
      display: flex;
      gap: var(--uui-size-space-2);
      align-items: center;
    }

    .alias-row uui-input {
      flex: 1;
    }

    .form-group small code {
      background: var(--uui-color-surface-alt);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }

    .button-group {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-top: var(--uui-size-space-5);
    }

    uui-badge {
      display: block;
      margin: 15px;
      max-width: calc(100% - 30px);
      word-wrap: break-word;
      white-space: normal;
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
