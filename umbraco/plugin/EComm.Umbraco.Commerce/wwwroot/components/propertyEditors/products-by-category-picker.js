import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

/**
 * Content-editing property editor UI: pick one or more commerce Products from a
 * category configured once on the data type (the "Category" setting, read via
 * config.getValueByAlias('category')). Stores an array of product ids
 * (propertyEditorSchemaAlias: Umbraco.Plain.Json).
 *
 * Search + pagination are SERVER-SIDE: each keystroke/page change re-fetches one
 * page from GET .../products/{categoryId}?page&pageSize&search (which returns the
 * true total across all pages), so this scales past the ~600 products a single
 * category can hold today without ever loading them all into the browser.
 */
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

class ECommProductsByCategoryPicker extends UmbElementMixin(LitElement) {
  static properties = {
    value: { type: Array },
    _products: { type: Array, state: true },
    _total: { type: Number, state: true },
    _page: { type: Number, state: true },
    _search: { type: String, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
  };

  constructor() {
    super();
    this.value = [];
    this._categoryId = null;
    this._products = [];
    this._total = 0;
    this._page = 1;
    this._search = '';
    this._loading = false;
    this._error = null;
    // id -> name for every product seen, so selected chips still render a name
    // even when that product isn't on the current page.
    this._names = {};
    this._searchTimer = null;

    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
      this._maybeLoad();
    });
  }

  // Data-type config is assigned as a plain `.config` property by the host.
  set config(config) {
    const categoryId = config?.getValueByAlias?.('category') || null;
    if (categoryId !== this._categoryId) {
      this._categoryId = categoryId;
      this._page = 1;
      this._maybeLoad();
    }
  }

  // Umbraco.Plain.Json hands us a JS array; tolerate a JSON string just in case.
  set value(v) {
    let next = v;
    if (typeof v === 'string') {
      try { next = JSON.parse(v); } catch { next = []; }
    }
    this._value = Array.isArray(next) ? next : [];
  }
  get value() {
    return this._value;
  }

  get _selected() {
    return new Set(this._value);
  }

  _maybeLoad() {
    if (this._authContext && this._categoryId) this._load();
  }

  async _getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async _load() {
    if (!this._categoryId) {
      this._error = 'No category configured on this data type.';
      return;
    }
    this._loading = true;
    this._error = null;
    try {
      const headers = await this._getAuthHeaders();
      const params = new URLSearchParams({ page: String(this._page), pageSize: String(PAGE_SIZE) });
      if (this._search.trim()) params.set('search', this._search.trim());
      const res = await fetch(
        `/umbraco/management/api/ecomm-commerce/products/${encodeURIComponent(this._categoryId)}?${params}`,
        { headers, credentials: 'include' }
      );
      if (res.ok) {
        const result = await res.json();
        this._products = result.products || [];
        this._total = result.totalCount ?? this._products.length;
        for (const p of this._products) this._names[p.id] = p.name;
      } else {
        this._error = 'Failed to load products. Check Commerce Settings.';
      }
    } catch (err) {
      console.error('Failed to load products for category:', err);
      this._error = 'Failed to load products: ' + err.message;
    } finally {
      this._loading = false;
    }
  }

  _commit(nextValue) {
    this.value = nextValue;
    this.requestUpdate();
    // Persisted by the host, which reads `.value` off this element synchronously.
    this.dispatchEvent(new CustomEvent('property-value-change', {
      detail: { value: this._value }, bubbles: true, composed: true
    }));
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this._value }, bubbles: true, composed: true
    }));
  }

  _toggle(id) {
    const selected = this._selected;
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    this._commit([...selected]);
  }

  _remove(id) {
    this._commit(this._value.filter(x => x !== id));
  }

  _onSearchInput(e) {
    this._search = e.target.value;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => { this._page = 1; this._load(); }, SEARCH_DEBOUNCE_MS);
  }

  _prevPage() {
    if (this._page > 1) { this._page--; this._load(); }
  }

  _nextPage() {
    if (this._page * PAGE_SIZE < this._total) { this._page++; this._load(); }
  }

  render() {
    if (this._error) {
      return html`
        <div class="error">
          <uui-icon name="alert"></uui-icon><span>${this._error}</span>
          ${this._categoryId ? html`<uui-button look="secondary" @click=${this._load}>Retry</uui-button>` : ''}
        </div>`;
    }

    const totalPages = Math.max(1, Math.ceil(this._total / PAGE_SIZE));
    const selected = this._selected;

    return html`
      ${this._value.length > 0 ? html`
        <div class="chips">
          ${this._value.map(id => html`
            <span class="chip">
              ${this._names[id] || id}
              <button type="button" class="chip-x" title="Remove" @click=${() => this._remove(id)}>×</button>
            </span>
          `)}
        </div>
      ` : ''}

      <uui-input
        type="search"
        placeholder="Search products by name or SKU…"
        .value=${this._search}
        @input=${this._onSearchInput}>
      </uui-input>

      ${this._loading ? html`
        <div class="loading"><uui-loader></uui-loader><span>Loading…</span></div>
      ` : html`
        ${this._products.length === 0 ? html`
          <p class="empty">No products found${this._search ? ' for this search' : ' in this category'}.</p>
        ` : html`
          <div class="list">
            ${this._products.map(p => html`
              <label class="row">
                <uui-checkbox
                  ?checked=${selected.has(p.id)}
                  @change=${() => this._toggle(p.id)}>
                </uui-checkbox>
                <span class="row-name">${p.name}</span>
                <span class="row-sku">${p.sku || ''}</span>
              </label>
            `)}
          </div>
        `}

        <div class="pager">
          <uui-button look="secondary" compact ?disabled=${this._page <= 1} @click=${this._prevPage}>‹ Prev</uui-button>
          <span class="pager-info">Page ${this._page} of ${totalPages} · ${this._total} total · ${this._value.length} selected</span>
          <uui-button look="secondary" compact ?disabled=${this._page >= totalPages} @click=${this._nextPage}>Next ›</uui-button>
        </div>
      `}
    `;
  }

  static styles = css`
    :host { display: block; }
    uui-input { width: 100%; margin-bottom: var(--uui-size-space-2); }
    .loading, .error { display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2); }
    .error { color: var(--uui-color-danger); }
    .empty { color: var(--uui-color-text-alt); font-style: italic; padding: var(--uui-size-space-2); }
    .chips { display: flex; flex-wrap: wrap; gap: var(--uui-size-space-1); margin-bottom: var(--uui-size-space-2); }
    .chip { display: inline-flex; align-items: center; gap: var(--uui-size-space-1); background: var(--uui-color-surface-alt); border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); padding: 2px var(--uui-size-space-2); font-size: var(--uui-size-4); }
    .chip-x { border: none; background: none; cursor: pointer; font-size: 1.1em; line-height: 1; color: var(--uui-color-text-alt); }
    .chip-x:hover { color: var(--uui-color-danger); }
    .list { border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); max-height: 320px; overflow-y: auto; }
    .row { display: flex; align-items: center; gap: var(--uui-size-space-3); padding: var(--uui-size-space-2); border-bottom: 1px solid var(--uui-color-divider); cursor: pointer; }
    .row:last-child { border-bottom: none; }
    .row-name { flex: 1; }
    .row-sku { color: var(--uui-color-text-alt); font-size: var(--uui-size-4); }
    .pager { display: flex; align-items: center; justify-content: space-between; gap: var(--uui-size-space-2); margin-top: var(--uui-size-space-2); }
    .pager-info { color: var(--uui-color-text-alt); font-size: var(--uui-size-4); text-align: center; flex: 1; }
  `;
}

customElements.define('ecomm-products-by-category-picker', ECommProductsByCategoryPicker);
export default ECommProductsByCategoryPicker;
