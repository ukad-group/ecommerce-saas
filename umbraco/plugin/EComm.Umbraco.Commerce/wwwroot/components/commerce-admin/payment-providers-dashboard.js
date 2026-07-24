import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

const API = '/umbraco/management/api/ecomm-commerce';

/**
 * Payment Providers dashboard — add/edit/delete the payment providers configured for a market
 * and choose which is active. Forms are rendered from each provider's schema (catalog), so new
 * gateways need no UI changes. Secrets are write-only (masked; only sent when changed).
 */
class ECommPaymentProvidersDashboard extends UmbElementMixin(LitElement) {
  static properties = {
    markets: { type: Array, state: true },
    marketId: { type: String },
    embedded: { type: Boolean },
    catalog: { type: Array, state: true },
    providers: { type: Array, state: true },
    active: { type: String, state: true },
    editing: { type: Object, state: true },
    addAlias: { type: String, state: true },
    loading: { type: Boolean, state: true },
    saving: { type: Boolean, state: true },
    error: { type: String, state: true },
  };

  constructor() {
    super();
    this.markets = [];
    this.marketId = '';
    this.embedded = false;
    this._catalogLoaded = false;
    this._loadedMarketId = null;
    this.catalog = [];
    this.providers = [];
    this.active = null;
    this.editing = null;
    this.addAlias = '';
    this.loading = true;
    this.saving = false;
    this.error = null;

    this.consumeContext(UMB_AUTH_CONTEXT, (ctx) => {
      this._authContext = ctx;
    });
  }

  firstUpdated() {
    // firstUpdated (not connectedCallback) so bound properties (.embedded/.marketId) are set.
    this.init();
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async init() {
    this.loading = true;
    this.error = null;
    try {
      const headers = await this.getAuthHeaders();
      // Embedded (inside the Commerce dashboard) the market comes from the store switcher, so we
      // don't fetch/show our own market list. Standalone we load markets and default to the first.
      const requests = [fetch(`${API}/payment-providers/catalog`, { headers }).then((r) => r.json())];
      if (!this.embedded) requests.push(fetch(`${API}/markets`, { headers }).then((r) => r.json()));
      const [catalog, markets] = await Promise.all(requests);

      this.catalog = Array.isArray(catalog) ? catalog : [];
      this._catalogLoaded = true;
      if (!this.embedded) {
        this.markets = Array.isArray(markets) ? markets : [];
        if (this.markets.length && !this.marketId) this.marketId = this.markets[0].id;
      }
      // Provider loading is driven by updated() when marketId lands (covers embedded + auto-select).
    } catch (e) {
      this.error = 'Failed to load payment providers. Check the Commerce Settings connection.';
    } finally {
      this.loading = false;
    }
  }

  updated(changed) {
    // When embedded, `.marketId` is bound by lit-html after connectedCallback, and changes again
    // when the parent dashboard switches store — (re)load whenever it lands on a new market.
    if (changed.has('marketId') && this.marketId && this.marketId !== this._loadedMarketId) {
      this.loadProviders();
    }
  }

  async loadProviders() {
    this._loadedMarketId = this.marketId;
    this.editing = null;
    this.addAlias = '';
    const headers = await this.getAuthHeaders();
    const data = await fetch(`${API}/payment-providers?marketId=${encodeURIComponent(this.marketId)}`, { headers }).then((r) => r.json());
    this.providers = data?.providers ?? [];
    this.active = data?.active ?? null;
  }

  descriptor(alias) {
    return this.catalog.find((d) => d.alias === alias);
  }

  onMarketChange(e) {
    this.marketId = e.target.value;
    this.loadProviders();
  }

  async setActive(alias) {
    this.error = null;
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${API}/active-payment-provider?marketId=${encodeURIComponent(this.marketId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ alias: alias || null }),
      });
      await this.loadProviders();
    } catch {
      this.error = 'Failed to update the active provider.';
    }
  }

  async remove(alias) {
    this.error = null;
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${API}/payment-providers/${encodeURIComponent(alias)}?marketId=${encodeURIComponent(this.marketId)}`, {
        method: 'DELETE',
        headers,
      });
      await this.loadProviders();
    } catch {
      this.error = 'Failed to delete the provider.';
    }
  }

  startAdd() {
    const d = this.descriptor(this.addAlias);
    if (!d) return;
    this.editing = { alias: d.alias, values: this.seedValues(d) };
  }

  startEdit(alias) {
    const d = this.descriptor(alias);
    const current = this.providers.find((p) => p.alias === alias);
    if (!d) return;
    this.editing = { alias, values: this.seedValues(d, current?.settings) };
  }

  seedValues(descriptor, stored) {
    const values = {};
    for (const f of descriptor.fields) {
      if (f.type === 'Bool') {
        const raw = stored?.[f.key];
        values[f.key] = raw !== undefined ? raw === true || raw === 'true' : f.defaultValue === 'true';
      } else if (f.type === 'Secret') {
        values[f.key] = '';
      } else {
        const raw = stored?.[f.key];
        values[f.key] = raw !== undefined && raw !== null ? String(raw) : (f.defaultValue ?? '');
      }
    }
    return values;
  }

  setFieldValue(key, value) {
    this.editing = { ...this.editing, values: { ...this.editing.values, [key]: value } };
  }

  async save() {
    const d = this.descriptor(this.editing.alias);
    if (!d) return;
    const settings = {};
    for (const f of d.fields) {
      const v = this.editing.values[f.key];
      if (f.type === 'Bool') settings[f.key] = Boolean(v);
      else if (f.type === 'Secret') { if (typeof v === 'string' && v.length) settings[f.key] = v; }
      else if (f.type === 'Number') { if (typeof v === 'string' && v.trim() !== '') settings[f.key] = Number(v); }
      else settings[f.key] = typeof v === 'string' ? v : '';
    }

    this.saving = true;
    this.error = null;
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${API}/payment-providers/${encodeURIComponent(this.editing.alias)}?marketId=${encodeURIComponent(this.marketId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });
      this.editing = null;
      await this.loadProviders();
    } catch {
      this.error = 'Failed to save the provider settings.';
    } finally {
      this.saving = false;
    }
  }

  get unconfigured() {
    return this.catalog.filter((d) => !this.providers.some((p) => p.alias === d.alias));
  }

  renderField(field) {
    const value = this.editing.values[field.key];
    if (field.type === 'Bool') {
      return html`
        <uui-toggle
          label=${field.label}
          ?checked=${Boolean(value)}
          @change=${(e) => this.setFieldValue(field.key, e.target.checked)}>
          ${field.label}
        </uui-toggle>
        ${field.helpText ? html`<small>${field.helpText}</small>` : ''}
      `;
    }
    const type = field.type === 'Secret' ? 'password' : field.type === 'Number' ? 'number' : 'text';
    return html`
      <uui-label>${field.label}${field.required ? ' *' : ''}</uui-label>
      <uui-input
        type=${type}
        .value=${typeof value === 'string' ? value : ''}
        placeholder=${field.type === 'Secret' ? 'Leave blank to keep current' : ''}
        @input=${(e) => this.setFieldValue(field.key, e.target.value)}></uui-input>
      ${field.helpText ? html`<small>${field.helpText}</small>` : ''}
    `;
  }

  render() {
    if (this.loading) return html`<uui-loader></uui-loader>`;

    return html`
      <uui-box headline="Payment providers">
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        ${this.embedded
          ? ''
          : html`
              <div class="row">
                <uui-label for="market">Market</uui-label>
                <select id="market" @change=${this.onMarketChange}>
                  ${this.markets.map(
                    (m) => html`<option value=${m.id} ?selected=${m.id === this.marketId}>${m.name}</option>`
                  )}
                </select>
              </div>
            `}

        ${this.marketId ? this.renderManager() : html`<p>Select a store to manage its payment providers.</p>`}
      </uui-box>
    `;
  }

  renderManager() {
    return html`
      <div class="row">
        <uui-label for="active">Active provider</uui-label>
        <select id="active" @change=${(e) => this.setActive(e.target.value)}>
          <option value="" ?selected=${!this.active}>None (default / sole provider)</option>
          ${this.providers.map(
            (p) => html`<option value=${p.alias} ?selected=${p.alias === this.active}>${p.displayName}</option>`
          )}
        </select>
      </div>

      ${this.providers.length === 0
        ? html`<p>No providers configured for this market yet.</p>`
        : html`
            <uui-table>
              <uui-table-head>
                <uui-table-head-cell>Provider</uui-table-head-cell>
                <uui-table-head-cell></uui-table-head-cell>
                <uui-table-head-cell></uui-table-head-cell>
              </uui-table-head>
              ${this.providers.map(
                (p) => html`
                  <uui-table-row>
                    <uui-table-cell>
                      <strong>${p.displayName}</strong>
                      <span class="alias">${p.alias}</span>
                      ${p.alias === this.active ? html`<uui-tag color="positive" look="secondary">active</uui-tag>` : ''}
                      ${!p.known ? html`<uui-tag color="warning" look="secondary">unknown</uui-tag>` : ''}
                    </uui-table-cell>
                    <uui-table-cell>
                      <uui-button label="Edit" look="secondary" @click=${() => this.startEdit(p.alias)}></uui-button>
                    </uui-table-cell>
                    <uui-table-cell>
                      <uui-button label="Delete" look="secondary" color="danger" @click=${() => this.remove(p.alias)}></uui-button>
                    </uui-table-cell>
                  </uui-table-row>
                `
              )}
            </uui-table>
          `}

      ${!this.editing && this.unconfigured.length
        ? html`
            <div class="row add">
              <select @change=${(e) => (this.addAlias = e.target.value)}>
                <option value="">Add provider…</option>
                ${this.unconfigured.map((d) => html`<option value=${d.alias}>${d.displayName}</option>`)}
              </select>
              <uui-button label="Add" look="primary" ?disabled=${!this.addAlias} @click=${this.startAdd}></uui-button>
            </div>
          `
        : ''}

      ${this.editing ? this.renderForm() : ''}
    `;
  }

  renderForm() {
    const d = this.descriptor(this.editing.alias);
    return html`
      <uui-box headline="${d?.displayName} settings" class="form">
        ${d?.fields.map((f) => html`<div class="field">${this.renderField(f)}</div>`)}
        <div class="actions">
          <uui-button label="Cancel" look="secondary" @click=${() => (this.editing = null)}></uui-button>
          <uui-button label=${this.saving ? 'Saving…' : 'Save'} look="primary" color="positive" ?disabled=${this.saving} @click=${this.save}></uui-button>
        </div>
      </uui-box>
    `;
  }

  static styles = css`
    :host { display: block; padding: var(--uui-size-layout-1); }
    .row { display: flex; align-items: center; gap: var(--uui-size-space-4); margin-bottom: var(--uui-size-space-4); }
    .row select { padding: 6px 8px; min-width: 260px; }
    .row.add { margin-top: var(--uui-size-space-4); }
    .alias { color: var(--uui-color-text-alt); font-size: 0.8rem; margin: 0 var(--uui-size-space-3); }
    .form { margin-top: var(--uui-size-space-5); display: block; }
    .field { margin-bottom: var(--uui-size-space-4); display: flex; flex-direction: column; gap: 4px; }
    .field uui-input { width: 100%; max-width: 420px; }
    .actions { display: flex; gap: var(--uui-size-space-3); justify-content: flex-end; }
    .error { background: var(--uui-color-danger); color: #fff; padding: 8px 12px; border-radius: 4px; margin-bottom: var(--uui-size-space-4); }
    small { color: var(--uui-color-text-alt); }
  `;
}

customElements.define('ecomm-payment-providers-dashboard', ECommPaymentProvidersDashboard);
export default ECommPaymentProvidersDashboard;
