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
    orderStatuses: { type: Array, state: true },
    orderStatusAfterPayment: { type: String, state: true },
    taxClasses: { type: Array, state: true },
    surcharges: { type: Object, state: true },
    editing: { type: Object, state: true },
    revealed: { type: Object, state: true },
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
    this.orderStatuses = [];
    this.orderStatusAfterPayment = null;
    this.taxClasses = [];
    this.surcharges = {};
    this.editing = null;
    this.revealed = {};
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
      const requests = [
        fetch(`${API}/payment-providers/catalog`, { headers }).then((r) => r.json()),
        fetch(`${API}/order-statuses`, { headers }).then((r) => r.json()),
      ];
      if (!this.embedded) requests.push(fetch(`${API}/markets`, { headers }).then((r) => r.json()));
      const [catalog, orderStatuses, markets] = await Promise.all(requests);

      this.catalog = Array.isArray(catalog) ? catalog : [];
      this.orderStatuses = Array.isArray(orderStatuses) ? orderStatuses.filter((s) => s.isActive) : [];
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
    const [data, tax] = await Promise.all([
      fetch(`${API}/payment-providers?marketId=${encodeURIComponent(this.marketId)}`, { headers }).then((r) => r.json()),
      fetch(`${API}/tax-classes?marketId=${encodeURIComponent(this.marketId)}`, { headers }).then((r) => r.json()),
    ]);
    this.providers = data?.providers ?? [];
    this.active = data?.active ?? null;
    this.orderStatusAfterPayment = data?.orderStatusAfterPayment ?? null;
    this.surcharges = data?.surcharges ?? {};
    // { taxClasses, taxRate } — read the field, don't sniff for a bare array. Accepting both shapes
    // is what let an API shape change empty this dropdown silently instead of failing loudly.
    this.taxClasses = tax?.taxClasses ?? [];
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

  async setOrderStatus(code) {
    this.error = null;
    try {
      const headers = await this.getAuthHeaders();
      await fetch(`${API}/order-status-after-payment?marketId=${encodeURIComponent(this.marketId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ code: code || null }),
      });
      await this.loadProviders();
    } catch {
      this.error = 'Failed to update the order status.';
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

  seedSurcharge(alias) {
    const s = this.surcharges?.[alias];
    return { taxClassId: s?.taxClassId ?? '', amount: s?.amount ? String(s.amount) : '' };
  }

  startAdd() {
    const d = this.descriptor(this.addAlias);
    if (!d) return;
    this.revealed = {}; // a freshly opened form never starts with a secret on screen
    this.editing = { alias: d.alias, values: this.seedValues(d), surcharge: this.seedSurcharge(d.alias), isNew: true };
  }

  startEdit(alias) {
    const d = this.descriptor(alias);
    const current = this.providers.find((p) => p.alias === alias);
    if (!d) return;
    this.revealed = {};
    this.editing = { alias, values: this.seedValues(d, current?.settings), surcharge: this.seedSurcharge(alias), isNew: false };
  }

  /**
   * Fetches the stored value of one secret and drops it into the field. A following save just
   * re-sends the same value, which the API keeps either way.
   */
  async revealSecret(key) {
    try {
      const headers = await this.getAuthHeaders();
      const alias = encodeURIComponent(this.editing.alias);
      const mid = encodeURIComponent(this.marketId);
      const response = await fetch(
        `${API}/payment-providers/${alias}/secrets/${encodeURIComponent(key)}?marketId=${mid}`,
        { headers }
      );
      if (!response.ok) throw new Error();
      const { value } = await response.json();
      this.setFieldValue(key, value ?? '');
      this.revealed = { ...this.revealed, [key]: true };
    } catch {
      this.error = 'Failed to read the stored secret.';
    }
  }

  setSurchargeField(key, value) {
    this.editing = { ...this.editing, surcharge: { ...this.editing.surcharge, [key]: value } };
  }

  backToList() {
    this.editing = null;
    this.addAlias = '';
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
      const alias = encodeURIComponent(this.editing.alias);
      const mid = encodeURIComponent(this.marketId);
      await fetch(`${API}/payment-providers/${alias}?marketId=${mid}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });

      // Always send what's in the form — the API drops an all-blank surcharge itself, so a tax class
      // chosen before an amount is entered survives the save instead of being silently discarded.
      await fetch(`${API}/payment-providers/${alias}/surcharge?marketId=${mid}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          taxClassId: this.editing.surcharge.taxClassId || null,
          amount: Number(this.editing.surcharge.amount) || 0,
        }),
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
    const isSecret = field.type === 'Secret';
    const revealed = Boolean(this.revealed?.[field.key]);
    const type = isSecret && !revealed ? 'password' : field.type === 'Number' ? 'number' : 'text';
    return html`
      <uui-label>${field.label}${field.required ? ' *' : ''}</uui-label>
      <div class="secret-row">
        <uui-input
          type=${type}
          .value=${typeof value === 'string' ? value : ''}
          placeholder=${isSecret ? 'Leave blank to keep current' : ''}
          @input=${(e) => this.setFieldValue(field.key, e.target.value)}></uui-input>
        ${isSecret
          ? html`<uui-button
              compact
              look="secondary"
              label=${revealed ? 'Hide the secret' : 'Show the stored secret'}
              @click=${() =>
                revealed
                  ? (this.revealed = { ...this.revealed, [field.key]: false })
                  : this.revealSecret(field.key)}>
              <uui-icon name=${revealed ? 'icon-eye-off' : 'icon-eye'}></uui-icon>
            </uui-button>`
          : ''}
      </div>
      ${field.helpText ? html`<small>${field.helpText}</small>` : ''}
    `;
  }

  render() {
    if (this.loading) return html`<uui-loader></uui-loader>`;
    if (!this.embedded && !this.marketId) {
      return html`<uui-box>${this._marketSelector()}<p>Select a store to manage its payment providers.</p></uui-box>`;
    }
    return this.editing ? this.renderEditView() : this.renderListView();
  }

  _marketSelector() {
    if (this.embedded) return '';
    return html`
      <div class="row">
        <uui-label for="market">Market</uui-label>
        <select id="market" @change=${this.onMarketChange}>
          ${this.markets.map((m) => html`<option value=${m.id} ?selected=${m.id === this.marketId}>${m.name}</option>`)}
        </select>
      </div>`;
  }

  renderListView() {
    return html`
      <uui-box headline="Payment providers">
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}
        ${this._marketSelector()}

        <div class="row order-status-row">
          <uui-label for="order-status">Order status after payment</uui-label>
          <select id="order-status" @change=${(e) => this.setOrderStatus(e.target.value)}>
            <option value="" ?selected=${!this.orderStatusAfterPayment}>Default ("paid")</option>
            ${this.orderStatuses.map((s) => html`<option value=${s.code} ?selected=${s.code === this.orderStatusAfterPayment}>${s.name}</option>`)}
          </select>
          <small>Applies regardless of which provider is active, from this tenant's order statuses.</small>
        </div>

        <div class="toolbar">
          <div class="create">
            <select @change=${(e) => (this.addAlias = e.target.value)}>
              <option value="">Choose a provider…</option>
              ${this.unconfigured.map((d) => html`<option value=${d.alias} ?selected=${d.alias === this.addAlias}>${d.displayName}</option>`)}
            </select>
            <uui-button label="Create payment method" look="primary" ?disabled=${!this.addAlias} @click=${this.startAdd}></uui-button>
          </div>
          <div class="active-select">
            <uui-label for="active">Active</uui-label>
            <select id="active" @change=${(e) => this.setActive(e.target.value)}>
              <option value="" ?selected=${!this.active}>None (default / sole provider)</option>
              ${this.providers.map((p) => html`<option value=${p.alias} ?selected=${p.alias === this.active}>${p.displayName}</option>`)}
            </select>
          </div>
        </div>

        ${this.providers.length === 0
          ? html`<p class="empty">No payment methods configured for this store yet.</p>`
          : html`
              <uui-table class="methods">
                <uui-table-head>
                  <uui-table-head-cell>Name</uui-table-head-cell>
                  <uui-table-head-cell>Provider</uui-table-head-cell>
                  <uui-table-head-cell></uui-table-head-cell>
                  <uui-table-head-cell></uui-table-head-cell>
                </uui-table-head>
                ${this.providers.map(
                  (p) => html`
                    <uui-table-row>
                      <uui-table-cell class="name-cell" @click=${() => this.startEdit(p.alias)}>
                        <uui-icon name="icon-bill"></uui-icon>
                        <strong>${p.displayName}</strong>
                        ${p.alias === this.active ? html`<uui-tag color="positive" look="secondary">active</uui-tag>` : ''}
                        ${!p.known ? html`<uui-tag color="warning" look="secondary">unknown</uui-tag>` : ''}
                      </uui-table-cell>
                      <uui-table-cell><span class="alias">${p.alias}</span></uui-table-cell>
                      <uui-table-cell><uui-button label="Edit" look="secondary" compact @click=${() => this.startEdit(p.alias)}></uui-button></uui-table-cell>
                      <uui-table-cell><uui-button label="Delete" look="secondary" color="danger" compact @click=${() => this.remove(p.alias)}></uui-button></uui-table-cell>
                    </uui-table-row>`
                )}
              </uui-table>`}
      </uui-box>
    `;
  }

  renderEditView() {
    const d = this.descriptor(this.editing.alias);
    const isActive = this.active === this.editing.alias;
    return html`
      <uui-box>
        <div slot="headline" class="edit-head">
          <uui-button compact look="secondary" label="Back" @click=${this.backToList}><uui-icon name="icon-arrow-left"></uui-icon></uui-button>
          <span>${d?.displayName ?? this.editing.alias}</span>
        </div>
        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <div class="edit-grid">
          <div class="edit-main">
            ${d?.fields.map((f) => html`<div class="field">${this.renderField(f)}</div>`)}

            <div class="surcharge">
              <h5>Surcharge fee (optional)</h5>
              <div class="field">
                <uui-label>Tax Class</uui-label>
                <select @change=${(e) => this.setSurchargeField('taxClassId', e.target.value)}>
                  <option value="" ?selected=${!this.editing.surcharge.taxClassId}>None</option>
                  ${this.taxClasses.map((tc) => html`<option value=${tc.id} ?selected=${tc.id === this.editing.surcharge.taxClassId}>${tc.name}</option>`)}
                </select>
              </div>
              <div class="field">
                <uui-label>Default Pricing</uui-label>
                <uui-input type="number" .value=${this.editing.surcharge.amount}
                  @input=${(e) => this.setSurchargeField('amount', e.target.value)}></uui-input>
              </div>
            </div>
          </div>
          <aside class="edit-info">
            <div class="info-title">Info</div>
            <div class="info-row"><span>Payment Provider Alias</span><code>${this.editing.alias}</code></div>
            ${this.editing.isNew
              ? html`<p class="info-note">Save first, then set this provider active for the store.</p>`
              : html`<uui-toggle label="Active for this store" ?checked=${isActive}
                    @change=${(e) => this.setActive(e.target.checked ? this.editing.alias : '')}>Active for this store</uui-toggle>`}
          </aside>
        </div>

        <div class="actions">
          ${!this.editing.isNew
            ? html`<uui-button label="Delete" look="secondary" color="danger" @click=${() => { const a = this.editing.alias; this.backToList(); this.remove(a); }}></uui-button>`
            : ''}
          <span class="spacer"></span>
          <uui-button label="Cancel" look="secondary" @click=${this.backToList}></uui-button>
          <uui-button label=${this.saving ? 'Saving…' : 'Save'} look="primary" color="positive" ?disabled=${this.saving} @click=${this.save}></uui-button>
        </div>
      </uui-box>
    `;
  }

  static styles = css`
    :host { display: block; padding: var(--uui-size-layout-1); }
    .row { display: flex; align-items: center; gap: var(--uui-size-space-4); margin-bottom: var(--uui-size-space-4); }
    .order-status-row { flex-wrap: wrap; }
    .order-status-row small { width: 100%; color: var(--uui-color-text-alt); }
    select { padding: 6px 8px; min-width: 240px; border: 1px solid var(--uui-color-border); border-radius: 4px; }

    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--uui-size-space-4); margin-bottom: var(--uui-size-space-5); flex-wrap: wrap; }
    .create { display: flex; align-items: center; gap: var(--uui-size-space-3); }
    .active-select { display: flex; align-items: center; gap: var(--uui-size-space-3); }

    .methods { width: 100%; }
    .name-cell { display: flex; align-items: center; gap: var(--uui-size-space-3); cursor: pointer; }
    .alias { color: var(--uui-color-text-alt); font-size: 0.85rem; }
    .empty { color: var(--uui-color-text-alt); }

    .edit-head { display: flex; align-items: center; gap: var(--uui-size-space-3); }
    .edit-grid { display: flex; gap: var(--uui-size-layout-1); align-items: flex-start; }
    .edit-main { flex: 1; min-width: 0; }
    .edit-info { width: 280px; flex-shrink: 0; background: var(--uui-color-surface-alt); border: 1px solid var(--uui-color-border); border-radius: 6px; padding: 16px; }
    .info-title { font-weight: 700; margin-bottom: 12px; }
    .info-row { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
    .info-row span { color: var(--uui-color-text-alt); font-size: 0.8rem; }
    .info-row code { font-size: 0.85rem; word-break: break-all; }
    .info-note { color: var(--uui-color-text-alt); font-size: 0.85rem; }

    .field { margin-bottom: var(--uui-size-space-4); display: flex; flex-direction: column; gap: 4px; }
    .field uui-input { width: 100%; max-width: 480px; }
    .secret-row { display: flex; align-items: center; gap: 4px; max-width: 520px; }
    .secret-row uui-input { flex: 1; }
    .surcharge { margin-top: var(--uui-size-space-5); padding-top: var(--uui-size-space-4); border-top: 1px solid var(--uui-color-border); }
    .surcharge h5 { margin: 0 0 var(--uui-size-space-4) 0; }
    .actions { display: flex; gap: var(--uui-size-space-3); align-items: center; margin-top: var(--uui-size-space-5); padding-top: var(--uui-size-space-4); border-top: 1px solid var(--uui-color-border); }
    .actions .spacer { flex: 1; }
    .error { background: var(--uui-color-danger); color: #fff; padding: 8px 12px; border-radius: 4px; margin-bottom: var(--uui-size-space-4); }
    small { color: var(--uui-color-text-alt); }
  `;
}

customElements.define('ecomm-payment-providers-dashboard', ECommPaymentProvidersDashboard);
export default ECommPaymentProvidersDashboard;
