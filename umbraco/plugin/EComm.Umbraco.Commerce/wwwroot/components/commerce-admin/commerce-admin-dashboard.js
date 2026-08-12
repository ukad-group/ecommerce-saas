import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import '@umbraco-cms/backoffice/media'; // registers the native <umb-input-rich-media> element
import './payment-providers-dashboard.js'; // registers <ecomm-payment-providers-dashboard> (Options → Payment Providers)

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['pending', 'processing', 'paid', 'shipped', 'cancelled', 'refunded'];
const PAYMENT_STATUSES = ['initialized', 'authorized', 'paid', 'cancelled', 'refunded'];

const ORDER_STATUS_LABELS = {
  new: 'New', pending: 'New', submitted: 'Submitted', processing: 'Processing',
  paid: 'Paid', shipped: 'Shipped', completed: 'Completed',
  cancelled: 'Cancelled', 'on-hold': 'On Hold', refunded: 'Refunded',
};
const PAYMENT_STATUS_LABELS = { initialized: 'Initialized', authorized: 'Authorized', paid: 'Paid', cancelled: 'Cancelled', refunded: 'Refunded' };

// `detail` is the drill-down view the nav item stays highlighted for.
const NAV_ITEMS = [
  { key: 'orders',    label: 'Orders',     icon: 'icon-document',         enabled: true, detail: 'order-detail' },
  { key: 'carts',     label: 'Carts',      icon: 'icon-shopping-basket',  enabled: true, detail: 'cart-detail'  },
  { key: 'discounts', label: 'Discounts',  icon: 'icon-tag',              enabled: true  },
  { key: 'analytics', label: 'Analytics',  icon: 'icon-chart',            enabled: true  },
];

const OPTIONS_SUBITEMS = [
  { key: 'currencies',            label: 'Currencies',                  icon: 'icon-coins',    enabled: true },
  { key: 'countries',             label: 'Countries',                   icon: 'icon-flag',     enabled: true },
  { key: 'order-statuses',        label: 'Order Statuses',              icon: 'icon-settings', enabled: true },
  { key: 'payment-providers',     label: 'Payment Providers',           icon: 'icon-bill',     enabled: true },
  { key: 'attributes',            label: 'Product Attributes',          icon: 'icon-tag',      enabled: true },
  { key: 'property-templates',    label: 'Property Templates',          icon: 'icon-list',     enabled: true },
  { key: 'tax-classes',           label: 'Tax Classes',                 icon: 'icon-calculator', enabled: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slugify = s => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const getOrderStatusLabel  = s => ORDER_STATUS_LABELS[s]   || s || 'Unknown';
const getPaymentStatusLabel = s => PAYMENT_STATUS_LABELS[s] || s || 'Unknown';
const derivePaymentStatus  = s => s === 'paid' ? 'paid' : (s === 'cancelled' || s === 'refunded' ? s : 'initialized');

// ─── Component ───────────────────────────────────────────────────────────────

class CommerceAdminDashboard extends UmbElementMixin(LitElement) {
  static properties = {
    // navigation
    activeView:     { type: String  },
    expandedStores: { type: Object },
    // Both Sets of market ids: sidebar state is per store, so one store's open node never opens another's.
    optionsOpenStores: { type: Object },
    marketName:     { type: String  },
    // multi-market
    markets:          { type: Array  },
    selectedMarketId: { type: String },
    // orders
    orders:              { type: Array   },
    ordersLoading:       { type: Boolean },
    ordersError:         { type: String  },
    orderStatusFilter:   { type: String  },
    paymentStatusFilter: { type: String  },
    ordersSearch:        { type: String  },
    showOSMenu:          { type: Boolean },
    showPSMenu:          { type: Boolean },
    selectedOrder:       { type: Object  },
    updatingStatusId:    { type: String  },
    allSelected:         { type: Boolean },
    selectedIds:         { type: Object  },
    // pagination
    currentPage:         { type: Number  },
    pageSize:            { type: Number  },
    totalCount:          { type: Number  },
    // carts
    carts:           { type: Array   },
    cartsLoading:    { type: Boolean },
    cartsError:      { type: String  },
    cartsSearch:     { type: String  },
    selectedCart:    { type: Object  },
    cartsPage:       { type: Number  },
    cartsTotalCount: { type: Number  },
    // analytics
    analyticsOrders:   { type: Array   },
    analyticsLoading:  { type: Boolean },
    analyticsError:    { type: String  },
    // order statuses tab
    orderStatuses:        { type: Array   },
    orderStatusesLoading: { type: Boolean },
    orderStatusesError:   { type: String  },
    editingOrderStatus:   { type: Object  },
    // status definitions loaded on init (drives pill colors + filter options)
    statusDefs: { type: Array },
    // discounts
    discounts:        { type: Array   },
    discountsLoading: { type: Boolean },
    discountsError:   { type: String  },
    editingDiscount:  { type: Object  },
    defaultAliases:       { type: Object  },
    // property templates
    propertyTemplates:        { type: Array   },
    propertyTemplatesLoading: { type: Boolean },
    propertyTemplatesError:   { type: String  },
    editingTemplate:          { type: Object  },
    propertyTemplatesSearch:  { type: String  },
    propertyTemplatesPage:    { type: Number  },
    // product attributes
    attributes:               { type: Array   },
    attributesLoading:        { type: Boolean },
    attributesError:          { type: String  },
    editingAttribute:         { type: Object  },
    attributesSearch:         { type: String  },
    attributesPage:           { type: Number  },
    // product attribute presets
    attributePresets:         { type: Array   },
    attributePresetsLoading:  { type: Boolean },
    attributePresetsError:    { type: String  },
    editingAttributePreset:   { type: Object  },
    attributePresetsSearch:   { type: String  },
    attributePresetsPage:     { type: Number  },
    // tax classes
    taxClasses:               { type: Array   },
    taxClassesLoading:        { type: Boolean },
    taxClassesError:          { type: String  },
    editingTaxClass:          { type: Object  },
    storeTaxRate:             { type: Number  },
    // null ⇒ not being edited, so the field shows the stored rate and saves leave it alone.
    storeTaxRateDraft:        { type: String  },
    // The ISO 3166 reference list — what countries are created FROM, not the store's own.
    countries:                { type: Array   },
    // currencies (store-scoped)
    currencies:               { type: Array   },
    currenciesLoading:        { type: Boolean },
    currenciesError:          { type: String  },
    editingCurrency:          { type: Object  },
    currenciesSearch:         { type: String  },
    currenciesPage:           { type: Number  },
    activeCurrencyCode:       { type: String  },
    currencyPresets:          { type: Object  },
    // filters the "Available in Countries" toggles inside the currency editor
    currencyCountryFilter:    { type: String  },
    // countries the store sells to (store-scoped, with checkout defaults)
    marketCountries:          { type: Array   },
    marketCountriesLoading:   { type: Boolean },
    marketCountriesError:     { type: String  },
    editingMarketCountry:     { type: Object  },
    marketCountriesSearch:    { type: String  },
    marketCountriesPage:      { type: Number  },
    // dropdown sources for a country's checkout defaults
    shippingMethods:          { type: Array   },
    marketPaymentProviders:   { type: Array   },
    // which Create flyout is open: '' | 'currency' | 'country'
    createMenu:               { type: String  },
  };

  constructor() {
    super();
    this.activeView    = 'home';
    this.expandedStores = new Set();
    this.optionsOpenStores = new Set();
    this.marketName    = 'Store';
    this.markets = []; this.selectedMarketId = '';

    this.orders = []; this.ordersLoading = false; this.ordersError = null;
    this.orderStatusFilter = ''; this.paymentStatusFilter = ''; this.ordersSearch = '';
    this.showOSMenu = false; this.showPSMenu = false;
    this.selectedOrder = null; this.updatingStatusId = null;
    this.allSelected = false; this.selectedIds = new Set();
    this.currentPage = 1; this.pageSize = 20; this.totalCount = 0;

    this.carts = []; this.cartsLoading = false; this.cartsError = null; this.cartsSearch = '';
    this.selectedCart = null; this.cartsPage = 1; this.cartsTotalCount = 0;

    this.analyticsOrders = []; this.analyticsLoading = false; this.analyticsError = null;

    this.orderStatuses = []; this.orderStatusesLoading = false; this.orderStatusesError = null;
    this.editingOrderStatus = null;
    this.statusDefs = [];

    this.discounts = []; this.discountsLoading = false; this.discountsError = null; this.editingDiscount = null;
    this.defaultAliases = null;
    this.propertyTemplates = []; this.propertyTemplatesLoading = false; this.propertyTemplatesError = null; this.editingTemplate = null;
    this.propertyTemplatesSearch = ''; this.propertyTemplatesPage = 1;
    this.attributes = []; this.attributesLoading = false; this.attributesError = null; this.editingAttribute = null;
    this.attributesSearch = ''; this.attributesPage = 1;
    this.attributePresets = []; this.attributePresetsLoading = false; this.attributePresetsError = null; this.editingAttributePreset = null;
    this.attributePresetsSearch = ''; this.attributePresetsPage = 1;
    this.taxClasses = []; this.taxClassesLoading = false; this.taxClassesError = null; this.editingTaxClass = null;
    this.storeTaxRate = 0; this.storeTaxRateDraft = null;
    this.countries = [];
    this.currencies = []; this.currenciesLoading = false; this.currenciesError = null; this.editingCurrency = null;
    this.currenciesSearch = ''; this.currenciesPage = 1; this.activeCurrencyCode = ''; this.currencyPresets = null;
    this.currencyCountryFilter = '';
    // Which store `currencies` was loaded for — formatCurrency must never format store B's money
    // with store A's culture. Same guard for `statusDefs`, which colours the order pills.
    this._currenciesMarketId = null;
    this._statusDefsMarketId = null;
    this.marketCountries = []; this.marketCountriesLoading = false; this.marketCountriesError = null;
    this.editingMarketCountry = null; this.marketCountriesSearch = ''; this.marketCountriesPage = 1;
    this.shippingMethods = []; this.marketPaymentProviders = [];
    this.createMenu = '';

    this.consumeContext(UMB_AUTH_CONTEXT, ctx => { this._authContext = ctx; });
    this._closeMenus = () => { this.showOSMenu = false; this.showPSMenu = false; this.createMenu = ''; };
  }

  connectedCallback() {
    super.connectedCallback();
    this._init();
    document.addEventListener('click', this._closeMenus);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._closeMenus);
  }

  async _init() {
    const s = await this._fetchSettings(await this.getAuthHeaders());

    // Load markets for the tenant
    try {
      const data = await this._get('/umbraco/management/api/ecomm-commerce/markets');
      this.markets = Array.isArray(data) ? data : [];
      if (this.markets.length > 0) {
        this.selectedMarketId = this.markets[0].id;
        this.marketName = this.markets[0].name;
      } else if (s?.marketId) {
        this.marketName = s.marketId;
      }
    } catch { if (s?.marketId) this.marketName = s.marketId; }

    this.loadDefaultAliases();
    await this.loadStatusDefs();
    // No list is loaded here on purpose: the landing view is the store cards, and every view fetches
    // when it is opened (_loadView). Priming orders here is what used to leave them stale.
  }

  async loadDefaultAliases() {
    try {
      this.defaultAliases = await this._get('/umbraco/management/api/ecomm-commerce/settings/defaults');
    } catch { /* focal point defaults on, no crop */ }
  }

  // State only, no fetching — so a caller that also switches view (_selectStoreView) fetches once,
  // for the store it is switching to, instead of once for the view it is leaving.
  _setMarket(m) {
    this.selectedMarketId = m.id;
    this.marketName = m.name;
    this.currentPage = 1;
    this.cartsPage = 1;
  }

  // Statuses belong to a store, so statusDefs is reloaded whenever the selected store changes —
  // otherwise one store's Orders list would colour its pills from another store's definitions.
  async loadStatusDefs() {
    try {
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/order-statuses${this._marketQs}`);
      this.statusDefs = Array.isArray(data) ? data : [];
      this._statusDefsMarketId = this.selectedMarketId;
    } catch { /* non-fatal: falls back to CSS pill classes */ }
  }

  _ensureStatusDefs() {
    if (this._statusDefsMarketId !== this.selectedMarketId) this.loadStatusDefs();
  }

  // code → { name, color } lookup built from API data
  get statusMap() {
    const m = {};
    for (const s of this.statusDefs) m[s.code] = s;
    return m;
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async _fetchSettings(headers) {
    try {
      const r = await fetch('/umbraco/management/api/ecomm-commerce/settings', { headers, credentials: 'include' });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async _get(path) {
    const headers = await this.getAuthHeaders();
    const r = await fetch(path, { headers, credentials: 'include' });
    if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
    return r.json();
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async loadOrders() {
    this.ordersLoading = true; this.ordersError = null;
    try {
      const qs = new URLSearchParams({ page: this.currentPage, pageSize: this.pageSize });
      if (this.orderStatusFilter) qs.set('status', this.orderStatusFilter);
      if (this.ordersSearch) qs.set('search', this.ordersSearch);
      if (this.selectedMarketId) qs.set('marketId', this.selectedMarketId);
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/orders?${qs}`);
      this.orders = data.orders || [];
      this.totalCount = data.totalCount ?? 0;
      // Row selection refers to the rows that were on screen; a refetch replaces them.
      this.selectedIds = new Set();
      this.allSelected = false;
    } catch (e) { this.ordersError = e.message; }
    finally { this.ordersLoading = false; }
  }

  async updateOrderStatus(orderId, newStatus, e) {
    e?.stopPropagation();
    this.updatingStatusId = orderId;
    try {
      const headers = await this.getAuthHeaders();
      const r = await fetch(`/umbraco/management/api/ecomm-commerce/orders/${orderId}/status`, {
        method: 'PUT', headers, credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) {
        const u = await r.json();
        this.orders = this.orders.map(o => o.id === orderId ? u : o);
        if (this.selectedOrder?.id === orderId) this.selectedOrder = u;
      }
      else this.ordersError = `Update failed: ${r.statusText}`;
    } catch (e) { this.ordersError = e.message; }
    finally { this.updatingStatusId = null; }
  }

  get filteredOrders() {
    if (!this.paymentStatusFilter) return this.orders;
    return this.orders.filter(o => derivePaymentStatus(o.status) === this.paymentStatusFilter);
  }

  // ── Carts ──────────────────────────────────────────────────────────────────

  // Real carts, not orders-in-a-cart-status: the API persists carts and lists them newest-activity
  // first. Paged and searched server-side, like orders.
  async loadCarts() {
    this.cartsLoading = true; this.cartsError = null;
    try {
      const qs = new URLSearchParams({ page: this.cartsPage, pageSize: this.pageSize });
      if (this.cartsSearch) qs.set('search', this.cartsSearch);
      if (this.selectedMarketId) qs.set('marketId', this.selectedMarketId);
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/carts?${qs}`);
      this.carts = data.carts || [];
      this.cartsTotalCount = data.totalCount ?? 0;
    } catch (e) { this.cartsError = e.message; }
    finally { this.cartsLoading = false; }
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async loadAnalytics() {
    this.analyticsLoading = true; this.analyticsError = null;
    try {
      const qs = new URLSearchParams({ pageSize: '500' });
      if (this.selectedMarketId) qs.set('marketId', this.selectedMarketId);
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/orders?${qs}`);
      this.analyticsOrders = data.orders || [];
    } catch (e) { this.analyticsError = e.message; }
    finally { this.analyticsLoading = false; }
  }

  get analyticsStats() {
    const all = this.analyticsOrders;
    if (!all.length) return null;

    const revenue = all.filter(o => o.status === 'paid' || o.status === 'shipped').reduce((s, o) => s + (o.total || 0), 0);
    const paidCount = all.filter(o => o.status === 'paid' || o.status === 'shipped').length;
    const pendingCount = all.filter(o => ['pending', 'processing', 'new'].includes(o.status)).length;
    const avgValue = paidCount > 0 ? revenue / paidCount : 0;

    const byStatus = {};
    const revenueByStatus = {};
    for (const o of all) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status === 'paid' || o.status === 'shipped')
        revenueByStatus[o.status] = (revenueByStatus[o.status] || 0) + (o.total || 0);
    }

    return { total: all.length, revenue, avgValue, pendingCount, byStatus, revenueByStatus };
  }

  // ── Discounts ──────────────────────────────────────────────────────────────

  async loadDiscounts() {
    this.discountsLoading = true; this.discountsError = null;
    try {
      const qs = this.selectedMarketId ? `?marketId=${this.selectedMarketId}` : '';
      this.discounts = await this._get(`/umbraco/management/api/ecomm-commerce/discounts${qs}`);
    } catch (e) { this.discountsError = e.message; }
    finally { this.discountsLoading = false; }
  }

  async saveDiscount() {
    const d = this.editingDiscount;
    if (!d) return;
    try {
      const headers = await this.getAuthHeaders();
      const isNew = !d.id;
      const url = isNew
        ? '/umbraco/management/api/ecomm-commerce/discounts'
        : `/umbraco/management/api/ecomm-commerce/discounts/${d.id}`;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers, credentials: 'include',
        body: JSON.stringify(d)
      });
      if (r.ok) {
        this.editingDiscount = null;
        this.loadDiscounts();
      } else {
        this.discountsError = `Save failed: ${r.statusText}`;
      }
    } catch (e) { this.discountsError = e.message; }
  }

  async deleteDiscount(id) {
    try {
      const headers = await this.getAuthHeaders();
      const r = await fetch(`/umbraco/management/api/ecomm-commerce/discounts/${id}`, {
        method: 'DELETE', headers, credentials: 'include'
      });
      if (r.ok) this.loadDiscounts();
      else this.discountsError = `Delete failed: ${r.statusText}`;
    } catch (e) { this.discountsError = e.message; }
  }

  // ── Property Templates ─────────────────────────────────────────────────────

  async loadPropertyTemplates() {
    this.propertyTemplatesLoading = true; this.propertyTemplatesError = null; this.propertyTemplatesPage = 1;
    try {
      const qs = this.selectedMarketId ? `?marketId=${this.selectedMarketId}` : '';
      this.propertyTemplates = await this._get(`/umbraco/management/api/ecomm-commerce/property-templates${qs}`);
    } catch (e) { this.propertyTemplatesError = e.message; }
    finally { this.propertyTemplatesLoading = false; }
  }

  async _savePropertyTemplates(templates) {
    const headers = await this.getAuthHeaders();
    const mid = this.selectedMarketId;
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/property-templates?marketId=${mid}`, {
      method: 'PUT', headers, credentials: 'include',
      body: JSON.stringify({ templates })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async saveTemplate() {
    const t = this.editingTemplate;
    if (!t || !t.name?.trim()) { this.propertyTemplatesError = 'Name is required'; return; }
    try {
      const sortOrder = t._isNew ? this.propertyTemplates.length : t.sortOrder;
      const tmpl = { name: t.name.trim(), defaultValue: t.defaultValue || '', sortOrder, attributeId: t.attributeId || null };
      const list = t._isNew
        ? [...this.propertyTemplates, tmpl]
        : this.propertyTemplates.map((x, i) => i === t._idx ? tmpl : x);
      await this._savePropertyTemplates(list);
      this.editingTemplate = null;
      this.loadPropertyTemplates();
    } catch (e) { this.propertyTemplatesError = e.message; }
  }

  // ── Product Attributes ───────────────────────────────────────────────────────

  async loadAttributes() {
    this.attributesLoading = true; this.attributesError = null;
    try {
      const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/attributes${qs}`);
      this.attributes = Array.isArray(data) ? data : (data?.attributes ?? []);
    } catch (e) { this.attributesError = e.message; }
    finally { this.attributesLoading = false; }
  }

  async _saveAttributes(attributes) {
    const headers = await this.getAuthHeaders();
    const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/attributes${qs}`, {
      method: 'PUT', headers, credentials: 'include', body: JSON.stringify({ attributes })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async saveAttribute() {
    const a = this.editingAttribute;
    if (!a || !a.name?.trim()) { this.attributesError = 'Name is required'; return; }
    try {
      const clean = {
        id: a.id, name: a.name.trim(), alias: (a.alias || slugify(a.name)).trim(),
        values: (a.values || []).filter(v => v.name?.trim()).map(v => ({ name: v.name.trim(), alias: (v.alias || slugify(v.name)).trim() })),
      };
      const exists = this.attributes.find(x => x.id === a.id);
      const list = exists ? this.attributes.map(x => x.id === a.id ? clean : x) : [...this.attributes, clean];
      await this._saveAttributes(list);
      this.editingAttribute = null;
      this.loadAttributes();
    } catch (e) { this.attributesError = e.message; }
  }

  async deleteAttribute(id) {
    try {
      await this._saveAttributes(this.attributes.filter(x => x.id !== id));
      this.loadAttributes();
    } catch (e) { this.attributesError = e.message; }
  }

  // ── Tax Classes ──────────────────────────────────────────────────────────────

  async loadTaxClasses() {
    this.taxClassesLoading = true; this.taxClassesError = null;
    try {
      const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/tax-classes${qs}`);
      this.taxClasses = data?.taxClasses ?? [];
      this.storeTaxRate = Number(data?.taxRate) || 0;
      this.storeTaxRateDraft = null;
      if (!this.countries.length) this.countries = await this._get('/umbraco/management/api/ecomm-commerce/countries');
    } catch (e) { this.taxClassesError = e.message; }
    finally { this.taxClassesLoading = false; }
  }

  /** taxRate undefined ⇒ the API leaves the market's stored fallback rate alone. */
  async _saveTaxClasses(taxClasses, taxRate) {
    const headers = await this.getAuthHeaders();
    const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/tax-classes${qs}`, {
      method: 'PUT', headers, credentials: 'include', body: JSON.stringify({ taxClasses, taxRate })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async saveStoreTaxRate() {
    const percent = Number(this.storeTaxRateDraft);
    if (!Number.isFinite(percent) || percent < 0) { this.taxClassesError = 'Store tax rate must be zero or more.'; return; }
    this.taxClassesError = null;
    try {
      await this._saveTaxClasses(this.taxClasses, percent / 100);
      this.loadTaxClasses();
    } catch (e) { this.taxClassesError = e.message; }
  }

  async saveTaxClass() {
    const t = this.editingTaxClass;
    if (!t || !t.name?.trim()) { this.taxClassesError = 'Name is required'; return; }
    try {
      const clean = {
        id: t.id, name: t.name.trim(), defaultRate: Number(t.defaultRate) || 0,
        countryRates: (t.countryRates || []).map(r => ({ countryCode: r.countryCode, rate: Number(r.rate) || 0 })),
      };
      const exists = this.taxClasses.find(x => x.id === t.id);
      const list = exists ? this.taxClasses.map(x => x.id === t.id ? clean : x) : [...this.taxClasses, clean];
      await this._saveTaxClasses(list);
      this.editingTaxClass = null;
      this.loadTaxClasses();
    } catch (e) { this.taxClassesError = e.message; }
  }

  async deleteTaxClass(id) {
    try {
      await this._saveTaxClasses(this.taxClasses.filter(x => x.id !== id));
      this.loadTaxClasses();
    } catch (e) { this.taxClassesError = e.message; }
  }

  // ── Currencies ───────────────────────────────────────────────────────────────

  get _marketQs() {
    return this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
  }

  async loadCurrencies() {
    this.currenciesLoading = true; this.currenciesError = null;
    try {
      const [data, presets, countries] = await Promise.all([
        this._get(`/umbraco/management/api/ecomm-commerce/currencies${this._marketQs}`),
        // Reference data, identical for every store — fetch once per session.
        this.currencyPresets ?? this._get('/umbraco/management/api/ecomm-commerce/currency-presets'),
        this._get(`/umbraco/management/api/ecomm-commerce/market-countries${this._marketQs}`),
      ]);
      this.currencies = data?.currencies ?? [];
      this.activeCurrencyCode = data?.activeCode ?? '';
      this._currenciesMarketId = this.selectedMarketId;
      this.currencyPresets = presets ?? { currencies: [], cultures: [] };
      // The "Available in Countries" toggles list the store's own countries.
      this.marketCountries = countries?.countries ?? [];
    } catch (e) { this.currenciesError = e.message; }
    finally { this.currenciesLoading = false; }
  }

  // Keeps `currencies` fresh for formatCurrency without refetching per view.
  async _ensureCurrencies() {
    if (!this.selectedMarketId || this._currenciesMarketId === this.selectedMarketId) return;
    try {
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/currencies${this._marketQs}`);
      this.currencies = data?.currencies ?? [];
      this.activeCurrencyCode = data?.activeCode ?? '';
      this._currenciesMarketId = this.selectedMarketId;
    } catch { /* non-fatal: formatCurrency falls back to its built-in locale map */ }
  }

  async _saveCurrencies(currencies) {
    const headers = await this.getAuthHeaders();
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/currencies${this._marketQs}`, {
      method: 'PUT', headers, credentials: 'include', body: JSON.stringify({ currencies })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async saveCurrency() {
    const c = this.editingCurrency;
    if (!c || !c.name?.trim()) { this.currenciesError = 'Name is required'; return; }
    const code = (c.code || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) { this.currenciesError = 'ISO code must be 3 letters, e.g. SEK'; return; }
    this.currenciesError = null;
    try {
      const clean = {
        id: c.id, name: c.name.trim(), code,
        culture: c.culture || null,
        formatTemplate: c.formatTemplate?.trim() || null,
        // "All" ⇒ null, the same spelling the API stores — an empty list would read as
        // "available nowhere".
        countryCodes: c.allCountries ? null : (c.countryCodes || []),
      };
      const exists = this.currencies.find(x => x.id === c.id);
      const list = exists ? this.currencies.map(x => x.id === c.id ? clean : x) : [...this.currencies, clean];
      await this._saveCurrencies(list);
      this.editingCurrency = null;
      this.loadCurrencies();
    } catch (e) { this.currenciesError = e.message; }
  }

  async deleteCurrency(id) {
    try {
      await this._saveCurrencies(this.currencies.filter(x => x.id !== id));
      this.loadCurrencies();
    } catch (e) { this.currenciesError = e.message; }
  }

  _editCurrency(c) {
    // No stored country codes ⇒ available everywhere, which the form shows as the "All" toggle.
    this.currencyCountryFilter = '';   // a filter left from the last currency would hide toggles here
    this.editingCurrency = { ...c, countryCodes: [...(c.countryCodes || [])], allCountries: !(c.countryCodes || []).length };
  }

  startCurrency(fromPreset) {
    this.currencyCountryFilter = '';
    this.editingCurrency = {
      id: crypto.randomUUID(), name: '', code: '', culture: '', formatTemplate: '',
      countryCodes: [], allCountries: true, presetPicker: Boolean(fromPreset),
    };
  }

  applyCurrencyPreset(code) {
    const p = (this.currencyPresets?.currencies || []).find(x => x.code === code);
    if (!p) return;
    // Culture stays as-is: no default is guessable per currency (see the API's CurrencyPreset).
    this.editingCurrency = { ...this.editingCurrency, name: p.name, code: p.code };
  }

  async addAllCurrencyPresets() {
    const have = new Set(this.currencies.map(c => c.code));
    const added = (this.currencyPresets?.currencies || [])
      .filter(p => !have.has(p.code))
      .map(p => ({ id: crypto.randomUUID(), name: p.name, code: p.code, countryCodes: null }));
    if (!added.length) { this.currenciesError = 'Every ISO 4217 currency is already in the list.'; return; }
    this.currenciesError = null;
    try {
      await this._saveCurrencies([...this.currencies, ...added]);
      this.loadCurrencies();
    } catch (e) { this.currenciesError = e.message; }
  }

  // ── Countries (the store's own, with checkout defaults) ──────────────────────

  async loadMarketCountries() {
    this.marketCountriesLoading = true; this.marketCountriesError = null;
    try {
      const [data, currencies, shipping, providers, iso] = await Promise.all([
        this._get(`/umbraco/management/api/ecomm-commerce/market-countries${this._marketQs}`),
        this._get(`/umbraco/management/api/ecomm-commerce/currencies${this._marketQs}`),
        this._get(`/umbraco/management/api/ecomm-commerce/shipping-methods${this._marketQs}`),
        // The payment-providers proxy requires a market — skip it rather than send a 400.
        this.selectedMarketId
          ? this._get(`/umbraco/management/api/ecomm-commerce/payment-providers${this._marketQs}`)
          : Promise.resolve(null),
        this.countries.length ? this.countries : this._get('/umbraco/management/api/ecomm-commerce/countries'),
      ]);
      this.marketCountries = data?.countries ?? [];
      this.currencies = currencies?.currencies ?? [];
      this.activeCurrencyCode = currencies?.activeCode ?? '';
      this._currenciesMarketId = this.selectedMarketId;
      this.shippingMethods = Array.isArray(shipping) ? shipping : (shipping?.methods ?? []);
      this.marketPaymentProviders = providers?.providers ?? [];
      this.countries = Array.isArray(iso) ? iso : [];
    } catch (e) { this.marketCountriesError = e.message; }
    finally { this.marketCountriesLoading = false; }
  }

  async _saveMarketCountries(countries) {
    const headers = await this.getAuthHeaders();
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/market-countries${this._marketQs}`, {
      method: 'PUT', headers, credentials: 'include', body: JSON.stringify({ countries })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async saveMarketCountry() {
    const c = this.editingMarketCountry;
    if (!c || !c.name?.trim()) { this.marketCountriesError = 'Name is required'; return; }
    const code = (c.code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) { this.marketCountriesError = 'ISO code must be 2 letters, e.g. SE'; return; }
    this.marketCountriesError = null;
    try {
      const clean = {
        id: c.id, name: c.name.trim(), code,
        defaultCurrencyId: c.defaultCurrencyId || null,
        defaultShippingMethodId: c.defaultShippingMethodId || null,
        defaultPaymentProviderAlias: c.defaultPaymentProviderAlias || null,
      };
      const exists = this.marketCountries.find(x => x.id === c.id);
      const list = exists ? this.marketCountries.map(x => x.id === c.id ? clean : x) : [...this.marketCountries, clean];
      await this._saveMarketCountries(list);
      this.editingMarketCountry = null;
      this.loadMarketCountries();
    } catch (e) { this.marketCountriesError = e.message; }
  }

  async deleteMarketCountry(id) {
    try {
      await this._saveMarketCountries(this.marketCountries.filter(x => x.id !== id));
      this.loadMarketCountries();
    } catch (e) { this.marketCountriesError = e.message; }
  }

  startMarketCountry(fromPreset) {
    this.editingMarketCountry = {
      id: crypto.randomUUID(), name: '', code: '',
      defaultCurrencyId: '', defaultShippingMethodId: '', defaultPaymentProviderAlias: '',
      presetPicker: Boolean(fromPreset),
    };
  }

  applyCountryPreset(code) {
    const p = this.countries.find(x => x.code === code);
    if (!p) return;
    this.editingMarketCountry = { ...this.editingMarketCountry, name: p.name, code: p.code };
  }

  async addAllCountryPresets() {
    const have = new Set(this.marketCountries.map(c => c.code));
    const added = this.countries
      .filter(p => !have.has(p.code))
      .map(p => ({ id: crypto.randomUUID(), name: p.name, code: p.code }));
    if (!added.length) { this.marketCountriesError = 'Every ISO 3166 country is already in the list.'; return; }
    this.marketCountriesError = null;
    try {
      await this._saveMarketCountries([...this.marketCountries, ...added]);
      this.loadMarketCountries();
    } catch (e) { this.marketCountriesError = e.message; }
  }

  // ── Product Attribute Presets ─────────────────────────────────────────────────

  async loadAttributePresets() {
    this.attributePresetsLoading = true; this.attributePresetsError = null;
    try {
      const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/attribute-presets${qs}`);
      this.attributePresets = Array.isArray(data) ? data : (data?.presets ?? []);
    } catch (e) { this.attributePresetsError = e.message; }
    finally { this.attributePresetsLoading = false; }
  }

  async _saveAttributePresets(presets) {
    const headers = await this.getAuthHeaders();
    const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/attribute-presets${qs}`, {
      method: 'PUT', headers, credentials: 'include', body: JSON.stringify({ presets })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async saveAttributePreset() {
    const p = this.editingAttributePreset;
    if (!p || !p.name?.trim()) { this.attributePresetsError = 'Name is required'; return; }
    try {
      const clean = {
        id: p.id, name: p.name.trim(), alias: (p.alias || slugify(p.name)).trim(),
        attributeIds: p.attributeIds || [],
      };
      const exists = this.attributePresets.find(x => x.id === p.id);
      const list = exists ? this.attributePresets.map(x => x.id === p.id ? clean : x) : [...this.attributePresets, clean];
      await this._saveAttributePresets(list);
      this.editingAttributePreset = null;
      this.loadAttributePresets();
    } catch (e) { this.attributePresetsError = e.message; }
  }

  async deleteAttributePreset(id) {
    try {
      await this._saveAttributePresets(this.attributePresets.filter(x => x.id !== id));
      this.loadAttributePresets();
    } catch (e) { this.attributePresetsError = e.message; }
  }

  async deleteTemplate(idx) {
    try {
      const list = this.propertyTemplates.filter((_, i) => i !== idx);
      // re-assign sort orders
      const reordered = list.map((t, i) => ({ ...t, sortOrder: i }));
      await this._savePropertyTemplates(reordered);
      this.loadPropertyTemplates();
    } catch (e) { this.propertyTemplatesError = e.message; }
  }

  // ── Order Statuses ─────────────────────────────────────────────────────────

  // Always fetches: statusDefs is what every order pill reads, so an edit here has to refresh it.
  async loadOrderStatuses() {
    this.orderStatusesLoading = true; this.orderStatusesError = null;
    try {
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/order-statuses${this._marketQs}`);
      this.orderStatuses = Array.isArray(data) ? data : [];
      this.statusDefs = this.orderStatuses; // keep in sync — same store, same list
      this._statusDefsMarketId = this.selectedMarketId;
    } catch (e) { this.orderStatusesError = e.message; }
    finally { this.orderStatusesLoading = false; }
  }

  /**
   * Per-item REST rather than the bulk PUT the other Options screens use, and scoped to the selected
   * store: each store owns its own statuses. `code` is the key orders store and the API ignores it on
   * update, so it is only editable while creating.
   */
  async saveOrderStatus() {
    const s = this.editingOrderStatus;
    if (!s) return;
    const name = (s.name || '').trim();
    const code = (s.code || slugify(name)).trim();
    if (!name) { this.orderStatusesError = 'Name is required'; return; }
    if (!code) { this.orderStatusesError = 'Code is required'; return; }

    const isNew = !this.orderStatuses.some(x => x.id === s.id);
    const body = {
      name, code, color: s.color || '#6B7280',
      sortOrder: Number(s.sortOrder) || 0,
      isActive: s.isActive !== false,
    };
    const headers = await this.getAuthHeaders();
    const base = '/umbraco/management/api/ecomm-commerce/order-statuses';
    try {
      const r = await fetch(isNew ? `${base}${this._marketQs}` : `${base}/${encodeURIComponent(s.id)}${this._marketQs}`, {
        method: isNew ? 'POST' : 'PUT', headers, credentials: 'include', body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.text()) || r.statusText);
      this.editingOrderStatus = null;
      this.orderStatusesError = null;
      this.loadOrderStatuses();
    } catch (e) { this.orderStatusesError = e.message; }
  }

  async deleteOrderStatus(id) {
    const headers = await this.getAuthHeaders();
    try {
      const r = await fetch(`/umbraco/management/api/ecomm-commerce/order-statuses/${encodeURIComponent(id)}${this._marketQs}`, {
        method: 'DELETE', headers, credentials: 'include',
      });
      // The API refuses a status this store's orders use, or that it settles payments into — show why.
      if (!r.ok) throw new Error((await r.text()) || r.statusText);
      this.orderStatusesError = null;
      this.loadOrderStatuses();
    } catch (e) { this.orderStatusesError = e.message; }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  _selectView(key) {
    this.activeView = key;
    if (OPTIONS_SUBITEMS.find(i => i.key === key))
      this.optionsOpenStores = new Set(this.optionsOpenStores).add(this.selectedMarketId);
    this._loadView(key);
  }

  // The single place a view's data is loaded, for both "switched view" and "switched store".
  // Unconditional on purpose: the `!length` guards this replaced meant a list loaded once per session
  // and then showed stale data forever, with pagination as the only way to force a refresh.
  _loadView(key) {
    // Money is formatted with the store's configured currency culture, and order pills are coloured
    // from the store's own status definitions — every view needs both.
    this._ensureCurrencies();
    this._ensureStatusDefs();
    switch (key) {
      case 'orders':
      case 'order-detail':       this.loadOrders(); break;
      case 'carts':
      case 'cart-detail':        this.loadCarts(); break;
      case 'analytics':          this.loadAnalytics(); break;
      case 'discounts':          this.loadDiscounts(); break;
      case 'order-statuses':     this.editingOrderStatus = null; this.loadOrderStatuses(); break;
      case 'property-templates': this.loadPropertyTemplates(); this.loadAttributes(); break;
      case 'attributes':         this.editingAttribute = null; this.loadAttributes(); break;
      case 'attribute-presets':  this.editingAttributePreset = null; this.loadAttributes(); this.loadAttributePresets(); break;
      case 'tax-classes':        this.editingTaxClass = null; this.loadTaxClasses(); break;
      case 'currencies':         this.editingCurrency = null; this.createMenu = ''; this.loadCurrencies(); break;
      case 'countries':          this.editingMarketCountry = null; this.createMenu = ''; this.loadMarketCountries(); break;
      // 'home' has no data of its own; 'payment-providers' is a child element bound to .marketId,
      // so it reloads itself when the store changes.
    }
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // Currency comes from the selected market (single currency per market), not a hardcoded $.
  formatCurrency(n) {
    const code = this.markets?.find(m => m.id === this.selectedMarketId)?.currency || 'USD';
    // Prefer the culture configured on the matching currency (Options → Currencies) — the built-in
    // map only covers a handful of codes. Guarded on the market the list was loaded for.
    const configured = this._currenciesMarketId === this.selectedMarketId
      ? this.currencies?.find(c => c.code === code)?.culture
      : null;
    const locale = configured
      || { SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK', EUR: 'de-DE', GBP: 'en-GB', USD: 'en-US' }[code]
      || 'en-US';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(n || 0);
    } catch {
      return `${code} ${(n || 0).toFixed(2)}`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  _pillOrder(statusCode) {
    const def = this.statusMap[statusCode];
    if (def) {
      return html`<span class="pill" style="background:${def.color};color:#fff">${def.name}</span>`;
    }
    // fallback: CSS class + label map for statuses not yet loaded
    return html`<span class="pill pill--order-${statusCode}">${getOrderStatusLabel(statusCode)}</span>`;
  }

  _pillPayment(orderStatus) {
    const ps = derivePaymentStatus(orderStatus);
    return html`<span class="pill pill--payment-${ps}">${getPaymentStatusLabel(ps)}</span>`;
  }

  // "trailerName" -> "Trailer Name" for the order-detail custom-properties table.
  _humanizeKey(key) {
    if (!key) return '';
    const s = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  _errorBanner(msg, clear) {
    return msg ? html`
      <div class="error-banner">
        <uui-icon name="icon-alert"></uui-icon>
        <span>${msg}</span>
        <button class="error-close" @click=${clear}>×</button>
      </div>` : '';
  }

  _stateCenter(content) {
    return html`<div class="state-center">${content}</div>`;
  }

  _viewHeader(title, actionSlot) {
    return html`
      <div class="view-header">
        <h2 class="view-title">${title}</h2>
        ${actionSlot || ''}
      </div>`;
  }

  _filterBtn(label, value, isOpen, toggle) {
    return html`
      <button class="filter-btn" @click=${toggle}>
        ${label}: <strong>${value || 'All'}</strong><span class="caret">▾</span>
      </button>`;
  }

  _dropdown(items, activeKey, select, stopProp) {
    return html`
      <div class="dropdown" @click=${stopProp}>
        ${items.map(([k, l]) => html`
          <button class="dd-item ${activeKey === k ? 'active' : ''}" @click=${() => select(k)}>${l}</button>
        `)}
      </div>`;
  }

  _orderDetailRow(order) {
    return html`
      <tr class="detail-row"><td colspan="6">
        <div class="detail-panel">
          <div class="detail-grid">
            <div class="detail-section">
              <div class="detail-label">Customer</div>
              <p><strong>${order.customer?.fullName || '-'}</strong></p>
              <p>${order.customer?.email || '-'}</p>
            </div>
            <div class="detail-section">
              <div class="detail-label">Shipping</div>
              <p>${order.shippingAddress?.street || '-'}</p>
              <p>${[order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode].filter(Boolean).join(', ')}</p>
              <p>${order.shippingAddress?.country || ''}</p>
            </div>
            <div class="detail-section">
              <div class="detail-label">Order Info</div>
              <p><span class="muted">Created:</span> ${this.formatDate(order.createdAt)}</p>
              <p><span class="muted">Market:</span> ${order.marketId}</p>
              ${order.trackingNumber ? html`<p><span class="muted">Tracking:</span> ${order.trackingNumber}</p>` : ''}
            </div>
            <div class="detail-section">
              <div class="detail-label">Totals</div>
              <p><span class="muted">Subtotal:</span> ${this.formatCurrency(order.subtotal)}</p>
              <p><span class="muted">Tax:</span> ${this.formatCurrency(order.tax)}</p>
              <p><span class="muted">Shipping:</span> ${this.formatCurrency(order.shippingCost || 0)}</p>
              <p class="total-line"><strong>Total: ${this.formatCurrency(order.total)}</strong></p>
            </div>
          </div>
          <div class="detail-label" style="margin-top:12px">Items</div>
          <table class="items-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>
              ${(order.lineItems || order.items || []).map(i => html`
                <tr>
                  <td>
                    <div class="item-name-cell">
                      ${i.productImageUrl ? html`<img src="${i.productImageUrl}" class="item-thumb" alt="">` : ''}
                      ${i.productName}
                    </div>
                  </td>
                  <td><code>${i.sku || '-'}</code></td>
                  <td>${this.formatCurrency(i.unitPrice)}</td>
                  <td>${i.quantity}</td>
                  <td>${this.formatCurrency(i.lineTotal || i.subtotal)}</td>
                </tr>
              `)}
            </tbody>
          </table>
          <div class="status-actions">
            <span class="muted">Update Status:</span>
            ${(this.statusDefs.length ? this.statusDefs : ORDER_STATUSES.map(s => ({ code: s, name: getOrderStatusLabel(s), color: '#6b7280' }))).map(def => html`
              <uui-button
                look="${order.status === def.code ? 'primary' : 'secondary'}"
                color="${def.code === 'cancelled' || def.code === 'refunded' ? 'danger' : def.code === 'paid' || def.code === 'completed' ? 'positive' : 'default'}"
                ?disabled=${this.updatingStatusId === order.id || order.status === def.code}
                @click=${(e) => this.updateOrderStatus(order.id, def.code, e)}>
                ${this.updatingStatusId === order.id ? '…' : def.name}
              </uui-button>
            `)}
          </div>
        </div>
      </td></tr>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Orders ─────────────────────────────────────────────────────────────────

  _renderOrdersView() {
    const orders = this.filteredOrders;
    const osLabel = this.orderStatusFilter ? getOrderStatusLabel(this.orderStatusFilter) : 'All';
    const psLabel = this.paymentStatusFilter ? getPaymentStatusLabel(derivePaymentStatus(this.paymentStatusFilter)) : 'All';

    return html`
      <div class="view-container">
        ${this._viewHeader('Orders', html`
          <uui-button look="secondary" compact>
            Actions <uui-icon name="icon-navigation-down" style="font-size:0.7em;margin-left:2px"></uui-icon>
          </uui-button>`)}

        ${this._errorBanner(this.ordersError, () => { this.ordersError = null; })}

        <div class="filters-bar">
          <div class="filters-left">
            <div class="filter-wrap">
              ${this._filterBtn('Order Status', osLabel, this.showOSMenu,
                  (e) => { e.stopPropagation(); this.showOSMenu = !this.showOSMenu; this.showPSMenu = false; })}
              ${this.showOSMenu ? this._dropdown(
                [['', 'All'], ...(this.statusDefs.length
                  ? this.statusDefs.map(s => [s.code, s.name])
                  : ORDER_STATUSES.map(s => [s, getOrderStatusLabel(s)]))],
                this.orderStatusFilter,
                v => { this.orderStatusFilter = v; this.showOSMenu = false; this.currentPage = 1; this.loadOrders(); },
                e => e.stopPropagation()) : ''}
            </div>
            <div class="filter-wrap">
              ${this._filterBtn('Payment Status', psLabel, this.showPSMenu,
                  (e) => { e.stopPropagation(); this.showPSMenu = !this.showPSMenu; this.showOSMenu = false; })}
              ${this.showPSMenu ? this._dropdown(
                [['', 'All'], ...PAYMENT_STATUSES.map(s => [s, getPaymentStatusLabel(s)])],
                this.paymentStatusFilter,
                v => { this.paymentStatusFilter = v; this.showPSMenu = false; },
                e => e.stopPropagation()) : ''}
            </div>
          </div>
          <div class="filters-right">
            ${(this.orderStatusFilter || this.paymentStatusFilter || this.ordersSearch) ? html`
              <button type="button" class="filter-btn filter-reset" @click=${() => { this.orderStatusFilter = ''; this.paymentStatusFilter = ''; this.ordersSearch = ''; this.currentPage = 1; this.loadOrders(); }}>
                ✕ Reset filters
              </button>` : ''}
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Type to search..."
                .value=${this.ordersSearch} @input=${e => {
                  this.ordersSearch = e.target.value;
                  clearTimeout(this._searchDebounce);
                  this._searchDebounce = setTimeout(() => { this.currentPage = 1; this.loadOrders(); }, 300);
                }}>
            </div>
          </div>
        </div>

        ${this.ordersLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading orders…</p>`) :
          orders.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-shopping-basket" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No orders found</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th class="col-check"><input type="checkbox" .checked=${this.allSelected} @change=${this._toggleSelectAll}></th>
                  <th>Name</th><th>Date</th><th>Order Status</th><th>Payment Status</th><th class="col-r">Payment</th>
                </tr></thead>
                <tbody>
                  ${orders.map(o => html`
                    <tr class="data-row ${this.selectedIds.has(o.id) ? 'selected' : ''}"
                        @click=${() => { this.selectedOrder = o; this.activeView = 'order-detail'; }}>
                      <td class="col-check" @click=${e => { e.stopPropagation(); this._toggleSelectRow(o.id); }}>
                        <input type="checkbox" .checked=${this.selectedIds.has(o.id)} @change=${e => { e.stopPropagation(); this._toggleSelectRow(o.id); }}>
                      </td>
                      <td>
                        <div class="name-cell">
                          <span class="doc-icon"><uui-icon name="icon-document"></uui-icon></span>
                          <div>
                            ${o.customer?.fullName
                              ? html`<span class="name-primary">${o.customer.fullName}</span><span class="name-sub">${o.orderNumber}</span>`
                              : html`<span class="name-primary">${o.orderNumber}</span>`}
                          </div>
                        </div>
                      </td>
                      <td class="col-date">${this.formatDate(o.createdAt)}</td>
                      <td>${this._pillOrder(o.status)}</td>
                      <td>${this._pillPayment(o.status)}</td>
                      <td class="col-r">
                        <span class="pay-amount">${this.formatCurrency(o.total)}</span>
                        <span class="pay-method">Invoice</span>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>`}

        ${this._renderPager(this.totalCount, this.currentPage, this.pageSize,
            p => { this.currentPage = p; this.loadOrders(); })}
        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Orders</span></div>
      </div>`;
  }

  // One pager for every list, server-side (orders, carts — `goTo` refetches) and client-side
  // (property templates, attributes, presets — `goTo` just moves the page).
  _renderPager(total, page, pageSize, goTo) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return '';
    // Windowed: first, last, and current ±2, with … gaps — never render every page (could be 100s).
    const wanted = new Set([1, totalPages]);
    for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) wanted.add(p);
    const sorted = [...wanted].sort((a, b) => a - b);
    const items = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push(null);
      items.push(sorted[i]);
    }
    return html`
      <div class="pagination-bar">
        <button class="page-btn" ?disabled=${page <= 1} @click=${() => goTo(page - 1)}>←</button>
        ${items.map(p => p === null
          ? html`<span class="page-ellipsis">…</span>`
          : html`<button class="page-btn ${page === p ? 'page-btn--active' : ''}" @click=${() => goTo(p)}>${p}</button>`)}
        <button class="page-btn" ?disabled=${page >= totalPages} @click=${() => goTo(page + 1)}>→</button>
      </div>`;
  }

  _toggleSelectAll() {
    this.allSelected = !this.allSelected;
    this.selectedIds = this.allSelected ? new Set(this.filteredOrders.map(o => o.id)) : new Set();
  }

  _toggleSelectRow(id) {
    const next = new Set(this.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds = next;
    this.allSelected = next.size === this.filteredOrders.length;
  }

  // ── Order Detail ───────────────────────────────────────────────────────────

  _renderOrderDetailView() {
    const order = this.selectedOrder;
    if (!order) return '';
    return html`
      <div class="view-container">
        <div class="view-header">
          <div class="detail-breadcrumb">
            <button class="back-btn" @click=${() => { this.activeView = 'orders'; }}>← Orders</button>
            <span class="breadcrumb-sep">/</span>
            <span class="detail-order-num">${order.orderNumber}</span>
          </div>
          <div class="detail-status-badge">${this._pillOrder(order.status)} ${this._pillPayment(order.status)}</div>
        </div>

        ${this._errorBanner(this.ordersError, () => { this.ordersError = null; })}

        <div class="detail-body">
          <div class="detail-grid detail-grid--wide">
            <div class="detail-section">
              <div class="detail-label">Customer</div>
              <p><strong>${order.customer?.fullName || '-'}</strong></p>
              <p>${order.customer?.email || '-'}</p>
              ${order.customer?.phone ? html`<p>${order.customer.phone}</p>` : ''}
            </div>
            <div class="detail-section">
              <div class="detail-label">Shipping Address</div>
              <p>${order.shippingAddress?.street || '-'}</p>
              ${order.shippingAddress?.street2 ? html`<p>${order.shippingAddress.street2}</p>` : ''}
              <p>${[order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode].filter(Boolean).join(', ')}</p>
              <p>${order.shippingAddress?.country || ''}</p>
            </div>
            <div class="detail-section">
              <div class="detail-label">Order Info</div>
              <p><span class="muted">Order #:</span> ${order.orderNumber}</p>
              <p><span class="muted">Created:</span> ${this.formatDate(order.createdAt)}</p>
              <p><span class="muted">Updated:</span> ${this.formatDate(order.updatedAt)}</p>
              <p><span class="muted">Market:</span> ${order.marketId}</p>
              ${order.trackingNumber ? html`<p><span class="muted">Tracking:</span> ${order.trackingNumber}</p>` : ''}
            </div>
            <div class="detail-section">
              <div class="detail-label">Totals</div>
              <p><span class="muted">Subtotal:</span> ${this.formatCurrency(order.subtotal)}</p>
              <p><span class="muted">Tax:</span> ${this.formatCurrency(order.tax)}</p>
              <p><span class="muted">Shipping:</span> ${this.formatCurrency(order.shippingCost || 0)}</p>
              <p class="total-line"><strong>Total: ${this.formatCurrency(order.total)}</strong></p>
            </div>
          </div>

          <div class="detail-section-block">
            <div class="detail-label">Items</div>
            <table class="items-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                ${(order.lineItems || order.items || []).map(i => html`
                  <tr>
                    <td>
                      <div class="item-name-cell">
                        ${i.productImageUrl ? html`<img src="${i.productImageUrl}" class="item-thumb" alt="">` : ''}
                        ${i.productName}
                      </div>
                    </td>
                    <td><code>${i.sku || '-'}</code></td>
                    <td>${this.formatCurrency(i.unitPrice)}</td>
                    <td>${i.quantity}</td>
                    <td>${this.formatCurrency(i.lineTotal || i.subtotal)}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>

          ${(order.customProperties && order.customProperties.length) ? html`
          <div class="detail-section-block">
            <div class="detail-label">Configuration</div>
            <table class="items-table">
              <tbody>
                ${order.customProperties.map(p => html`
                  <tr>
                    <td class="muted">${this._humanizeKey(p.name)}</td>
                    <td>${p.value}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>` : ''}

          <div class="detail-section-block">
            <div class="detail-label">Update Status</div>
            <div class="status-actions">
              ${(this.statusDefs.length
                ? this.statusDefs
                : ORDER_STATUSES.map(s => ({ code: s, name: getOrderStatusLabel(s), color: '#6b7280' }))
              ).map(def => html`
                <uui-button
                  look="${order.status === def.code ? 'primary' : 'secondary'}"
                  color="${def.code === 'cancelled' || def.code === 'refunded' ? 'danger' : def.code === 'paid' || def.code === 'completed' ? 'positive' : 'default'}"
                  ?disabled=${this.updatingStatusId === order.id || order.status === def.code}
                  @click=${(e) => this.updateOrderStatus(order.id, def.code, e)}>
                  ${this.updatingStatusId === order.id ? '…' : def.name}
                </uui-button>
              `)}
            </div>
          </div>
        </div>

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Orders / ${order.orderNumber}</span>
        </div>
      </div>`;
  }

  // ── Carts ──────────────────────────────────────────────────────────────────

  _renderCartsView() {
    const carts = this.carts;
    return html`
      <div class="view-container">
        ${this._viewHeader('Carts', html`
          <uui-button look="secondary" compact @click=${() => this.loadCarts()}>
            <uui-icon name="icon-refresh"></uui-icon> Refresh
          </uui-button>`)}

        ${this._errorBanner(this.cartsError, () => { this.cartsError = null; })}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            ${this.cartsSearch ? html`
              <button type="button" class="filter-btn filter-reset"
                      @click=${() => { this.cartsSearch = ''; this.cartsPage = 1; this.loadCarts(); }}>
                ✕ Reset search
              </button>` : ''}
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Search by session or product…"
                .value=${this.cartsSearch} @input=${e => {
                  this.cartsSearch = e.target.value;
                  clearTimeout(this._cartsSearchDebounce);
                  this._cartsSearchDebounce = setTimeout(() => { this.cartsPage = 1; this.loadCarts(); }, 300);
                }}>
            </div>
          </div>
        </div>

        ${this.cartsLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading carts…</p>`) :
          carts.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-shopping-basket" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${this.cartsSearch ? 'No carts match that search' : 'No active carts'}</p>
            <p style="font-size:0.8rem;color:#aaa">Carts appear here when customers start shopping but haven't checked out yet.</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Cart</th><th>Session</th><th>Items</th><th class="col-r">Total</th><th>Last Activity</th>
                </tr></thead>
                <tbody>
                  ${carts.map(c => html`
                    <tr class="data-row"
                        @click=${() => { this.selectedCart = c; this.activeView = 'cart-detail'; }}>
                      <td>
                        <div class="name-cell">
                          <span class="doc-icon"><uui-icon name="icon-shopping-basket"></uui-icon></span>
                          <span class="name-primary">${(c.items || []).length
                            ? (c.items[0].productName + ((c.items.length > 1) ? ` +${c.items.length - 1} more` : ''))
                            : 'Empty cart'}</span>
                        </div>
                      </td>
                      <td><code class="session-id">${c.sessionId || c.id}</code></td>
                      <td>${(c.items || []).length} item${(c.items || []).length !== 1 ? 's' : ''}</td>
                      <td class="col-r"><span class="pay-amount">${this.formatCurrency(c.total)}</span></td>
                      <td class="col-date">${this.formatDate(c.updatedAt || c.createdAt)}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>`}

        ${this._renderPager(this.cartsTotalCount, this.cartsPage, this.pageSize,
            p => { this.cartsPage = p; this.loadCarts(); })}
        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Carts</span></div>
      </div>`;
  }

  // ── Cart Detail ────────────────────────────────────────────────────────────

  // Deliberately not _renderOrderDetailView with a flag: a cart has no customer, addresses, order
  // number or status, and its lines carry no SKU. Same shell and CSS, different facts.
  _renderCartDetailView() {
    const cart = this.selectedCart;
    if (!cart) return '';
    const items = cart.items || [];
    return html`
      <div class="view-container">
        <div class="view-header">
          <div class="detail-breadcrumb">
            <button class="back-btn" @click=${() => { this.activeView = 'carts'; }}>← Carts</button>
            <span class="breadcrumb-sep">/</span>
            <span class="detail-order-num">${items.length} item${items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div class="detail-body">
          <div class="detail-grid detail-grid--wide">
            <div class="detail-section">
              <div class="detail-label">Shopper</div>
              <p><span class="muted">Anonymous</span></p>
              <p style="font-size:0.8rem;color:#aaa">A cart has no customer details — those are captured at checkout.</p>
            </div>
            <div class="detail-section">
              <div class="detail-label">Cart Info</div>
              <p><span class="muted">Session:</span> <code class="session-id">${cart.sessionId || '-'}</code></p>
              <p><span class="muted">Created:</span> ${this.formatDate(cart.createdAt)}</p>
              <p><span class="muted">Last activity:</span> ${this.formatDate(cart.updatedAt)}</p>
              <p><span class="muted">Market:</span> ${cart.marketId}</p>
            </div>
            <div class="detail-section">
              <div class="detail-label">Totals</div>
              <p><span class="muted">Subtotal:</span> ${this.formatCurrency(cart.subtotal)}</p>
              <p><span class="muted">Tax:</span> ${this.formatCurrency(cart.tax)}</p>
              <p class="total-line"><strong>Total: ${this.formatCurrency(cart.total)}</strong></p>
              <p style="font-size:0.8rem;color:#aaa">Shipping and payment fees are added at checkout.</p>
            </div>
          </div>

          <div class="detail-section-block">
            <div class="detail-label">Items</div>
            ${items.length === 0 ? html`<p class="muted">This cart is empty.</p>` : html`
              <table class="items-table">
                <thead><tr><th>Product</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  ${items.map(i => html`
                    <tr>
                      <td>
                        <div class="item-name-cell">
                          ${i.productImageUrl ? html`<img src="${i.productImageUrl}" class="item-thumb" alt="">` : ''}
                          ${i.productName}
                        </div>
                      </td>
                      <td>${this.formatCurrency(i.unitPrice)}</td>
                      <td>${i.quantity}</td>
                      <td>${this.formatCurrency(i.subtotal)}</td>
                    </tr>
                  `)}
                </tbody>
              </table>`}
          </div>
        </div>

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Carts / ${cart.sessionId || cart.id}</span>
        </div>
      </div>`;
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  _renderAnalyticsView() {
    const stats = this.analyticsStats;

    return html`
      <div class="view-container">
        ${this._viewHeader('Analytics', html`
          <uui-button look="secondary" compact @click=${this.loadAnalytics}>
            <uui-icon name="icon-refresh"></uui-icon> Refresh
          </uui-button>`)}

        ${this._errorBanner(this.analyticsError, () => { this.analyticsError = null; })}

        ${this.analyticsLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading analytics…</p>`) :
          !stats ? this._stateCenter(html`
            <uui-icon name="icon-chart" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No order data available</p>`) :
          html`
            <div class="analytics-body">
              <!-- Stat cards -->
              <div class="stat-cards">
                <div class="stat-card">
                  <div class="stat-value">${stats.total}</div>
                  <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card stat-card--highlight">
                  <div class="stat-value">${this.formatCurrency(stats.revenue)}</div>
                  <div class="stat-label">Total Revenue</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${this.formatCurrency(stats.avgValue)}</div>
                  <div class="stat-label">Avg Order Value</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${stats.pendingCount}</div>
                  <div class="stat-label">Pending Orders</div>
                </div>
              </div>

              <!-- Status breakdown -->
              <div class="analytics-section">
                <div class="analytics-section-title">Orders by Status</div>
                <table class="data-table">
                  <thead><tr>
                    <th>Status</th><th>Count</th><th>Share</th><th class="col-r">Revenue</th>
                  </tr></thead>
                  <tbody>
                    ${Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                      const pct = Math.round((count / stats.total) * 100);
                      const rev = stats.revenueByStatus[status] || 0;
                      return html`
                        <tr class="data-row">
                          <td>${this._pillOrder(status)}</td>
                          <td>${count}</td>
                          <td>
                            <div class="progress-wrap">
                              <div class="progress-bar" style="width:${pct}%"></div>
                              <span>${pct}%</span>
                            </div>
                          </td>
                          <td class="col-r">${rev > 0 ? this.formatCurrency(rev) : '—'}</td>
                        </tr>`;
                    })}
                  </tbody>
                </table>
              </div>
            </div>`}

        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Analytics</span></div>
      </div>`;
  }

  // ── Order Statuses ─────────────────────────────────────────────────────────

  _renderOrderStatusesView() {
    const s = this.editingOrderStatus;
    const isNew = !!s && !this.orderStatuses.some(x => x.id === s.id);
    const nextSort = Math.max(0, ...this.orderStatuses.map(x => Number(x.sortOrder) || 0)) + 1;

    return html`
      <div class="view-container">
        ${this._viewHeader('Order Statuses', html`
          <uui-button look="secondary" compact @click=${this.loadOrderStatuses}>
            <uui-icon name="icon-refresh"></uui-icon> Refresh
          </uui-button>
          <uui-button look="primary" @click=${() => { this.editingOrderStatus = { id: crypto.randomUUID(), name: '', code: '', color: '#6B7280', sortOrder: nextSort, isActive: true }; }}>
            + Create Order Status
          </uui-button>`)}

        ${this._errorBanner(this.orderStatusesError, () => { this.orderStatusesError = null; })}

        ${s ? html`
          <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this.editingOrderStatus = null; }}>
          <div class="form-panel form-panel--modal">
            <h3>${isNew ? 'New Order Status' : 'Edit Order Status'}</h3>
            <div class="form-row"><label>Name</label>
              <input class="form-input" .value=${s.name || ''} placeholder="e.g. Awaiting Pickup"
                @input=${e => { this.editingOrderStatus = { ...s, name: e.target.value }; }}>
            </div>
            <div class="form-row" style="align-items:flex-start"><label>Code</label>
              <div style="display:flex;flex-direction:column;gap:4px;flex:1">
                ${isNew ? html`
                  <input class="form-input" .value=${s.code || ''} placeholder=${slugify(s.name || '') || 'e.g. awaiting-pickup'}
                    @input=${e => { this.editingOrderStatus = { ...s, code: e.target.value }; }}>`
                : html`<code>${s.code}</code>`}
                <span style="color:#999;font-size:0.8rem">
                  ${isNew ? 'Derived from the name if left blank. Orders store the code, so it is fixed once created.'
                          : 'Fixed — existing orders reference this code.'}
                </span>
              </div>
            </div>
            <div class="form-row"><label>Color</label>
              <div style="display:flex;gap:8px;align-items:center">
                <input type="color" .value=${s.color || '#6B7280'} style="width:48px;height:32px;padding:0;border:1px solid #d8d7d9;cursor:pointer"
                  @input=${e => { this.editingOrderStatus = { ...s, color: e.target.value }; }}>
                <input class="form-input" style="width:110px" .value=${s.color || '#6B7280'}
                  @input=${e => { this.editingOrderStatus = { ...s, color: e.target.value }; }}>
              </div>
            </div>
            <div class="form-row"><label>Sort Order</label>
              <input class="form-input" style="width:110px" type="number" step="1" .value=${s.sortOrder ?? 0}
                @input=${e => { this.editingOrderStatus = { ...s, sortOrder: e.target.value }; }}>
            </div>
            <div class="form-row">
              <label><input type="checkbox" .checked=${s.isActive !== false}
                @change=${e => { this.editingOrderStatus = { ...s, isActive: e.target.checked }; }}> Active</label>
              <span style="color:#999;font-size:0.8rem">Inactive statuses stay on the orders using them but drop out of the pickers.</span>
            </div>
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveOrderStatus()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingOrderStatus = null; }}>Cancel</uui-button>
            </div>
          </div>
          </div>` : ''}

        ${this.orderStatusesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          this.orderStatuses.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-settings" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No order statuses found</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th style="width:40px"></th>
                  <th>Name</th><th>Code</th><th>Sort</th><th>Active</th><th>System</th><th></th>
                </tr></thead>
                <tbody>
                  ${this.orderStatuses.map(st => html`
                    <tr class="data-row" style="cursor:pointer" @click=${() => { this.editingOrderStatus = { ...st }; }}>
                      <td><span class="color-dot" style="background:${st.color || '#6B7280'}"></span></td>
                      <td><strong>${st.name}</strong></td>
                      <td><code>${st.code}</code></td>
                      <td>${st.sortOrder}</td>
                      <td>
                        <span class="pill ${st.isActive ? 'pill--active' : 'pill--inactive'}">
                          ${st.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        ${st.isSystemDefault
                          ? html`<span class="pill pill--system">System</span>`
                          : html`<span class="muted">—</span>`}
                      </td>
                      <td class="row-actions">
                        <uui-button look="secondary" color="danger" compact
                          @click=${(e) => { e.stopPropagation(); this.deleteOrderStatus(st.id); }}>Del</uui-button>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Order Statuses</span>
          ${this.orderStatuses.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${this.orderStatuses.length} status${this.orderStatuses.length !== 1 ? 'es' : ''}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Discounts ──────────────────────────────────────────────────────────────

  _renderDiscountsView() {
    const d = this.editingDiscount;
    return html`
      <div class="view-container">
        ${this._viewHeader('Discounts', html`
          <uui-button look="primary" @click=${() => { this.editingDiscount = { code:'', name:'', type:'percentage', value:0, isActive:true }; }}>
            + New Discount
          </uui-button>`)}

        ${this._errorBanner(this.discountsError, () => { this.discountsError = null; })}

        ${d ? html`
          <div class="form-panel">
            <h3>${d.id ? 'Edit Discount' : 'New Discount'}</h3>
            <div class="form-row">
              <label>Code</label>
              <input class="form-input" .value=${d.code} @input=${e => { this.editingDiscount = {...d, code: e.target.value}; }}>
            </div>
            <div class="form-row">
              <label>Name</label>
              <input class="form-input" .value=${d.name} @input=${e => { this.editingDiscount = {...d, name: e.target.value}; }}>
            </div>
            <div class="form-row">
              <label>Type</label>
              <select class="form-input" .value=${d.type} @change=${e => { this.editingDiscount = {...d, type: e.target.value}; }}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div class="form-row">
              <label>Value ${d.type === 'percentage' ? '(%)' : '($)'}</label>
              <input class="form-input" type="number" min="0" .value=${d.value} @input=${e => { this.editingDiscount = {...d, value: parseFloat(e.target.value)||0}; }}>
            </div>
            <div class="form-row">
              <label>Min Order Value</label>
              <input class="form-input" type="number" min="0" .value=${d.minOrderValue||0} @input=${e => { this.editingDiscount = {...d, minOrderValue: parseFloat(e.target.value)||0}; }}>
            </div>
            <div class="form-row">
              <label>Max Uses (blank = unlimited)</label>
              <input class="form-input" type="number" min="0" .value=${d.maxUses||''} @input=${e => { this.editingDiscount = {...d, maxUses: e.target.value ? parseInt(e.target.value) : null}; }}>
            </div>
            <div class="form-row">
              <label>Expiry Date</label>
              <input class="form-input" type="date" .value=${d.expiryDate ? d.expiryDate.split('T')[0] : ''} @input=${e => { this.editingDiscount = {...d, expiryDate: e.target.value || null}; }}>
            </div>
            <div class="form-row">
              <label><input type="checkbox" .checked=${d.isActive} @change=${e => { this.editingDiscount = {...d, isActive: e.target.checked}; }}> Active</label>
            </div>
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveDiscount()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingDiscount = null; }}>Cancel</uui-button>
            </div>
          </div>` : ''}

        ${this.discountsLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading discounts…</p>`) :
          this.discounts.length === 0 && !d ? this._stateCenter(html`
            <uui-icon name="icon-tag" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No discounts yet</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Code</th><th>Name</th><th>Type</th><th>Value</th><th>Uses</th><th>Expiry</th><th>Active</th><th></th>
                </tr></thead>
                <tbody>
                  ${this.discounts.map(disc => html`
                    <tr class="data-row">
                      <td><code>${disc.code}</code></td>
                      <td>${disc.name}</td>
                      <td>${disc.type}</td>
                      <td>${disc.type === 'percentage' ? disc.value + '%' : this.formatCurrency(disc.value)}</td>
                      <td>${disc.usesCount}${disc.maxUses ? ' / ' + disc.maxUses : ''}</td>
                      <td>${disc.expiryDate ? new Date(disc.expiryDate).toLocaleDateString() : '—'}</td>
                      <td><span class="pill ${disc.isActive ? 'pill--active' : 'pill--inactive'}">${disc.isActive ? 'Active' : 'Off'}</span></td>
                      <td class="row-actions">
                        <uui-button look="secondary" compact @click=${(e) => { e.stopPropagation(); this.editingDiscount = {...disc}; }}>Edit</uui-button>
                        <uui-button look="secondary" color="danger" compact @click=${(e) => { e.stopPropagation(); this.deleteDiscount(disc.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>`}

        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Discounts</span></div>
      </div>`;
  }

  _renderPropertyTemplatesView() {
    const t = this.editingTemplate;
    const PAGE_SIZE = 10;
    const q = (this.propertyTemplatesSearch || '').toLowerCase();
    const filtered = q
      ? this.propertyTemplates.filter(x => x.name?.toLowerCase().includes(q))
      : this.propertyTemplates;
    const page = this.propertyTemplatesPage;
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return html`
      <div class="view-container">
        ${this._viewHeader('Property Templates', html`
          <uui-button look="primary" @click=${() => { this.editingTemplate = { name: '', defaultValue: '', _isNew: true }; }}>
            + New Template
          </uui-button>`)}

        ${this._errorBanner(this.propertyTemplatesError, () => { this.propertyTemplatesError = null; })}

        ${t ? html`
          <div class="form-panel">
            <h3>${t._isNew ? 'New Property Template' : 'Edit Property Template'}</h3>
            <div class="form-row">
              <label>Name</label>
              <input class="form-input" .value=${t.name || ''} @input=${e => { this.editingTemplate = { ...t, name: e.target.value }; }} placeholder="e.g. Material">
            </div>
            <div class="form-row">
              <label>Values from attribute</label>
              <select class="form-input" .value=${t.attributeId || ''}
                @change=${e => { this.editingTemplate = { ...t, attributeId: e.target.value || null }; }}>
                <option value="">Free text</option>
                ${this.attributes.map(a => html`<option value=${a.id} ?selected=${t.attributeId === a.id}>${a.name}</option>`)}
              </select>
            </div>
            ${(() => {
              const boundAttr = this.attributes.find(a => a.id === t.attributeId);
              return html`
                <div class="form-row">
                  <label>Default Value</label>
                  ${boundAttr ? html`
                    <select class="form-input" .value=${t.defaultValue || ''}
                      @change=${e => { this.editingTemplate = { ...t, defaultValue: e.target.value }; }}>
                      <option value="">(no default)</option>
                      ${boundAttr.values.map(v => html`<option value=${v.name} ?selected=${t.defaultValue === v.name}>${v.name}</option>`)}
                    </select>` : html`
                    <input class="form-input" .value=${t.defaultValue || ''} @input=${e => { this.editingTemplate = { ...t, defaultValue: e.target.value }; }} placeholder="Optional">`}
                </div>`;
            })()}
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveTemplate()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingTemplate = null; }}>Cancel</uui-button>
            </div>
          </div>` : ''}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Search templates…"
                .value=${this.propertyTemplatesSearch}
                @input=${e => { this.propertyTemplatesSearch = e.target.value; this.propertyTemplatesPage = 1; }}>
            </div>
          </div>
        </div>

        ${this.propertyTemplatesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          filtered.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-list" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${q ? 'No templates match your search' : 'No property templates yet'}</p>
            ${q ? '' : html`<p style="color:#999;font-size:0.85rem">Templates define default custom properties added to all products in this store.</p>`}`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>#</th><th>Name</th><th>Values from</th><th>Default Value</th><th></th>
                </tr></thead>
                <tbody>
                  ${paged.map((tmpl, i) => { const idx = (page - 1) * PAGE_SIZE + i;
                    const boundAttr = this.attributes.find(a => a.id === tmpl.attributeId); return html`
                    <tr class="data-row">
                      <td>${tmpl.sortOrder ?? idx}</td>
                      <td><strong>${tmpl.name}</strong></td>
                      <td>${boundAttr ? html`<span class="pill pill--single">${boundAttr.name}</span>` : html`<em style="color:#999">free text</em>`}</td>
                      <td>${tmpl.defaultValue || '—'}</td>
                      <td class="row-actions">
                        <uui-button look="secondary" compact @click=${(e) => { e.stopPropagation(); this.editingTemplate = { ...tmpl, _idx: idx }; }}>Edit</uui-button>
                        <uui-button look="secondary" color="danger" compact @click=${(e) => { e.stopPropagation(); this.deleteTemplate(idx); }}>Del</uui-button>
                      </td>
                    </tr>`;})}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.propertyTemplatesPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Property Templates</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} template${filtered.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Product Attributes ───────────────────────────────────────────────────────

  _renderAttributesView() {
    const a = this.editingAttribute;
    const PAGE_SIZE = 10;
    const q = (this.attributesSearch || '').toLowerCase();
    const filtered = q ? this.attributes.filter(x => x.name?.toLowerCase().includes(q) || x.alias?.toLowerCase().includes(q)) : this.attributes;
    const page = this.attributesPage;
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return html`
      <div class="view-container">
        ${this._viewHeader('Product Attributes', html`
          <uui-button look="primary" @click=${() => { this.editingAttribute = { id: crypto.randomUUID(), name: '', alias: '', values: [] }; }}>
            + Create Product Attribute
          </uui-button>`)}

        ${this._errorBanner(this.attributesError, () => { this.attributesError = null; })}

        ${a ? html`
          <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this.editingAttribute = null; }}>
          <div class="form-panel form-panel--modal">
            <h3>${this.attributes.find(x => x.id === a.id) ? 'Edit Attribute' : 'New Attribute'}</h3>
            <div class="form-row"><label>Name</label>
              <input class="form-input" .value=${a.name || ''} placeholder="e.g. Size"
                @input=${e => { const name = e.target.value; this.editingAttribute = { ...a, name, alias: a.alias || slugify(name) }; }}>
            </div>
            <div class="form-row"><label>Alias</label>
              <input class="form-input" .value=${a.alias || ''} placeholder="e.g. size"
                @input=${e => { this.editingAttribute = { ...a, alias: e.target.value }; }}>
            </div>
            <div class="form-row"><label>Values</label>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${(a.values || []).map((v, i) => html`
                  <div style="display:flex;gap:6px;align-items:center">
                    <input class="form-input" style="flex:1" .value=${v.name || ''} placeholder="Value name (e.g. Small)"
                      @input=${e => { const name = e.target.value; const values = a.values.map((x, j) => j === i ? { ...x, name, alias: x.alias || slugify(name) } : x); this.editingAttribute = { ...a, values }; }}>
                    <input class="form-input" style="flex:1" .value=${v.alias || ''} placeholder="alias (e.g. small)"
                      @input=${e => { const values = a.values.map((x, j) => j === i ? { ...x, alias: e.target.value } : x); this.editingAttribute = { ...a, values }; }}>
                    <button style="background:none;border:none;cursor:pointer;color:#999;font-size:1rem"
                      @click=${() => { this.editingAttribute = { ...a, values: a.values.filter((_, j) => j !== i) }; }}>×</button>
                  </div>`)}
                <button style="background:none;border:1px dashed #ccc;border-radius:4px;padding:6px;font-size:0.85rem;color:#999;cursor:pointer;width:100%"
                  @click=${() => { this.editingAttribute = { ...a, values: [...(a.values || []), { name: '', alias: '' }] }; }}>+ Add value</button>
              </div>
            </div>
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveAttribute()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingAttribute = null; }}>Cancel</uui-button>
            </div>
          </div>
          </div>` : ''}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Search attributes…"
                .value=${this.attributesSearch}
                @input=${e => { this.attributesSearch = e.target.value; this.attributesPage = 1; }}>
            </div>
          </div>
        </div>

        ${this.attributesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          filtered.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-tag" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${q ? 'No attributes match your search' : 'No product attributes yet'}</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Alias</th><th>Values</th><th></th></tr></thead>
                <tbody>
                  ${paged.map(attr => html`
                    <tr class="data-row" style="cursor:pointer"
                      @click=${() => { this.editingAttribute = { ...attr, values: (attr.values || []).map(v => ({ ...v })) }; }}>
                      <td><uui-icon name="icon-tag" style="opacity:0.5;margin-right:6px"></uui-icon><strong>${attr.name}</strong></td>
                      <td><code>${attr.alias || '—'}</code></td>
                      <td>${(attr.values || []).length} value${(attr.values || []).length !== 1 ? 's' : ''}</td>
                      <td class="row-actions">
                        <uui-button look="secondary" color="danger" compact @click=${(e) => { e.stopPropagation(); this.deleteAttribute(attr.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.attributesPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Product Attributes</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} attribute${filtered.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Product Attribute Presets ─────────────────────────────────────────────────

  _renderAttributePresetsView() {
    const p = this.editingAttributePreset;
    const PAGE_SIZE = 10;
    const q = (this.attributePresetsSearch || '').toLowerCase();
    const filtered = q ? this.attributePresets.filter(x => x.name?.toLowerCase().includes(q) || x.alias?.toLowerCase().includes(q)) : this.attributePresets;
    const page = this.attributePresetsPage;
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return html`
      <div class="view-container">
        ${this._viewHeader('Product Attribute Presets', html`
          <uui-button look="primary" @click=${() => { this.editingAttributePreset = { id: crypto.randomUUID(), name: '', alias: '', attributeIds: [] }; }}>
            + Create Preset
          </uui-button>`)}

        ${this._errorBanner(this.attributePresetsError, () => { this.attributePresetsError = null; })}

        ${p ? html`
          <div class="form-panel">
            <h3>${this.attributePresets.find(x => x.id === p.id) ? 'Edit Preset' : 'New Preset'}</h3>
            <div class="form-row"><label>Name</label>
              <input class="form-input" .value=${p.name || ''} placeholder="e.g. Apparel"
                @input=${e => { const name = e.target.value; this.editingAttributePreset = { ...p, name, alias: p.alias || slugify(name) }; }}>
            </div>
            <div class="form-row"><label>Alias</label>
              <input class="form-input" .value=${p.alias || ''} placeholder="e.g. apparel"
                @input=${e => { this.editingAttributePreset = { ...p, alias: e.target.value }; }}>
            </div>
            <div class="form-row"><label>Attributes in this preset</label>
              ${this.attributes.length === 0 ? html`<em style="color:#999">No attributes defined yet.</em>` : html`
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                  ${this.attributes.map(attr => {
                    const sel = (p.attributeIds || []).includes(attr.id);
                    return html`<button
                      style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:4px 12px;font-size:0.8rem;cursor:pointer;border:1px solid ${sel ? '#4a6ba8' : '#d1d5db'};background:${sel ? '#4a6ba8' : '#fff'};color:${sel ? '#fff' : '#374151'}"
                      @click=${() => { const ids = p.attributeIds || []; this.editingAttributePreset = { ...p, attributeIds: ids.includes(attr.id) ? ids.filter(x => x !== attr.id) : [...ids, attr.id] }; }}>
                      ${attr.name || '(unnamed)'}</button>`;
                  })}
                </div>`}
            </div>
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveAttributePreset()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingAttributePreset = null; }}>Cancel</uui-button>
            </div>
          </div>` : ''}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Search presets…"
                .value=${this.attributePresetsSearch}
                @input=${e => { this.attributePresetsSearch = e.target.value; this.attributePresetsPage = 1; }}>
            </div>
          </div>
        </div>

        ${this.attributePresetsLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          filtered.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-tags" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${q ? 'No presets match your search' : 'No attribute presets yet'}</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Alias</th><th>Attributes</th><th></th></tr></thead>
                <tbody>
                  ${paged.map(preset => html`
                    <tr class="data-row">
                      <td><strong>${preset.name}</strong></td>
                      <td><code>${preset.alias || '—'}</code></td>
                      <td>${(preset.attributeIds || []).map(id => (this.attributes.find(a => a.id === id)?.name || id)).join(', ') || '—'}</td>
                      <td class="row-actions">
                        <uui-button look="secondary" compact @click=${(e) => { e.stopPropagation(); this.editingAttributePreset = { ...preset, attributeIds: [...(preset.attributeIds || [])] }; }}>Edit</uui-button>
                        <uui-button look="secondary" color="danger" compact @click=${(e) => { e.stopPropagation(); this.deleteAttributePreset(preset.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.attributePresetsPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Product Attribute Presets</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} preset${filtered.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Tax Classes ──────────────────────────────────────────────────────────────

  _renderTaxClassesView() {
    const t = this.editingTaxClass;
    const usedCodes = new Set((t?.countryRates || []).map(r => r.countryCode));
    const availableCountries = this.countries.filter(c => !usedCodes.has(c.code));

    return html`
      <div class="view-container">
        ${this._viewHeader('Tax Classes', html`
          <uui-button look="primary" @click=${() => { this.editingTaxClass = { id: crypto.randomUUID(), name: '', defaultRate: 0, countryRates: [] }; }}>
            + Create Tax Class
          </uui-button>`)}

        ${this._errorBanner(this.taxClassesError, () => { this.taxClassesError = null; })}

        <!-- The flat fallback rate. It belongs on this screen rather than the market form because it's
             the same lookup's last resort, and this is where people come to change tax. -->
        <div class="store-tax">
          <div class="store-tax-row">
            <label>Store Tax Rate (fallback)</label>
            <input class="form-input" type="number" step="0.01" min="0" style="width:110px"
              .value=${this.storeTaxRateDraft ?? String((this.storeTaxRate || 0) * 100)}
              @input=${e => { this.storeTaxRateDraft = e.target.value; }}>
            <span>%</span>
            ${this.storeTaxRateDraft !== null ? html`
              <uui-button look="primary" compact @click=${() => this.saveStoreTaxRate()}>Save</uui-button>
              <uui-button look="secondary" compact @click=${() => { this.storeTaxRateDraft = null; }}>Discard</uui-button>` : ''}
          </div>
          <small>Applied to goods when the active payment provider names no tax class (or names one that has since been deleted).</small>
        </div>

        ${t ? html`
          <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this.editingTaxClass = null; }}>
          <div class="form-panel form-panel--modal">
            <h3>${this.taxClasses.find(x => x.id === t.id) ? 'Edit Tax Class' : 'New Tax Class'}</h3>
            <div class="form-row"><label>Name</label>
              <input class="form-input" .value=${t.name || ''} placeholder="e.g. Standard"
                @input=${e => { this.editingTaxClass = { ...t, name: e.target.value }; }}>
            </div>
            <div class="form-row"><label>Default Tax Rate (%)</label>
              <input class="form-input" type="number" step="0.01" min="0" .value=${(t.defaultRate || 0) * 100}
                @input=${e => { this.editingTaxClass = { ...t, defaultRate: (Number(e.target.value) || 0) / 100 }; }}>
            </div>
            <div class="form-row"><label>Country/Region Specific Tax Rates</label>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${(t.countryRates || []).map((r, i) => html`
                  <div style="display:flex;gap:6px;align-items:center">
                    <span style="flex:1">${this.countries.find(c => c.code === r.countryCode)?.name ?? r.countryCode}</span>
                    <input class="form-input" style="width:100px" type="number" step="0.01" min="0" .value=${(r.rate || 0) * 100}
                      @input=${e => { const countryRates = t.countryRates.map((x, j) => j === i ? { ...x, rate: (Number(e.target.value) || 0) / 100 } : x); this.editingTaxClass = { ...t, countryRates }; }}>
                    <span>%</span>
                    <button style="background:none;border:none;cursor:pointer;color:#999;font-size:1rem"
                      @click=${() => { this.editingTaxClass = { ...t, countryRates: t.countryRates.filter((_, j) => j !== i) }; }}>×</button>
                  </div>`)}
                ${availableCountries.length > 0 ? html`
                  <select @change=${e => { if (e.target.value) { this.editingTaxClass = { ...t, countryRates: [...(t.countryRates || []), { countryCode: e.target.value, rate: 0 }] }; e.target.value = ''; } }}>
                    <option value="">+ Add country override…</option>
                    ${availableCountries.map(c => html`<option value=${c.code}>${c.name}</option>`)}
                  </select>` : ''}
              </div>
            </div>
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveTaxClass()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingTaxClass = null; }}>Cancel</uui-button>
            </div>
          </div>
          </div>` : ''}

        ${this.taxClassesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          this.taxClasses.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-calculator" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No tax classes yet</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Default Tax Rate</th><th>Overrides</th><th></th></tr></thead>
                <tbody>
                  ${this.taxClasses.map(tc => html`
                    <tr class="data-row" style="cursor:pointer"
                      @click=${() => { this.editingTaxClass = { ...tc, countryRates: (tc.countryRates || []).map(r => ({ ...r })) }; }}>
                      <td><uui-icon name="icon-calculator" style="opacity:0.5;margin-right:6px"></uui-icon><strong>${tc.name}</strong></td>
                      <td>${((tc.defaultRate || 0) * 100).toFixed(2)}%</td>
                      <td>${(tc.countryRates || []).length} override${(tc.countryRates || []).length !== 1 ? 's' : ''}</td>
                      <td class="row-actions">
                        <uui-button look="secondary" color="danger" compact @click=${(e) => { e.stopPropagation(); this.deleteTaxClass(tc.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Tax Classes</span>
          ${this.taxClasses.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${this.taxClasses.length} tax class${this.taxClasses.length !== 1 ? 'es' : ''}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Currencies ───────────────────────────────────────────────────────────────

  /** Create button with a flyout: blank · one ISO preset · every ISO preset. */
  _createFlyout(key, label, items) {
    return html`
      <div class="filter-wrap">
        <uui-button look="primary" @click=${e => { e.stopPropagation(); this.createMenu = this.createMenu === key ? '' : key; }}>
          + Create ${label}
        </uui-button>
        ${this.createMenu === key ? html`
          <div class="dropdown dropdown--right" @click=${e => e.stopPropagation()}>
            ${items.map(([itemLabel, run]) => html`
              <button class="dd-item" @click=${() => { this.createMenu = ''; run(); }}>${itemLabel}</button>`)}
          </div>` : ''}
      </div>`;
  }

  /**
   * The per-country toggles. A store that bulk-added the ISO presets has ~200 countries, which is an
   * unusable wall of toggles — so the list gets a filter box past a dozen. Filtering only affects what
   * is rendered; a selected country scrolled out of view stays selected.
   */
  _renderCurrencyCountryToggles(c) {
    const selected = new Set(c.countryCodes || []);
    const q = (this.currencyCountryFilter || '').toLowerCase();
    const shown = q
      ? this.marketCountries.filter(mc => mc.name?.toLowerCase().includes(q) || mc.code?.toLowerCase().includes(q))
      : this.marketCountries;

    return html`
      ${this.marketCountries.length > 12 ? html`
        <div style="display:flex;align-items:center;gap:8px">
          <input class="form-input" style="flex:1" type="search" placeholder="Filter countries…"
            .value=${this.currencyCountryFilter || ''}
            @input=${e => { this.currencyCountryFilter = e.target.value; }}>
          <span style="color:#999;font-size:0.78rem;white-space:nowrap">${selected.size} selected</span>
        </div>` : ''}
      <div style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto">
        ${shown.map(mc => html`
          <uui-toggle label=${mc.name} ?checked=${selected.has(mc.code)}
            @change=${e => {
              const codes = new Set(c.countryCodes || []);
              if (e.target.checked) codes.add(mc.code); else codes.delete(mc.code);
              this.editingCurrency = { ...c, countryCodes: [...codes] };
            }}>${mc.name}</uui-toggle>`)}
        ${shown.length === 0 ? html`<span style="color:#999;font-size:0.8rem">No countries match the filter.</span>` : ''}
      </div>`;
  }

  _renderCurrenciesView() {
    const c = this.editingCurrency;
    const PAGE_SIZE = 10;
    const q = (this.currenciesSearch || '').toLowerCase();
    const filtered = q
      ? this.currencies.filter(x => x.name?.toLowerCase().includes(q) || x.code?.toLowerCase().includes(q))
      : this.currencies;
    const page = this.currenciesPage;
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const presets = this.currencyPresets?.currencies ?? [];
    const cultures = this.currencyPresets?.cultures ?? [];

    return html`
      <div class="view-container">
        ${this._viewHeader('Currencies', this._createFlyout('currency', 'Currency', [
          ['New blank currency', () => this.startCurrency(false)],
          ['New currency from ISO 4217 preset', () => this.startCurrency(true)],
          ['All currencies from ISO 4217 presets', () => this.addAllCurrencyPresets()],
        ]))}

        ${this._errorBanner(this.currenciesError, () => { this.currenciesError = null; })}

        ${c ? html`
          <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this.editingCurrency = null; }}>
          <div class="form-panel form-panel--modal">
            <h3>${this.currencies.find(x => x.id === c.id) ? 'Edit Currency' : 'New Currency'}</h3>

            ${c.presetPicker ? html`
              <div class="form-row"><label>ISO 4217 preset</label>
                <select class="form-input" @change=${e => this.applyCurrencyPreset(e.target.value)}>
                  <option value="">Choose a currency…</option>
                  ${presets.map(p => html`<option value=${p.code} ?selected=${p.code === c.code}>${p.code} — ${p.name}</option>`)}
                </select>
              </div>` : ''}

            <div class="form-row"><label>Name</label>
              <input class="form-input" .value=${c.name || ''} placeholder="e.g. Swedish krona"
                @input=${e => { this.editingCurrency = { ...c, name: e.target.value }; }}>
            </div>
            <div class="form-row"><label>ISO Code</label>
              <input class="form-input" maxlength="3" .value=${c.code || ''} placeholder="3 letter ISO currency code"
                @input=${e => { this.editingCurrency = { ...c, code: e.target.value.toUpperCase() }; }}>
            </div>
            <div class="form-row"><label>Culture</label>
              <select class="form-input" @change=${e => { this.editingCurrency = { ...c, culture: e.target.value }; }}>
                <option value="">— None —</option>
                ${cultures.map(x => html`<option value=${x.name} ?selected=${x.name === c.culture}>${x.displayName}</option>`)}
              </select>
            </div>
            <div class="form-row"><label>Custom Format Template</label>
              <input class="form-input" .value=${c.formatTemplate || ''} placeholder="e.g. {0:n0} kr — used by storefronts"
                @input=${e => { this.editingCurrency = { ...c, formatTemplate: e.target.value }; }}>
            </div>

            <div class="form-row" style="align-items:flex-start">
              <label>Available in Countries</label>
              <div style="display:flex;flex-direction:column;gap:6px;flex:1">
                <uui-toggle label="All" ?checked=${c.allCountries}
                  @change=${e => { this.editingCurrency = { ...c, allCountries: e.target.checked }; }}>All</uui-toggle>
                ${c.allCountries ? '' : (this.marketCountries.length ? this._renderCurrencyCountryToggles(c)
                  : html`<span style="color:#999;font-size:0.8rem">No countries configured for this store yet — add some under Options → Countries.</span>`)}
              </div>
            </div>

            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveCurrency()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingCurrency = null; }}>Cancel</uui-button>
            </div>
          </div>
          </div>` : ''}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Type to search…"
                .value=${this.currenciesSearch}
                @input=${e => { this.currenciesSearch = e.target.value; this.currenciesPage = 1; }}>
            </div>
          </div>
        </div>

        ${this.currenciesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          filtered.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-coins" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${q ? 'No currencies match your search' : 'No currencies yet'}</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>ISO Code</th><th>Available in</th><th></th></tr></thead>
                <tbody>
                  ${paged.map(cur => html`
                    <tr class="data-row" style="cursor:pointer" @click=${() => this._editCurrency(cur)}>
                      <td>
                        <uui-icon name="icon-coins" style="opacity:0.5;margin-right:6px"></uui-icon>
                        <strong>${cur.name}</strong>
                        ${cur.code === this.activeCurrencyCode
                          ? html`<span class="pill" style="background:#16a34a;color:#fff;margin-left:8px">store currency</span>` : ''}
                      </td>
                      <td>${cur.code}</td>
                      <td>${(cur.countryCodes || []).length
                        ? `${cur.countryCodes.length} countr${cur.countryCodes.length === 1 ? 'y' : 'ies'}`
                        : 'All countries'}</td>
                      <td class="row-actions">
                        <uui-button look="secondary" color="danger" compact
                          @click=${(e) => { e.stopPropagation(); this.deleteCurrency(cur.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.currenciesPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Currencies</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} currenc${filtered.length !== 1 ? 'ies' : 'y'}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Countries ────────────────────────────────────────────────────────────────

  _renderCountriesView() {
    const c = this.editingMarketCountry;
    const PAGE_SIZE = 10;
    const q = (this.marketCountriesSearch || '').toLowerCase();
    const filtered = q
      ? this.marketCountries.filter(x => x.name?.toLowerCase().includes(q) || x.code?.toLowerCase().includes(q))
      : this.marketCountries;
    const page = this.marketCountriesPage;
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const currencyName = id => this.currencies.find(x => x.id === id)?.code || '—';

    return html`
      <div class="view-container">
        ${this._viewHeader('Countries', this._createFlyout('country', 'Country', [
          ['New blank country', () => this.startMarketCountry(false)],
          ['New country from ISO 3166 preset', () => this.startMarketCountry(true)],
          ['All countries from ISO 3166 presets', () => this.addAllCountryPresets()],
        ]))}

        ${this._errorBanner(this.marketCountriesError, () => { this.marketCountriesError = null; })}

        ${c ? html`
          <div class="modal-overlay" @click=${(e) => { if (e.target === e.currentTarget) this.editingMarketCountry = null; }}>
          <div class="form-panel form-panel--modal">
            <h3>${this.marketCountries.find(x => x.id === c.id) ? 'Edit Country' : 'New Country'}</h3>

            ${c.presetPicker ? html`
              <div class="form-row"><label>ISO 3166 preset</label>
                <select class="form-input" @change=${e => this.applyCountryPreset(e.target.value)}>
                  <option value="">Choose a country…</option>
                  ${this.countries.map(p => html`<option value=${p.code} ?selected=${p.code === c.code}>${p.name} (${p.code})</option>`)}
                </select>
              </div>` : ''}

            <div class="form-row"><label>Name</label>
              <input class="form-input" .value=${c.name || ''} placeholder="e.g. Sweden"
                @input=${e => { this.editingMarketCountry = { ...c, name: e.target.value }; }}>
            </div>
            <div class="form-row"><label>ISO Code</label>
              <input class="form-input" maxlength="2" .value=${c.code || ''} placeholder="2 letter ISO country code"
                @input=${e => { this.editingMarketCountry = { ...c, code: e.target.value.toUpperCase() }; }}>
            </div>
            <div class="form-row"><label>Default Currency</label>
              <select class="form-input" @change=${e => { this.editingMarketCountry = { ...c, defaultCurrencyId: e.target.value }; }}>
                <option value="">— None —</option>
                ${this.currencies.map(x => html`<option value=${x.id} ?selected=${x.id === c.defaultCurrencyId}>${x.name} (${x.code})</option>`)}
              </select>
            </div>
            <div class="form-row"><label>Default Shipping Method</label>
              <select class="form-input" @change=${e => { this.editingMarketCountry = { ...c, defaultShippingMethodId: e.target.value }; }}>
                <option value="">— None —</option>
                ${this.shippingMethods.map(x => html`<option value=${x.id} ?selected=${x.id === c.defaultShippingMethodId}>${x.name}</option>`)}
              </select>
            </div>
            <div class="form-row"><label>Default Payment Method</label>
              <select class="form-input" @change=${e => { this.editingMarketCountry = { ...c, defaultPaymentProviderAlias: e.target.value }; }}>
                <option value="">— None —</option>
                ${this.marketPaymentProviders.map(p => html`
                  <option value=${p.alias} ?selected=${p.alias === c.defaultPaymentProviderAlias}>${p.displayName || p.alias}</option>`)}
              </select>
            </div>

            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveMarketCountry()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingMarketCountry = null; }}>Cancel</uui-button>
            </div>
          </div>
          </div>` : ''}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Type to search…"
                .value=${this.marketCountriesSearch}
                @input=${e => { this.marketCountriesSearch = e.target.value; this.marketCountriesPage = 1; }}>
            </div>
          </div>
        </div>

        ${this.marketCountriesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          filtered.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-flag" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${q ? 'No countries match your search' : 'No countries yet'}</p>
            ${q ? '' : html`<p style="color:#bbb;font-size:0.8rem">With none configured, the whole ISO 3166 list is offered everywhere.</p>`}`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>ISO Code</th><th>Default Currency</th><th></th></tr></thead>
                <tbody>
                  ${paged.map(country => html`
                    <tr class="data-row" style="cursor:pointer"
                      @click=${() => { this.editingMarketCountry = { ...country }; }}>
                      <td><uui-icon name="icon-flag" style="opacity:0.5;margin-right:6px"></uui-icon><strong>${country.name}</strong></td>
                      <td>${country.code}</td>
                      <td>${currencyName(country.defaultCurrencyId)}</td>
                      <td class="row-actions">
                        <uui-button look="secondary" color="danger" compact
                          @click=${(e) => { e.stopPropagation(); this.deleteMarketCountry(country.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.marketCountriesPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Countries</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} countr${filtered.length !== 1 ? 'ies' : 'y'}</span>` : ''}
        </div>
      </div>`;
  }

  // ── Coming Soon ────────────────────────────────────────────────────────────

  _renderComingSoon(label) {
    return html`
      <div class="view-container">
        ${this._viewHeader(label)}
        ${this._stateCenter(html`
          <uui-icon name="icon-box" style="font-size:3rem;opacity:0.2"></uui-icon>
          <p style="color:#999">${label} is not yet available.</p>
          <p style="color:#bbb;font-size:0.8rem">This feature will be added in a future release.</p>`)}
        <div class="view-footer"><span class="breadcrumb">${this.marketName} / ${label}</span></div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR
  // ═══════════════════════════════════════════════════════════════════════════

  _renderSidebar() {
    return html`
      <nav class="sidebar">
        <div class="sidebar-title ${this.activeView === 'home' ? 'sidebar-title--active' : ''}"
             @click=${() => this._selectView('home')}>Commerce</div>
        ${this.markets.map(m => this._renderStoreNode(m))}
      </nav>`;
  }

  _renderStoreNode(m) {
    const expanded = this.expandedStores.has(m.id);
    const optionsOpen = this.optionsOpenStores.has(m.id);
    const inThisStore = this.selectedMarketId === m.id;
    return html`
      <div class="store-node ${inThisStore ? 'store-node--active' : ''}"
           @click=${() => this._toggleStore(m)}>
        <span class="store-caret ${expanded ? 'open' : ''}">▸</span>
        <uui-icon name="icon-store" class="nav-icon nav-icon--sm"></uui-icon>
        <span class="store-node-name">${m.name}</span>
      </div>
      ${expanded ? html`
        <ul class="nav-list">
          ${NAV_ITEMS.map(item => html`
            <li class="nav-item ${inThisStore && (this.activeView === item.key || this.activeView === item.detail) ? 'active' : ''} ${!item.enabled ? 'disabled' : ''}"
                @click=${(e) => { e.stopPropagation(); item.enabled && this._selectStoreView(m, item.key); }}>
              <uui-icon name="${item.icon}" class="nav-icon"></uui-icon>
              ${item.label}
            </li>`)}

          <li class="nav-item nav-item--group"
              @click=${e => { e.stopPropagation(); this._toggleOptions(m); }}>
            <uui-icon name="icon-settings" class="nav-icon"></uui-icon>
            Options
            <span class="group-caret ${optionsOpen ? 'open' : ''}">▾</span>
          </li>

          ${optionsOpen ? OPTIONS_SUBITEMS.map(sub => html`
            <li class="nav-subitem ${!sub.enabled ? 'disabled' : ''} ${inThisStore && this.activeView === sub.key ? 'nav-subitem--active' : ''}"
                @click=${(e) => { e.stopPropagation(); sub.enabled && this._selectStoreView(m, sub.key); }}>
              <uui-icon name="${sub.icon}" class="nav-icon nav-icon--sm"></uui-icon>
              ${sub.label}
            </li>`) : ''}
        </ul>` : ''}`;
  }

  _toggleStore(m) {
    this.expandedStores = this._toggled(this.expandedStores, m.id);
  }

  _toggleOptions(m) {
    this.optionsOpenStores = this._toggled(this.optionsOpenStores, m.id);
  }

  _toggled(set, id) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }

  // Set the store first, then switch view: _selectView does the one and only fetch, so it happens
  // once and for the store being switched to. Fetching on the market change instead would load the
  // view being left — which is how clicking store B's Orders used to show store A's.
  _selectStoreView(m, key) {
    if (this.selectedMarketId !== m.id) this._setMarket(m);
    this._selectView(key);
  }

  _openStore(m) {
    this.expandedStores = new Set(this.expandedStores).add(m.id);
    this._setMarket(m);
    this._selectView('orders');
  }

  _renderHomeView() {
    return html`
      <div class="commerce-home">
        <h1>Welcome to the Commerce Section</h1>
        <p class="home-intro">Access the stores available to you and manage their orders, discounts and performance.</p>
        <h2>Your Stores</h2>
        <div class="store-cards">
          ${this.markets.map(m => html`
            <div class="store-card" @click=${() => this._openStore(m)}>
              <div class="store-card-icon"><uui-icon name="icon-store"></uui-icon></div>
              <div class="store-card-name">${m.name}</div>
              <div class="store-card-meta">${m.currency || ''}</div>
            </div>`)}
          ${this.markets.length === 0 ? html`<p>No stores available.</p>` : ''}
        </div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOT RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  _renderCurrentView() {
    switch (this.activeView) {
      case 'home':           return this._renderHomeView();
      case 'orders':         return this._renderOrdersView();
      case 'order-detail':   return this._renderOrderDetailView();
      case 'carts':          return this._renderCartsView();
      case 'cart-detail':    return this._renderCartDetailView();
      case 'analytics':      return this._renderAnalyticsView();
      case 'order-statuses': return this._renderOrderStatusesView();
      case 'discounts':      return this._renderDiscountsView();
      case 'attributes':          return this._renderAttributesView();
      case 'attribute-presets':   return this._renderAttributePresetsView();
      case 'tax-classes':         return this._renderTaxClassesView();
      case 'currencies':          return this._renderCurrenciesView();
      case 'countries':           return this._renderCountriesView();
      case 'property-templates':  return this._renderPropertyTemplatesView();
      case 'payment-providers':   return html`<div class="view-container"><ecomm-payment-providers-dashboard .marketId=${this.selectedMarketId} .embedded=${true}></ecomm-payment-providers-dashboard></div>`;
      default: {
        const found = [...NAV_ITEMS, ...OPTIONS_SUBITEMS].find(i => i.key === this.activeView);
        return this._renderComingSoon(found?.label ?? this.activeView);
      }
    }
  }

  render() {
    return html`
      <div class="commerce-layout">
        ${this._renderSidebar()}
        <div class="commerce-content">${this._renderCurrentView()}</div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════════════

  static styles = css`
    :host { display: block; height: 100%; overflow: hidden; }

    .commerce-layout {
      display: flex;
      height: 100%;
      background: #f4f4f4;
      font-family: var(--uui-font-family, sans-serif);
      font-size: 0.875rem;
    }

    /* ── Sidebar ─────────────────────────────────────────────────── */
    .sidebar {
      width: 260px;
      flex-shrink: 0;
      background: #ffffff;
      border-right: 1px solid #e5e5e5;
      overflow-y: auto;
      padding-bottom: 16px;
      color: #333333;
    }

    .store-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 12px;
      cursor: pointer;
      border-bottom: 1px solid #e5e5e5;
      font-weight: 600;
      font-size: 0.875rem;
      color: #1a1a1a;
      user-select: none;
    }
    .store-header:hover { background: #f5f5f5; }

    .store-icon-wrap {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px;
      background: #1b264f; border-radius: 4px; color: #fff; flex-shrink: 0;
    }

    .store-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1a1a1a; }
    .store-caret { font-size: 0.7rem; color: #888; display: inline-block; transition: transform .15s ease; }
    .store-caret.open { transform: rotate(90deg); }

    /* Per-store tree */
    .sidebar-title {
      padding: 14px 12px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;
      letter-spacing: 0.03em; color: #6b6b6b; cursor: pointer; border-bottom: 1px solid #e5e5e5;
      user-select: none;
    }
    .sidebar-title:hover { background: #f5f5f5; }
    .sidebar-title--active { color: #c0392b; }
    .store-node {
      display: flex; align-items: center; gap: 8px; padding: 12px; cursor: pointer;
      font-weight: 600; font-size: 0.875rem; color: #1a1a1a; user-select: none;
    }
    .store-node:hover { background: #f5f5f5; }
    .store-node--active { color: #1b264f; }
    .store-node-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Welcome / store cards */
    .commerce-home { padding: 28px 32px; overflow-y: auto; }
    .commerce-home h1 { font-size: 1.6rem; margin: 0 0 8px; color: #1a1a1a; }
    .commerce-home h2 { font-size: 1.1rem; margin: 24px 0 12px; color: #1a1a1a; }
    .home-intro { color: #555; max-width: 640px; }
    .store-cards { display: flex; flex-wrap: wrap; gap: 16px; }
    .store-card {
      width: 220px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px;
      padding: 24px 16px; text-align: center; cursor: pointer; transition: box-shadow .15s, border-color .15s;
    }
    .store-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); border-color: #1b264f; }
    .store-card-icon {
      display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;
      margin: 0 auto 12px; background: #f0f0f3; border-radius: 50%; color: #1b264f; font-size: 1.2rem;
    }
    .store-card-name { font-weight: 600; color: #1a1a1a; }
    .store-card-meta { color: #888; font-size: 0.8rem; margin-top: 4px; }

    .nav-list { list-style: none; margin: 4px 0 8px; padding: 0; }

    .nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px 8px 16px;
      cursor: pointer; color: #333333; font-size: 0.84rem;
      position: relative; user-select: none;
    }
    .nav-item:hover:not(.disabled) { background: #f5f5f5; }
    .nav-item.active { background: #fde8e8; color: #c0392b; font-weight: 600; }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #d9534f; border-radius: 0 2px 2px 0;
    }
    .nav-item.disabled { color: #bbbbbb; cursor: default; }
    .nav-item--group { }

    .group-caret { margin-left: auto; font-size: 0.7em; color: #888888; }

    .nav-subitem {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px 6px 40px;
      font-size: 0.8rem; list-style: none; color: #555555;
      cursor: pointer; user-select: none;
    }
    .nav-subitem:hover:not(.disabled) { background: #f5f5f5; }
    .nav-subitem.disabled { color: #bbbbbb; cursor: default; }
    .nav-subitem--active { background: #fde8e8; color: #c0392b; font-weight: 600; }
    .nav-subitem--active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #d9534f; border-radius: 0 2px 2px 0;
    }
    .nav-subitem { position: relative; }

    .nav-icon { font-size: 1rem; flex-shrink: 0; color: inherit; }
    .nav-icon--sm { font-size: 0.85rem; }

    /* ── Content area ─────────────────────────────────────────── */
    .commerce-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

    /* overflow-y here, not on each view: the inline views bring their own "flex: 1; overflow: auto"
       body, but embedded child elements (payment providers) can't — they'd be clipped by
       .commerce-content's overflow: hidden with no scrollbar anywhere. */
    .view-container { display: flex; flex-direction: column; height: 100%; background: #f4f4f4; overflow-y: auto; }

    .view-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px 0; background: #f4f4f4;
    }
    .view-title { margin: 0; font-size: 1.2rem; font-weight: 600; color: #1a1a1a; }

    .error-banner {
      display: flex; align-items: center; gap: 8px;
      margin: 10px 24px 0; padding: 9px 14px;
      background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px;
      color: #dc2626; font-size: 0.84rem;
    }
    .error-close { margin-left: auto; background: none; border: none; cursor: pointer; font-size: 1.1rem; color: #dc2626; }

    /* ── Filters bar ──────────────────────────────────────────── */
    .filters-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 24px; gap: 12px;
    }
    .filters-left { display: flex; gap: 4px; }
    .filters-right { display: flex; align-items: center; gap: 8px; }

    .filter-wrap { position: relative; }

    .filter-btn {
      display: flex; align-items: center; gap: 3px;
      padding: 5px 10px; background: #ffffff;
      border: 1px solid #d4d4d4; border-radius: 4px;
      cursor: pointer; font-size: 0.8rem; color: #333333; white-space: nowrap;
    }
    .filter-btn:hover { background: #f5f5f5; }
    .filter-reset { color: #ef4444; border-color: #fca5a5; background: #fff5f5; }
    .filter-reset:hover { background: #fee2e2; }
    .caret { font-size: 0.65em; opacity: 0.5; margin-left: 2px; }

    .dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; z-index: 200;
      background: #ffffff; border: 1px solid #d4d4d4; border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12); min-width: 160px; overflow: hidden;
    }
    .dd-item {
      display: block; width: 100%; text-align: left; padding: 7px 14px;
      background: none; border: none; cursor: pointer; font-size: 0.8rem; color: #333333;
    }
    .dd-item:hover { background: #f5f5f5; }
    .dd-item.active { background: #eff6ff; font-weight: 600; }
    /* Right-aligned flyout, for a trigger that sits at the right edge of a view header. */
    .dropdown--right { left: auto; right: 0; white-space: nowrap; }

    .icon-btn {
      display: flex; align-items: center; justify-content: center; padding: 5px 8px;
      background: #ffffff; border: 1px solid #d4d4d4; border-radius: 4px;
      cursor: pointer; color: #666666;
    }
    .icon-btn:hover { background: #f5f5f5; }

    .search-wrap { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 8px; font-size: 0.875rem; color: #aaaaaa; pointer-events: none; }
    .search-input {
      padding: 5px 10px 5px 28px; border: 1px solid #d4d4d4; border-radius: 4px;
      background: #ffffff; font-size: 0.8rem; width: 200px; outline: none; color: #333333;
    }
    .search-input:focus { border-color: #3b82f6; }
    .search-input::placeholder { color: #bbbbbb; }

    /* ── Table ────────────────────────────────────────────────── */
    .table-scroll { flex: 1; overflow: auto; background: #ffffff; }

    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead { position: sticky; top: 0; z-index: 1; background: #ffffff; }
    .data-table th {
      text-align: left; padding: 10px 16px; border-bottom: 1px solid #e5e5e5;
      font-size: 0.78rem; font-weight: 600; color: #777777; white-space: nowrap;
    }
    .data-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }

    .data-row { cursor: pointer; }
    .data-row:hover { background: #fafafa; }
    .data-row.expanded { background: #f5f7ff; }
    .data-row.selected > td { background: #eff6ff; }

    .col-check { width: 40px; }
    .col-date { min-width: 190px; color: #666666; font-size: 0.84rem; }
    .col-r { text-align: right; }

    input[type="checkbox"] { cursor: pointer; accent-color: #3b82f6; }

    .name-cell { display: flex; align-items: center; gap: 10px; }
    .doc-icon {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; background: #f0f0f0;
      border: 1px solid #e0e0e0; border-radius: 4px; color: #888888; flex-shrink: 0;
    }
    .name-primary { display: block; font-weight: 600; color: #1a1a1a; }
    .name-sub { display: block; font-size: 0.75rem; color: #888888; }

    .pay-amount { display: block; font-weight: 700; color: #1a1a1a; }
    .pay-method { display: block; font-size: 0.75rem; color: #888888; }

    .muted { color: #888888; }

    /* Session ids are GUIDs — keep them from stretching the Carts table. */
    .session-id { font-size: 0.78rem; color: #666666; word-break: break-all; }

    /* ── Status pills ─────────────────────────────────────────── */
    .pill {
      display: inline-block; padding: 3px 10px;
      border-radius: 20px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;
    }
    .pill--order-new        { background: #0ea5e9; color: #fff; }
    .pill--order-pending    { background: #0ea5e9; color: #fff; }
    .pill--order-submitted  { background: #8b5cf6; color: #fff; }
    .pill--order-processing { background: #f59e0b; color: #fff; }
    .pill--order-paid       { background: #10b981; color: #fff; }
    .pill--order-shipped    { background: #6366f1; color: #fff; }
    .pill--order-completed  { background: #059669; color: #fff; }
    .pill--order-cancelled  { background: #ef4444; color: #fff; }
    .pill--order-on-hold    { background: #94a3b8; color: #fff; }
    .pill--order-refunded   { background: #f43f5e; color: #fff; }
    /* fallback for any unknown status */
    .pill[class*="pill--order-"] { background: #6b7280; color: #fff; }

    .pill--payment-initialized { background: #e5e7eb; color: #374151; }
    .pill--payment-authorized  { background: #dbeafe; color: #1d4ed8; }
    .pill--payment-paid        { background: #d1fae5; color: #065f46; }
    .pill--payment-cancelled   { background: #fee2e2; color: #991b1b; }
    .pill--payment-refunded    { background: #fce7f3; color: #9d174d; }

    .pill--active   { background: #d1fae5; color: #065f46; }
    .pill--inactive { background: #f3f4f6; color: #6b7280; }
    .pill--system   { background: #dbeafe; color: #1d4ed8; }
    .pill--single   { background: #f3f4f6; color: #374151; }
    .pill--group    { background: #ede9fe; color: #5b21b6; }

    .sub-options-grid { display: flex; flex-direction: column; gap: 6px; }
    .sub-option-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      font-size: 0.85rem; cursor: pointer;
    }
    .sub-option-item--checked { border-color: var(--uui-color-interactive, #4a6ba8); background: #eff6ff; }
    .sub-option-item input { margin: 0; }

    /* ── Detail row ───────────────────────────────────────────── */
    .detail-row td { padding: 0; cursor: default; }
    .detail-panel {
      padding: 20px 24px 20px 54px;
      background: #f9f9fb;
      border-bottom: 2px solid #e0e0e0;
    }
    .detail-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 20px; margin-bottom: 14px;
    }
    .detail-section { }
    .detail-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #999999; margin-bottom: 5px; }
    .detail-section p { margin: 2px 0; font-size: 0.84rem; color: #333333; }
    .total-line { margin-top: 4px; }

    .items-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin: 8px 0 14px; }
    .items-table th { text-align: left; padding: 5px 10px; border-bottom: 1px solid #dddddd; font-size: 0.75rem; color: #999999; }
    .items-table td { padding: 7px 10px; border-bottom: 1px solid #eeeeee; color: #333333; }
    .item-name-cell { display: flex; align-items: center; gap: 8px; }
    .item-thumb { width: 28px; height: 28px; object-fit: cover; border-radius: 3px; }

    .status-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid #e5e5e5; }

    /* ── Analytics ────────────────────────────────────────────── */
    .analytics-body { flex: 1; overflow: auto; padding: 16px 24px; }

    .stat-cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat-card {
      background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px;
      padding: 16px 20px; min-width: 130px; flex: 1;
    }
    .stat-card--highlight { border-color: #10b981; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }
    .stat-label { font-size: 0.75rem; color: #888888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }

    .analytics-section { background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
    .analytics-section-title { padding: 12px 16px; font-size: 0.85rem; font-weight: 600; color: #444444; border-bottom: 1px solid #f0f0f0; }

    .progress-wrap { display: flex; align-items: center; gap: 8px; }
    .progress-bar { height: 6px; background: #0ea5e9; border-radius: 3px; min-width: 2px; }

    /* ── Order status color dot ───────────────────────────────── */
    .color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; }

    /* ── States ───────────────────────────────────────────────── */
    .state-center {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; color: #aaaaaa; padding: 60px;
      text-align: center;
    }

    /* ── Pagination ───────────────────────────────────────────── */
    .pagination-bar {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      padding: 10px 24px; border-top: 1px solid #e5e5e5; background: #ffffff;
    }
    .page-btn {
      min-width: 30px; height: 30px; padding: 0 8px;
      background: #ffffff; border: 1px solid #d4d4d4; border-radius: 4px;
      cursor: pointer; font-size: 0.82rem; color: #333333; line-height: 1;
    }
    .page-btn:hover:not(:disabled) { background: #f5f5f5; }
    .page-btn:disabled { color: #bbbbbb; cursor: default; }
    .page-btn--active { background: #1b264f; color: #ffffff; border-color: #1b264f; font-weight: 600; }
    .page-ellipsis { font-size: 0.82rem; color: #888888; padding: 0 4px; line-height: 30px; }

    /* ── Order detail view ────────────────────────────────────── */
    .detail-breadcrumb { display: flex; align-items: center; gap: 8px; }
    .back-btn {
      background: none; border: none; cursor: pointer;
      font-size: 0.88rem; color: #3b82f6; padding: 4px 0;
    }
    .back-btn:hover { text-decoration: underline; }
    .breadcrumb-sep { color: #cccccc; }
    .detail-order-num { font-size: 0.9rem; color: #444444; font-weight: 600; }
    .detail-status-badge { margin-left: auto; }

    .detail-body {
      flex: 1; overflow-y: auto; padding: 20px 24px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .detail-grid--wide {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px; background: #ffffff; border: 1px solid #e5e5e5;
      border-radius: 8px; padding: 20px;
    }
    .detail-section-block {
      background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 20px;
    }
    .detail-section-block .detail-label { margin-bottom: 10px; }

    /* ── Footer ───────────────────────────────────────────────── */
    .view-footer { padding: 9px 24px; border-top: 1px solid #e5e5e5; background: #ffffff; }
    .breadcrumb { font-size: 0.78rem; color: #aaaaaa; }

    /* ── Store tax rate (Tax Classes view) ────────────────────── */
    .store-tax {
      margin: 12px 24px 0; padding: 12px 16px;
      background: #ffffff; border: 1px solid #e5e5e5; border-radius: 6px;
    }
    .store-tax-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .store-tax-row label { font-weight: 600; margin-right: 4px; }
    .store-tax small { display: block; margin-top: 6px; color: #888888; }

    /* ── Market list ──────────────────────────────────────────── */
    .market-list { padding: 6px 0 2px; border-bottom: 1px solid #e5e5e5; }
    .market-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px 6px 16px;
      font-size: 0.8rem; color: #555555; cursor: pointer; user-select: none;
    }
    .market-item:hover { background: #f5f5f5; }
    .market-item--active { background: #eff6ff; color: #1d4ed8; font-weight: 600; }

    /* ── Form panel (discounts / presets) ─────────────────────── */
    .form-panel {
      margin: 10px 24px; padding: 16px 20px;
      background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px;
    }
    .form-panel h3 { margin: 0 0 14px; font-size: 0.95rem; color: #1a1a1a; }
    .form-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .form-row label { min-width: 140px; font-size: 0.82rem; color: #555555; }
    .form-input {
      flex: 1; padding: 6px 10px; border: 1px solid #d4d4d4; border-radius: 4px;
      font-size: 0.82rem; color: #333333; background: #fff; outline: none;
    }
    .form-input:focus { border-color: #3b82f6; }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #f0f0f0; }

    /* Modal editor: dim backdrop + centered, scrollable panel with a sticky action footer so
       Save/Cancel stay reachable no matter how many values the attribute has. */
    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0, 0, 0, 0.45);
      display: flex; align-items: flex-start; justify-content: center;
      padding: 4vh 16px; overflow-y: auto;
    }
    .form-panel--modal {
      margin: 0; width: min(920px, 100%); max-height: 90vh;
      display: flex; flex-direction: column; overflow-y: auto;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.28);
    }
    .form-panel--modal .form-actions {
      position: sticky; bottom: 0; margin-top: 14px;
      background: #ffffff; padding-bottom: 4px;
    }

    .row-actions { display: flex; gap: 4px; white-space: nowrap; }
  `;
}

customElements.define('commerce-admin-dashboard', CommerceAdminDashboard);
export default CommerceAdminDashboard;
