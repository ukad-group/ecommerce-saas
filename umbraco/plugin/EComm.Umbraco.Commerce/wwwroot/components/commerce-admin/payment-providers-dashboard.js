import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
// The shared design kit — see umbraco/docs/DESIGN-SYSTEM.md before adding UI here.
import {
  commerceStyles, viewHeader, viewFooter, errorBanner, loadingState, emptyState,
  formRow, checkRow, iconButton, pill, refreshButton, createButton, confirmDelete,
} from '../shared/commerce-ui.js';

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
    marketName: { type: String },
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
    this.marketName = '';
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
      // Order statuses are per store, so they load with the rest of the market's data in
      // loadProviders() — here we only need what is the same for every store.
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
    const [data, tax, statuses] = await Promise.all([
      fetch(`${API}/payment-providers?marketId=${encodeURIComponent(this.marketId)}`, { headers }).then((r) => r.json()),
      fetch(`${API}/tax-classes?marketId=${encodeURIComponent(this.marketId)}`, { headers }).then((r) => r.json()),
      fetch(`${API}/order-statuses?marketId=${encodeURIComponent(this.marketId)}`, { headers }).then((r) => r.json()),
    ]);
    // "Status after payment" must offer this store's statuses, not another store's.
    this.orderStatuses = Array.isArray(statuses) ? statuses.filter((s) => s.isActive) : [];
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

  /**
  * NOT named `remove`: that would shadow Element.prototype.remove(), and lit-html's part cleanup
  * calls node.remove() to detach this element when the dashboard switches view — which would run a
  * provider delete (and leave the element on screen) instead of removing it.
  */
  async deleteProvider(alias) {
    const name = this.descriptor(alias)?.displayName ?? alias;
    if (!await confirmDelete(this, name)) return;
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
      return checkRow(field.label, Boolean(value),
        (e) => this.setFieldValue(field.key, e.target.checked), field.helpText);
    }

    const isSecret = field.type === 'Secret';
    const revealed = Boolean(this.revealed?.[field.key]);
    const type = isSecret && !revealed ? 'password' : field.type === 'Number' ? 'number' : 'text';
    return formRow(`${field.label}${field.required ? ' *' : ''}`, html`
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
      </div>`,
      field.helpText);
  }


  render() {
    if (this.loading) return html`<div class="view-container">${loadingState('Loading payment providers…')}</div>`;
    if (!this.embedded && !this.marketId) {
      return html`
        <div class="view-container">
          ${viewHeader('Payment Providers')}
          ${emptyState('icon-bill', 'Select a store to manage its payment providers')}
        </div>`;
    }
    return this.editing ? this.renderEditView() : this.renderListView();
  }

  get breadcrumb() {
    return `${this.marketName || 'Store'} / Options / Payment Providers`;
  }

  /** Standalone only — embedded, the store comes from the dashboard's tree. */
  _marketSelector() {
    if (this.embedded) return '';
    return html`
      <select class="form-input" @change=${this.onMarketChange}>
        ${this.markets.map((m) => html`<option value=${m.id} ?selected=${m.id === this.marketId}>${m.name}</option>`)}
      </select>`;
  }

  renderListView() {
    return html`
      <div class="view-container">
        ${viewHeader('Payment Providers', html`
          ${this._marketSelector()}
          ${refreshButton(() => this.loadProviders())}
          <div class="form-inline">
            <select class="form-input" @change=${(e) => (this.addAlias = e.target.value)}>
              <option value="">Choose a provider…</option>
              ${this.unconfigured.map((d) => html`<option value=${d.alias} ?selected=${d.alias === this.addAlias}>${d.displayName}</option>`)}
            </select>
            ${createButton('Payment Method', this.startAdd)}
          </div>`)}

        ${errorBanner(this.error, () => { this.error = null; })}

        <!-- Store-level settings, the same shape as the Tax Classes store rate: they belong on this
             screen because this is where people come to change how payment behaves. -->
        <div class="form-panel">
          ${formRow('Order status after payment', html`
            <select class="form-input" @change=${(e) => this.setOrderStatus(e.target.value)}>
              <option value="" ?selected=${!this.orderStatusAfterPayment}>Default ("paid")</option>
              ${this.orderStatuses.map((s) => html`<option value=${s.code} ?selected=${s.code === this.orderStatusAfterPayment}>${s.name}</option>`)}
            </select>`,
            "Applies regardless of which provider is active, from this store's order statuses.")}
          ${formRow('Active provider', html`
            <select class="form-input" @change=${(e) => this.setActive(e.target.value)}>
              <option value="" ?selected=${!this.active}>None (default / sole provider)</option>
              ${this.providers.map((p) => html`<option value=${p.alias} ?selected=${p.alias === this.active}>${p.displayName}</option>`)}
            </select>`,
            'The provider the storefront starts a payment with.')}
        </div>

        ${this.providers.length === 0
          ? emptyState('icon-bill', 'No payment methods configured for this store yet',
              'Pick a provider above and create it to get started.')
          : html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Name</th><th>Provider</th><th>State</th><th class="col-actions"></th>
                </tr></thead>
                <tbody>
                  ${this.providers.map((p) => html`
                    <tr class="data-row" title="Edit ${p.displayName}" @click=${() => this.startEdit(p.alias)}>
                      <td>
                        <div class="name-cell">
                          <uui-icon class="row-icon" name="icon-bill"></uui-icon>
                          <strong>${p.displayName}</strong>
                        </div>
                      </td>
                      <td><code>${p.alias}</code></td>
                      <td>
                        ${p.alias === this.active ? pill('Active', 'active') : pill('Inactive', 'inactive')}
                        ${!p.known ? pill('Unknown', 'warning') : ''}
                      </td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${p.displayName}`, onClick: () => this.deleteProvider(p.alias) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>`}

        ${viewFooter(this.breadcrumb,
          this.providers.length ? `${this.providers.length} payment method${this.providers.length !== 1 ? 's' : ''}` : '')}
      </div>`;
  }

  /**
   * Kept inline rather than in a modal: a provider's schema-driven form plus its info panel is a
   * screen's worth of settings, not a single question.
   */
  renderEditView() {
    const d = this.descriptor(this.editing.alias);
    const isActive = this.active === this.editing.alias;
    return html`
      <div class="view-container">
        <div class="view-header">
          <div class="detail-breadcrumb">
            <button class="back-btn" @click=${this.backToList}>← Payment Providers</button>
            <span class="breadcrumb-sep">/</span>
            <span class="detail-order-num">${d?.displayName ?? this.editing.alias}</span>
          </div>
        </div>

        ${errorBanner(this.error, () => { this.error = null; })}

        <!-- The form scrolls, not the whole view, so the footer stays put like every list view. -->
        <div class="edit-scroll">
        <div class="form-panel">
          <div class="edit-grid">
            <div class="edit-main">
              ${d?.fields.map((f) => this.renderField(f))}

              <h4>Surcharge fee (optional)</h4>
              ${formRow('Tax Class', html`
                <select class="form-input" @change=${(e) => this.setSurchargeField('taxClassId', e.target.value)}>
                  <option value="" ?selected=${!this.editing.surcharge.taxClassId}>None</option>
                  ${this.taxClasses.map((tc) => html`<option value=${tc.id} ?selected=${tc.id === this.editing.surcharge.taxClassId}>${tc.name}</option>`)}
                </select>`)}
              ${formRow('Default Pricing', html`
                <input class="form-input form-input--sm" type="number" .value=${this.editing.surcharge.amount}
                  @input=${(e) => this.setSurchargeField('amount', e.target.value)}>`)}
            </div>

            <aside class="detail-section-block edit-info">
              <div class="detail-label">Info</div>
              <p><span class="muted">Payment Provider Alias</span><br><code>${this.editing.alias}</code></p>
              ${this.editing.isNew
                ? html`<p class="form-hint">Save first, then set this provider active for the store.</p>`
                : html`<uui-toggle label="Active for this store" ?checked=${isActive}
                      @change=${(e) => this.setActive(e.target.checked ? this.editing.alias : '')}>Active for this store</uui-toggle>`}
            </aside>
          </div>

          <div class="form-actions">
            ${!this.editing.isNew
              ? html`<uui-button look="secondary" color="danger" label="Delete"
                  @click=${() => { const a = this.editing.alias; this.backToList(); this.deleteProvider(a); }}>Delete</uui-button>`
              : ''}
            <span class="spacer"></span>
            <uui-button look="secondary" label="Cancel" @click=${this.backToList}>Cancel</uui-button>
            <uui-button look="primary" color="positive" label="Save" ?disabled=${this.saving}
              @click=${this.save}>${this.saving ? 'Saving…' : 'Save'}</uui-button>
          </div>
        </div>
        </div>

        ${viewFooter(this.breadcrumb, d?.displayName ?? this.editing.alias)}
      </div>`;
  }

  // Only what the kit doesn't cover: this view's two-column edit layout.
  static styles = [commerceStyles, css`
    /* "Merchant handles consumer data" is the longest label in the section; a wider label column
       keeps these on one line without changing any other surface. */
    :host { display: block; height: 100%; --ec-label-col: 210px; }

    .edit-scroll { flex: 1; min-height: 0; overflow-y: auto; }
    .edit-grid { display: flex; gap: 24px; align-items: flex-start; }
    .edit-main { flex: 1; min-width: 0; }
    .edit-info { width: 280px; flex-shrink: 0; }
    .edit-info p { margin: 0 0 12px; font-size: 0.84rem; }
    .edit-info code { word-break: break-all; }

    .form-actions .spacer { flex: 1; }

    .secret-row { display: flex; align-items: center; gap: 4px; }
    .secret-row uui-input { flex: 1; min-width: 0; }
  `];
}

customElements.define('ecomm-payment-providers-dashboard', ECommPaymentProvidersDashboard);
export default ECommPaymentProvidersDashboard;
