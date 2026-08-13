import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import '@umbraco-cms/backoffice/media'; // registers the native <umb-input-rich-media> element
// The shared design kit — see umbraco/docs/DESIGN-SYSTEM.md before adding UI here.
import {
  commerceStyles, viewHeader, viewFooter, errorBanner, stateCenter, loadingState, emptyState,
  pager, searchBox, searchBar, formRow, checkRow, iconButton, pill, refreshButton, createButton,
  createFlyout, modalShell, modalActions, confirmDelete,
} from '../shared/commerce-ui.js';
import './payment-providers-dashboard.js'; // registers <ecomm-payment-providers-dashboard> (Options → Payment Providers)

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['pending', 'processing', 'paid', 'shipped', 'cancelled', 'refunded'];

// The payment lifecycle the API actually stores on an order (EComm.Payment PaymentState), plus the
// filter-only 'none' for an order that has no payment record — invoiced or imported. This list is not
// derived from the order status: an order status says where fulfilment got to, not whether money moved.
const PAYMENT_STATUSES = ['none', 'initialized', 'authorized', 'captured', 'cancelled', 'failed', 'refunded'];

const ORDER_STATUS_LABELS = {
  new: 'New', pending: 'New', submitted: 'Submitted', processing: 'Processing',
  paid: 'Paid', shipped: 'Shipped', completed: 'Completed',
  cancelled: 'Cancelled', 'on-hold': 'On Hold', refunded: 'Refunded',
};
const PAYMENT_STATUS_LABELS = {
  none: 'No payment', initialized: 'Initialized', authorized: 'Authorized', captured: 'Captured',
  cancelled: 'Cancelled', failed: 'Failed', refunded: 'Refunded',
};

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

// The Orders advanced filter, declared once: the drawer renders from this and loadOrders() sends it.
// `key` is the query parameter the API binds — see EComm.Api OrderFilterRequest for the match rules.
const ADV_FILTER_SECTIONS = [
  {
    title: 'Customer',
    fields: [
      { key: 'firstName', label: 'First name', hint: 'A full or partial first name to search on.' },
      { key: 'lastName', label: 'Last name', hint: 'A full or partial last name to search on.' },
      { key: 'email', label: 'Email address', hint: 'A full or partial email address to search on.' },
    ],
  },
  {
    title: 'Order',
    fields: [
      { key: 'orderNumber', label: 'Order number', hint: 'A full or partial order number to search on.' },
      { key: 'placedAfter', label: 'Placed on or after', type: 'date', hint: 'Orders placed on or after this date.' },
      { key: 'placedBefore', label: 'Placed on or before', type: 'date', hint: 'Orders placed on or before this date.' },
      { key: 'properties', label: 'Properties', hint: "Order properties as 'alias:value', comma separated. An alias on its own matches any order carrying it." },
    ],
  },
  {
    title: 'Order line',
    fields: [
      { key: 'skus', label: 'SKUs', hint: 'Matches orders containing any of these SKUs, comma separated.' },
    ],
  },
];

const ADV_FILTER_KEYS = ADV_FILTER_SECTIONS.flatMap(s => s.fields.map(f => f.key));

const emptyAdvFilter = () => Object.fromEntries(ADV_FILTER_KEYS.map(k => [k, '']));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const slugify = s => (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const getOrderStatusLabel  = s => ORDER_STATUS_LABELS[s]   || s || 'Unknown';
// An order with no payment reads as 'none', not as the first state of a payment that never started.
const paymentStatusKey = s => (s || '').toLowerCase() || 'none';
const getPaymentStatusLabel = s => PAYMENT_STATUS_LABELS[paymentStatusKey(s)] || s;

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
    // Advanced filter: `advFilter` is what the list is filtered by, `advDraft` is what the drawer is
    // editing. Two objects so Close discards and only Apply refetches.
    advFilter:           { type: Object  },
    advDraft:            { type: Object  },
    showAdvFilter:       { type: Boolean },
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
    // { status, inUseCount, target } while asking where a still-used status's orders should go
    reassignOrderStatus:  { type: Object  },
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
    this.advFilter = emptyAdvFilter(); this.advDraft = emptyAdvFilter(); this.showAdvFilter = false;
    this.selectedOrder = null; this.updatingStatusId = null;
    this.allSelected = false; this.selectedIds = new Set();
    this.currentPage = 1; this.pageSize = 20; this.totalCount = 0;

    this.carts = []; this.cartsLoading = false; this.cartsError = null; this.cartsSearch = '';
    this.selectedCart = null; this.cartsPage = 1; this.cartsTotalCount = 0;

    this.analyticsOrders = []; this.analyticsLoading = false; this.analyticsError = null;

    this.orderStatuses = []; this.orderStatusesLoading = false; this.orderStatusesError = null;
    this.editingOrderStatus = null; this.reassignOrderStatus = null;
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
      if (this.paymentStatusFilter) qs.set('paymentStatus', this.paymentStatusFilter);
      if (this.ordersSearch) qs.set('search', this.ordersSearch);
      if (this.selectedMarketId) qs.set('marketId', this.selectedMarketId);
      // Sent server-side so the advanced filter narrows every page, not the one on screen.
      for (const key of ADV_FILTER_KEYS) {
        const value = (this.advFilter[key] || '').trim();
        if (value) qs.set(key, value);
      }
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


  // ── Orders: advanced filter ────────────────────────────────────────────────
  // The drawer edits a draft, so closing it leaves the list as it was and only Apply refetches.

  get advCount() {
    return ADV_FILTER_KEYS.filter(k => (this.advFilter[k] || '').trim()).length;
  }

  openAdvFilter() {
    this.advDraft = { ...this.advFilter };
    this.showAdvFilter = true;
  }

  applyAdvFilter() {
    this.advFilter = { ...this.advDraft };
    this.showAdvFilter = false;
    this.currentPage = 1;
    this.loadOrders();
  }

  /** Blanks the drawer's fields; the list only changes once Apply is pressed. */
  resetAdvDraft() {
    this.advDraft = emptyAdvFilter();
  }

  clearOrderFilters() {
    this.orderStatusFilter = '';
    this.paymentStatusFilter = '';
    this.ordersSearch = '';
    this.advFilter = emptyAdvFilter();
    this.currentPage = 1;
    this.loadOrders();
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
    if (!await this._confirmDelete(this.discounts.find(x => x.id === id)?.name)) return;
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
    if (!await this._confirmDelete(this.attributes.find(x => x.id === id)?.name)) return;
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
    if (!await this._confirmDelete(this.taxClasses.find(x => x.id === id)?.name)) return;
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
    if (!await this._confirmDelete(this.currencies.find(x => x.id === id)?.name)) return;
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
    if (!await this._confirmDelete(this.marketCountries.find(x => x.id === id)?.name)) return;
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
    if (!await this._confirmDelete(this.attributePresets.find(x => x.id === id)?.name)) return;
    try {
      await this._saveAttributePresets(this.attributePresets.filter(x => x.id !== id));
      this.loadAttributePresets();
    } catch (e) { this.attributePresetsError = e.message; }
  }

  async deleteTemplate(idx) {
    if (!await this._confirmDelete(this.propertyTemplates[idx]?.name)) return;
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

  /**
   * Orders using the status are not a dead end: the API answers 409 with how many still carry it, and
   * we ask which status they should use instead, then delete with that as `reassignTo`. Other refusals
   * (the store settles payments into it) are still just shown.
   */
  async deleteOrderStatus(st, reassignTo = null) {
    // Picking where the orders go is its own confirmation — don't ask twice.
    if (!reassignTo && !await this._confirmDelete(st.name)) return;

    const headers = await this.getAuthHeaders();
    const qs = reassignTo
      ? `${this._marketQs || '?'}${this._marketQs ? '&' : ''}reassignTo=${encodeURIComponent(reassignTo)}`
      : this._marketQs;
    try {
      const r = await fetch(`/umbraco/management/api/ecomm-commerce/order-statuses/${encodeURIComponent(st.id)}${qs}`, {
        method: 'DELETE', headers, credentials: 'include',
      });
      if (r.status === 409) {
        const body = await r.json().catch(() => ({}));
        this.reassignOrderStatus = { status: st, inUseCount: body.inUseCount ?? body.InUseCount ?? 0, target: '' };
        return;
      }
      if (!r.ok) throw new Error((await r.text()) || r.statusText);
      this.reassignOrderStatus = null;
      this.orderStatusesError = null;
      this.loadOrderStatuses();
    } catch (e) {
      this.reassignOrderStatus = null; // let the banner through
      this.orderStatusesError = e.message;
    }
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

  /** The order's own PaymentStatus — never inferred from the order status. */
  _pillPayment(paymentStatus) {
    const key = paymentStatusKey(paymentStatus);
    return html`<span class="pill pill--payment-${key}">${getPaymentStatusLabel(paymentStatus)}</span>`;
  }

  // "trailerName" -> "Trailer Name" for the order-detail custom-properties table.
  _humanizeKey(key) {
    if (!key) return '';
    const s = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // These five are the design kit's helpers under this dashboard's original names, so the ~100 call
  // sites below read the same as they always did. The implementations live in shared/commerce-ui.js.
  _confirmDelete(name) { return confirmDelete(this, name); }
  _errorBanner(msg, clear) { return errorBanner(msg, clear); }
  _stateCenter(content) { return stateCenter(content); }
  _viewHeader(title, actionSlot) { return viewHeader(title, actionSlot); }
  _renderPager(total, page, pageSize, goTo) { return pager(total, page, pageSize, goTo); }

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
    const orders = this.orders;
    const osLabel = this.orderStatusFilter ? getOrderStatusLabel(this.orderStatusFilter) : 'All';
    const psLabel = this.paymentStatusFilter ? getPaymentStatusLabel(this.paymentStatusFilter) : 'All';

    return html`
      <div class="view-container">
        ${this._viewHeader('Orders', refreshButton(() => this.loadOrders()))}

        ${this._errorBanner(this.ordersError, () => { this.ordersError = null; })}
        ${this.showAdvFilter ? this._renderAdvFilterDrawer() : ''}

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
                v => { this.paymentStatusFilter = v; this.showPSMenu = false; this.currentPage = 1; this.loadOrders(); },
                e => e.stopPropagation()) : ''}
            </div>
            ${this._filterBtn('Advanced filter',
              this.advCount ? `${this.advCount} field${this.advCount !== 1 ? 's' : ''}` : 'None',
              this.showAdvFilter, (e) => { e.stopPropagation(); this.openAdvFilter(); })}
          </div>
          <div class="filters-right">
            ${(this.orderStatusFilter || this.paymentStatusFilter || this.ordersSearch || this.advCount) ? html`
              <button type="button" class="filter-btn filter-reset" @click=${this.clearOrderFilters}>
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

        ${this.ordersLoading ? loadingState('Loading orders…') :
          orders.length === 0 ? emptyState('icon-shopping-basket', 'No orders found') :
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
                      <td>${this._pillPayment(o.paymentStatus)}</td>
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
        ${viewFooter(`${this.marketName} / Orders`,
          this.totalCount ? `${this.totalCount} order${this.totalCount !== 1 ? 's' : ''}` : '')}
      </div>`;
  }

  /**
   * The advanced filter, as a right-hand drawer beside the list it narrows. Rendered from
   * ADV_FILTER_SECTIONS, so a new criterion is one entry there plus one field on the API's
   * OrderFilterRequest — nothing to add here.
   */
  _renderAdvFilterDrawer() {
    const close = () => { this.showAdvFilter = false; };
    return modalShell({
      headline: 'Advanced filter',
      size: 'drawer',
      onClose: close,
      body: html`
        ${ADV_FILTER_SECTIONS.map(section => html`
          <h4>${section.title}</h4>
          ${section.fields.map(field => formRow(field.label, html`
            <input class="form-input" type=${field.type || 'text'}
              .value=${this.advDraft[field.key] || ''}
              @input=${e => { this.advDraft = { ...this.advDraft, [field.key]: e.target.value }; }}
              @keydown=${e => { if (e.key === 'Enter') this.applyAdvFilter(); }}>`,
            field.hint))}`)}`,
      footer: html`
        <uui-button label="Close" @click=${close}>Close</uui-button>
        <uui-button label="Reset" @click=${this.resetAdvDraft}>Reset</uui-button>
        <uui-button look="primary" color="positive" label="Apply" @click=${this.applyAdvFilter}>Apply</uui-button>`,
    });
  }

  _toggleSelectAll() {
    this.allSelected = !this.allSelected;
    this.selectedIds = this.allSelected ? new Set(this.orders.map(o => o.id)) : new Set();
  }

  _toggleSelectRow(id) {
    const next = new Set(this.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds = next;
    this.allSelected = next.size === this.orders.length;
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
          <div class="detail-status-badge">${this._pillOrder(order.status)} ${this._pillPayment(order.paymentStatus)}</div>
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

        ${viewFooter(`${this.marketName} / Orders / ${order.orderNumber}`)}
      </div>`;
  }

  // ── Carts ──────────────────────────────────────────────────────────────────

  _renderCartsView() {
    const carts = this.carts;
    return html`
      <div class="view-container">
        ${this._viewHeader('Carts', refreshButton(() => this.loadCarts()))}

        ${this._errorBanner(this.cartsError, () => { this.cartsError = null; })}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            ${this.cartsSearch ? html`
              <button type="button" class="filter-btn filter-reset"
                      @click=${() => { this.cartsSearch = ''; this.cartsPage = 1; this.loadCarts(); }}>
                ✕ Reset search
              </button>` : ''}
            ${searchBox({
              value: this.cartsSearch,
              placeholder: 'Search by session or product…',
              onInput: e => {
                this.cartsSearch = e.target.value;
                clearTimeout(this._cartsSearchDebounce);
                this._cartsSearchDebounce = setTimeout(() => { this.cartsPage = 1; this.loadCarts(); }, 300);
              },
            })}
          </div>
        </div>

        ${this.cartsLoading ? loadingState('Loading carts…') :
          carts.length === 0 ? emptyState('icon-shopping-basket',
            this.cartsSearch ? 'No carts match that search' : 'No active carts',
            "Carts appear here when customers start shopping but haven't checked out yet.") :
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
        ${viewFooter(`${this.marketName} / Carts`,
          this.cartsTotalCount ? `${this.cartsTotalCount} cart${this.cartsTotalCount !== 1 ? 's' : ''}` : '')}
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
              <p class="state-note">A cart has no customer details — those are captured at checkout.</p>
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
              <p class="state-note">Shipping and payment fees are added at checkout.</p>
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

        ${viewFooter(`${this.marketName} / Carts / ${cart.sessionId || cart.id}`)}
      </div>`;
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  _renderAnalyticsView() {
    const stats = this.analyticsStats;

    return html`
      <div class="view-container">
        ${this._viewHeader('Analytics', refreshButton(this.loadAnalytics))}

        ${this._errorBanner(this.analyticsError, () => { this.analyticsError = null; })}

        ${this.analyticsLoading ? loadingState('Loading analytics…') :
          !stats ? emptyState('icon-chart', 'No order data available') :
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

        ${viewFooter(`${this.marketName} / Analytics`)}
      </div>`;
  }

  // ── Order Statuses ─────────────────────────────────────────────────────────

  /** Asked instead of refusing when the status still labels orders — they move where you point them. */
  _renderReassignOrderStatus() {
    const r = this.reassignOrderStatus;
    if (!r) return '';
    const many = r.inUseCount !== 1;
    return modalShell({
      headline: `Delete "${r.status.name}"`,
      size: 'sm',
      onClose: () => { this.reassignOrderStatus = null; },
      body: html`
        <p>
          ${r.inUseCount} order${many ? 's' : ''} still use${many ? '' : 's'} this status.
          Pick the status ${many ? 'they' : 'it'} should use instead — deleting moves ${many ? 'them' : 'it'} over.
        </p>
        ${formRow('Use instead', html`
          <select class="form-input" .value=${r.target}
            @change=${e => { this.reassignOrderStatus = { ...r, target: e.target.value }; }}>
            <option value="">— Select a status —</option>
            ${this.orderStatuses.filter(x => x.id !== r.status.id).map(o => html`
              <option value=${o.code}>${o.name}</option>`)}
          </select>`)}`,
      actions: modalActions({
        onCancel: () => { this.reassignOrderStatus = null; },
        onConfirm: () => this.deleteOrderStatus(r.status, r.target),
        confirmLabel: 'Move orders & delete',
        color: 'danger',
        disabled: !r.target,
      }),
    });
  }

  _renderOrderStatusesView() {
    const s = this.editingOrderStatus;
    const isNew = !!s && !this.orderStatuses.some(x => x.id === s.id);
    const nextSort = Math.max(0, ...this.orderStatuses.map(x => Number(x.sortOrder) || 0)) + 1;

    return html`
      <div class="view-container">
        ${this._viewHeader('Order Statuses', html`
          ${refreshButton(this.loadOrderStatuses)}
          ${createButton('Order Status', () => { this.editingOrderStatus = { id: crypto.randomUUID(), name: '', code: '', color: '#6B7280', sortOrder: nextSort, isActive: true }; })}`)}

        ${this._errorBanner(this.orderStatusesError, () => { this.orderStatusesError = null; })}

        ${this._renderReassignOrderStatus()}

        ${s ? modalShell({
          headline: isNew ? 'New Order Status' : 'Edit Order Status',
          onClose: () => { this.editingOrderStatus = null; },
          body: html`
            ${formRow('Name', html`
              <input class="form-input" .value=${s.name || ''} placeholder="e.g. Awaiting Pickup"
                @input=${e => { this.editingOrderStatus = { ...s, name: e.target.value }; }}>`)}
            ${formRow('Code',
              isNew
                ? html`<input class="form-input" .value=${s.code || ''} placeholder=${slugify(s.name || '') || 'e.g. awaiting-pickup'}
                    @input=${e => { this.editingOrderStatus = { ...s, code: e.target.value }; }}>`
                : html`<code>${s.code}</code>`,
              isNew ? 'Derived from the name if left blank. Orders store the code, so it is fixed once created.'
                    : 'Fixed — existing orders reference this code.')}
            ${formRow('Color', html`
              <div class="form-inline">
                <input type="color" class="form-input form-input--color" .value=${s.color || '#6B7280'}
                  @input=${e => { this.editingOrderStatus = { ...s, color: e.target.value }; }}>
                <input class="form-input form-input--sm" .value=${s.color || '#6B7280'}
                  @input=${e => { this.editingOrderStatus = { ...s, color: e.target.value }; }}>
              </div>`)}
            ${formRow('Sort Order', html`
              <input class="form-input form-input--sm" type="number" step="1" .value=${s.sortOrder ?? 0}
                @input=${e => { this.editingOrderStatus = { ...s, sortOrder: e.target.value }; }}>`)}
            ${checkRow('Active', s.isActive !== false,
              e => { this.editingOrderStatus = { ...s, isActive: e.target.checked }; },
              'Inactive statuses stay on the orders using them but drop out of the pickers.')}`,
          actions: modalActions({
            onCancel: () => { this.editingOrderStatus = null; },
            onConfirm: () => this.saveOrderStatus(),
          }),
        }) : ''}

        ${this.orderStatusesLoading ? loadingState() :
          this.orderStatuses.length === 0 ? emptyState('icon-settings', 'No order statuses found') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Status</th>
                  <th class="col-r" style="width:90px">Sort</th>
                  <th style="width:220px">State</th>
                  <th class="col-actions"></th>
                </tr></thead>
                <tbody>
                  ${this.orderStatuses.map(st => html`
                    <tr class="data-row" title="Edit ${st.name}" @click=${() => { this.editingOrderStatus = { ...st }; }}>
                      <td>
                        <div class="name-cell">
                          <span class="color-swatch" style="background:${st.color || '#6B7280'}"></span>
                          <span>
                            <span class="name-primary">${st.name}</span>
                            <span class="name-sub"><code>${st.code}</code></span>
                          </span>
                        </div>
                      </td>
                      <td class="col-r muted">${st.sortOrder}</td>
                      <td>
                        <span class="pill ${st.isActive ? 'pill--active' : 'pill--inactive'}">
                          ${st.isActive ? 'Active' : 'Inactive'}
                        </span>
                        ${st.isSystemDefault ? html`<span class="pill pill--system">System</span>` : ''}
                      </td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${st.name}`, onClick: () => this.deleteOrderStatus(st) })}
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>`}

        ${viewFooter(`${this.marketName} / Options / Order Statuses`,
          this.orderStatuses.length ? `${this.orderStatuses.length} status${this.orderStatuses.length !== 1 ? 'es' : ''}` : '')}
      </div>`;
  }

  // ── Discounts ──────────────────────────────────────────────────────────────

  _renderDiscountsView() {
    const d = this.editingDiscount;
    return html`
      <div class="view-container">
        ${this._viewHeader('Discounts', html`
          ${refreshButton(() => this.loadDiscounts())}
          ${createButton('Discount', () => { this.editingDiscount = { code:'', name:'', type:'percentage', value:0, isActive:true }; })}`)}

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
            ${checkRow('Active', d.isActive, e => { this.editingDiscount = {...d, isActive: e.target.checked}; })}
            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.saveDiscount()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingDiscount = null; }}>Cancel</uui-button>
            </div>
          </div>` : ''}

        ${this.discountsLoading ? loadingState('Loading discounts…') :
          this.discounts.length === 0 && !d ? emptyState('icon-tag', 'No discounts yet') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Code</th><th>Name</th><th>Type</th><th>Value</th><th>Uses</th><th>Expiry</th><th>Active</th><th class="col-actions"></th>
                </tr></thead>
                <tbody>
                  ${this.discounts.map(disc => html`
                    <tr class="data-row" title="Edit ${disc.name || disc.code}"
                      @click=${() => { this.editingDiscount = {...disc}; }}>
                      <td><code>${disc.code}</code></td>
                      <td>${disc.name}</td>
                      <td>${disc.type}</td>
                      <td>${disc.type === 'percentage' ? disc.value + '%' : this.formatCurrency(disc.value)}</td>
                      <td>${disc.usesCount}${disc.maxUses ? ' / ' + disc.maxUses : ''}</td>
                      <td>${disc.expiryDate ? new Date(disc.expiryDate).toLocaleDateString() : '—'}</td>
                      <td><span class="pill ${disc.isActive ? 'pill--active' : 'pill--inactive'}">${disc.isActive ? 'Active' : 'Off'}</span></td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${disc.name || disc.code}`, onClick: () => this.deleteDiscount(disc.id) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>`}

        ${viewFooter(`${this.marketName} / Discounts`,
          this.discounts.length ? `${this.discounts.length} discount${this.discounts.length !== 1 ? 's' : ''}` : '')}
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
          ${refreshButton(() => this.loadPropertyTemplates())}
          ${createButton('Property Template', () => { this.editingTemplate = { name: '', defaultValue: '', _isNew: true }; })}`)}

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

        ${searchBar({
          value: this.propertyTemplatesSearch,
          placeholder: 'Search templates…',
          onInput: e => { this.propertyTemplatesSearch = e.target.value; this.propertyTemplatesPage = 1; },
        })}

        ${this.propertyTemplatesLoading ? loadingState() :
          filtered.length === 0 ? emptyState('icon-list',
            q ? 'No templates match your search' : 'No property templates yet',
            q ? '' : 'Templates define default custom properties added to all products in this store.') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>#</th><th>Name</th><th>Values from</th><th>Default Value</th><th class="col-actions"></th>
                </tr></thead>
                <tbody>
                  ${paged.map((tmpl, i) => { const idx = (page - 1) * PAGE_SIZE + i;
                    const boundAttr = this.attributes.find(a => a.id === tmpl.attributeId); return html`
                    <tr class="data-row" title="Edit ${tmpl.name}"
                      @click=${() => { this.editingTemplate = { ...tmpl, _idx: idx }; }}>
                      <td>${tmpl.sortOrder ?? idx}</td>
                      <td><strong>${tmpl.name}</strong></td>
                      <td>${boundAttr ? pill(boundAttr.name, 'single') : html`<em class="muted">free text</em>`}</td>
                      <td>${tmpl.defaultValue || '—'}</td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${tmpl.name}`, onClick: () => this.deleteTemplate(idx) })}
                      </td>
                    </tr>`;})}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.propertyTemplatesPage = p; })}`}

        ${viewFooter(`${this.marketName} / Options / Property Templates`,
          filtered.length ? `${filtered.length} template${filtered.length !== 1 ? 's' : ''}` : '')}
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
          ${refreshButton(() => this.loadAttributes())}
          ${createButton('Product Attribute', () => { this.editingAttribute = { id: crypto.randomUUID(), name: '', alias: '', values: [] }; })}`)}

        ${this._errorBanner(this.attributesError, () => { this.attributesError = null; })}

        ${a ? modalShell({
          headline: this.attributes.find(x => x.id === a.id) ? 'Edit Attribute' : 'New Attribute',
          onClose: () => { this.editingAttribute = null; },
          body: html`
            ${formRow('Name', html`
              <input class="form-input" .value=${a.name || ''} placeholder="e.g. Size"
                @input=${e => { const name = e.target.value; this.editingAttribute = { ...a, name, alias: a.alias || slugify(name) }; }}>`)}
            ${formRow('Alias', html`
              <input class="form-input" .value=${a.alias || ''} placeholder="e.g. size"
                @input=${e => { this.editingAttribute = { ...a, alias: e.target.value }; }}>`)}
            <div class="form-row form-row--top"><label>Values</label>
              <div class="form-list form-col">
                ${(a.values || []).map((v, i) => html`
                  <div class="form-list-row">
                    <input class="form-input" .value=${v.name || ''} placeholder="Value name (e.g. Small)"
                      @input=${e => { const name = e.target.value; const values = a.values.map((x, j) => j === i ? { ...x, name, alias: x.alias || slugify(name) } : x); this.editingAttribute = { ...a, values }; }}>
                    <input class="form-input" .value=${v.alias || ''} placeholder="alias (e.g. small)"
                      @input=${e => { const values = a.values.map((x, j) => j === i ? { ...x, alias: e.target.value } : x); this.editingAttribute = { ...a, values }; }}>
                    <button class="remove-btn" title="Remove value"
                      @click=${() => { this.editingAttribute = { ...a, values: a.values.filter((_, j) => j !== i) }; }}>×</button>
                  </div>`)}
                <button class="add-row-btn"
                  @click=${() => { this.editingAttribute = { ...a, values: [...(a.values || []), { name: '', alias: '' }] }; }}>+ Add value</button>
              </div>
            </div>`,
          actions: modalActions({
            onCancel: () => { this.editingAttribute = null; },
            onConfirm: () => this.saveAttribute(),
          }),
        }) : ''}

        ${searchBar({
          value: this.attributesSearch,
          placeholder: 'Search attributes…',
          onInput: e => { this.attributesSearch = e.target.value; this.attributesPage = 1; },
        })}

        ${this.attributesLoading ? loadingState() :
          filtered.length === 0 ? emptyState('icon-tag',
            q ? 'No attributes match your search' : 'No product attributes yet') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Alias</th><th>Values</th><th class="col-actions"></th></tr></thead>
                <tbody>
                  ${paged.map(attr => html`
                    <tr class="data-row" title="Edit ${attr.name}"
                      @click=${() => { this.editingAttribute = { ...attr, values: (attr.values || []).map(v => ({ ...v })) }; }}>
                      <td><div class="name-cell"><uui-icon class="row-icon" name="icon-tag"></uui-icon><strong>${attr.name}</strong></div></td>
                      <td><code>${attr.alias || '—'}</code></td>
                      <td>${(attr.values || []).length} value${(attr.values || []).length !== 1 ? 's' : ''}</td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${attr.name}`, onClick: () => this.deleteAttribute(attr.id) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.attributesPage = p; })}`}

        ${viewFooter(`${this.marketName} / Options / Product Attributes`,
          filtered.length ? `${filtered.length} attribute${filtered.length !== 1 ? 's' : ''}` : '')}
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
          ${refreshButton(() => this.loadAttributePresets())}
          ${createButton('Preset', () => { this.editingAttributePreset = { id: crypto.randomUUID(), name: '', alias: '', attributeIds: [] }; })}`)}

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
            <div class="form-row form-row--top"><label>Attributes in this preset</label>
              ${this.attributes.length === 0 ? html`<em class="muted">No attributes defined yet.</em>` : html`
                <div class="chip-row">
                  ${this.attributes.map(attr => {
                    const sel = (p.attributeIds || []).includes(attr.id);
                    return html`<button class="chip ${sel ? 'chip--on' : ''}"
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

        ${searchBar({
          value: this.attributePresetsSearch,
          placeholder: 'Search presets…',
          onInput: e => { this.attributePresetsSearch = e.target.value; this.attributePresetsPage = 1; },
        })}

        ${this.attributePresetsLoading ? loadingState() :
          filtered.length === 0 ? emptyState('icon-tags',
            q ? 'No presets match your search' : 'No attribute presets yet') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Alias</th><th>Attributes</th><th class="col-actions"></th></tr></thead>
                <tbody>
                  ${paged.map(preset => html`
                    <tr class="data-row" title="Edit ${preset.name}"
                      @click=${() => { this.editingAttributePreset = { ...preset, attributeIds: [...(preset.attributeIds || [])] }; }}>
                      <td><div class="name-cell"><uui-icon class="row-icon" name="icon-tags"></uui-icon><strong>${preset.name}</strong></div></td>
                      <td><code>${preset.alias || '—'}</code></td>
                      <td>${(preset.attributeIds || []).map(id => (this.attributes.find(a => a.id === id)?.name || id)).join(', ') || '—'}</td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${preset.name}`, onClick: () => this.deleteAttributePreset(preset.id) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.attributePresetsPage = p; })}`}

        ${viewFooter(`${this.marketName} / Options / Product Attribute Presets`,
          filtered.length ? `${filtered.length} preset${filtered.length !== 1 ? 's' : ''}` : '')}
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
          ${refreshButton(() => this.loadTaxClasses())}
          ${createButton('Tax Class', () => { this.editingTaxClass = { id: crypto.randomUUID(), name: '', defaultRate: 0, countryRates: [] }; })}`)}

        ${this._errorBanner(this.taxClassesError, () => { this.taxClassesError = null; })}

        <!-- The flat fallback rate. It belongs on this screen rather than the market form because it's
             the same lookup's last resort, and this is where people come to change tax. -->
        <div class="store-tax">
          <div class="store-tax-row">
            <label>Store Tax Rate (fallback)</label>
            <input class="form-input form-input--sm" type="number" step="0.01" min="0"
              .value=${this.storeTaxRateDraft ?? String((this.storeTaxRate || 0) * 100)}
              @input=${e => { this.storeTaxRateDraft = e.target.value; }}>
            <span>%</span>
            ${this.storeTaxRateDraft !== null ? html`
              <uui-button look="primary" compact @click=${() => this.saveStoreTaxRate()}>Save</uui-button>
              <uui-button look="secondary" compact @click=${() => { this.storeTaxRateDraft = null; }}>Discard</uui-button>` : ''}
          </div>
          <small>Applied to goods when the active payment provider names no tax class (or names one that has since been deleted).</small>
        </div>

        ${t ? modalShell({
          headline: this.taxClasses.find(x => x.id === t.id) ? 'Edit Tax Class' : 'New Tax Class',
          onClose: () => { this.editingTaxClass = null; },
          body: html`
            ${formRow('Name', html`
              <input class="form-input" .value=${t.name || ''} placeholder="e.g. Standard"
                @input=${e => { this.editingTaxClass = { ...t, name: e.target.value }; }}>`)}
            ${formRow('Default Tax Rate (%)', html`
              <input class="form-input" type="number" step="0.01" min="0" .value=${(t.defaultRate || 0) * 100}
                @input=${e => { this.editingTaxClass = { ...t, defaultRate: (Number(e.target.value) || 0) / 100 }; }}>`)}
            <div class="form-row form-row--top"><label>Country/Region Specific Tax Rates</label>
              <div class="form-list form-col">
                ${(t.countryRates || []).map((r, i) => html`
                  <div class="form-list-row">
                    <span style="flex:1">${this.countries.find(c => c.code === r.countryCode)?.name ?? r.countryCode}</span>
                    <input class="form-input form-input--xs" type="number" step="0.01" min="0" .value=${(r.rate || 0) * 100}
                      @input=${e => { const countryRates = t.countryRates.map((x, j) => j === i ? { ...x, rate: (Number(e.target.value) || 0) / 100 } : x); this.editingTaxClass = { ...t, countryRates }; }}>
                    <span>%</span>
                    <button class="remove-btn" title="Remove override"
                      @click=${() => { this.editingTaxClass = { ...t, countryRates: t.countryRates.filter((_, j) => j !== i) }; }}>×</button>
                  </div>`)}
                ${availableCountries.length > 0 ? html`
                  <select @change=${e => { if (e.target.value) { this.editingTaxClass = { ...t, countryRates: [...(t.countryRates || []), { countryCode: e.target.value, rate: 0 }] }; e.target.value = ''; } }}>
                    <option value="">+ Add country override…</option>
                    ${availableCountries.map(c => html`<option value=${c.code}>${c.name}</option>`)}
                  </select>` : ''}
              </div>
            </div>`,
          actions: modalActions({
            onCancel: () => { this.editingTaxClass = null; },
            onConfirm: () => this.saveTaxClass(),
          }),
        }) : ''}

        ${this.taxClassesLoading ? loadingState() :
          this.taxClasses.length === 0 ? emptyState('icon-calculator', 'No tax classes yet') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>Default Tax Rate</th><th>Overrides</th><th class="col-actions"></th></tr></thead>
                <tbody>
                  ${this.taxClasses.map(tc => html`
                    <tr class="data-row" title="Edit ${tc.name}"
                      @click=${() => { this.editingTaxClass = { ...tc, countryRates: (tc.countryRates || []).map(r => ({ ...r })) }; }}>
                      <td><div class="name-cell"><uui-icon class="row-icon" name="icon-calculator"></uui-icon><strong>${tc.name}</strong></div></td>
                      <td>${((tc.defaultRate || 0) * 100).toFixed(2)}%</td>
                      <td>${(tc.countryRates || []).length} override${(tc.countryRates || []).length !== 1 ? 's' : ''}</td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${tc.name}`, onClick: () => this.deleteTaxClass(tc.id) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>`}

        ${viewFooter(`${this.marketName} / Options / Tax Classes`,
          this.taxClasses.length ? `${this.taxClasses.length} tax class${this.taxClasses.length !== 1 ? 'es' : ''}` : '')}
      </div>`;
  }

  // ── Currencies ───────────────────────────────────────────────────────────────

  /** Create button with a flyout: blank · one ISO preset · every ISO preset. */
  _createFlyout(key, label, items) {
    return createFlyout({
      label, items,
      open: this.createMenu === key,
      onToggle: () => { this.createMenu = this.createMenu === key ? '' : key; },
    });
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
        <div class="form-inline">
          <input class="form-input" type="search" placeholder="Filter countries…"
            .value=${this.currencyCountryFilter || ''}
            @input=${e => { this.currencyCountryFilter = e.target.value; }}>
          <span class="form-hint">${selected.size} selected</span>
        </div>` : ''}
      <div class="scroll-list">
        ${shown.map(mc => html`
          <uui-toggle label=${mc.name} ?checked=${selected.has(mc.code)}
            @change=${e => {
              const codes = new Set(c.countryCodes || []);
              if (e.target.checked) codes.add(mc.code); else codes.delete(mc.code);
              this.editingCurrency = { ...c, countryCodes: [...codes] };
            }}>${mc.name}</uui-toggle>`)}
        ${shown.length === 0 ? html`<span class="form-hint">No countries match the filter.</span>` : ''}
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
        ${this._viewHeader('Currencies', html`
          ${refreshButton(() => this.loadCurrencies())}
          ${this._createFlyout('currency', 'Currency', [
            ['New blank currency', () => this.startCurrency(false)],
            ['New currency from ISO 4217 preset', () => this.startCurrency(true)],
            ['All currencies from ISO 4217 presets', () => this.addAllCurrencyPresets()],
          ])}`)}

        ${this._errorBanner(this.currenciesError, () => { this.currenciesError = null; })}

        ${c ? modalShell({
          headline: this.currencies.find(x => x.id === c.id) ? 'Edit Currency' : 'New Currency',
          onClose: () => { this.editingCurrency = null; },
          body: html`
            ${c.presetPicker ? formRow('ISO 4217 preset', html`
              <select class="form-input" @change=${e => this.applyCurrencyPreset(e.target.value)}>
                <option value="">Choose a currency…</option>
                ${presets.map(p => html`<option value=${p.code} ?selected=${p.code === c.code}>${p.code} — ${p.name}</option>`)}
              </select>`) : ''}
            ${formRow('Name', html`
              <input class="form-input" .value=${c.name || ''} placeholder="e.g. Swedish krona"
                @input=${e => { this.editingCurrency = { ...c, name: e.target.value }; }}>`)}
            ${formRow('ISO Code', html`
              <input class="form-input" maxlength="3" .value=${c.code || ''} placeholder="3 letter ISO currency code"
                @input=${e => { this.editingCurrency = { ...c, code: e.target.value.toUpperCase() }; }}>`)}
            ${formRow('Culture', html`
              <select class="form-input" @change=${e => { this.editingCurrency = { ...c, culture: e.target.value }; }}>
                <option value="">— None —</option>
                ${cultures.map(x => html`<option value=${x.name} ?selected=${x.name === c.culture}>${x.displayName}</option>`)}
              </select>`)}
            ${formRow('Custom Format Template', html`
              <input class="form-input" .value=${c.formatTemplate || ''} placeholder="e.g. {0:n0} kr — used by storefronts"
                @input=${e => { this.editingCurrency = { ...c, formatTemplate: e.target.value }; }}>`)}
            <div class="form-row form-row--top">
              <label>Available in Countries</label>
              <div class="form-col">
                <uui-toggle label="All" ?checked=${c.allCountries}
                  @change=${e => { this.editingCurrency = { ...c, allCountries: e.target.checked }; }}>All</uui-toggle>
                ${c.allCountries ? '' : (this.marketCountries.length ? this._renderCurrencyCountryToggles(c)
                  : html`<span class="form-hint">No countries configured for this store yet — add some under Options → Countries.</span>`)}
              </div>
            </div>`,
          actions: modalActions({
            onCancel: () => { this.editingCurrency = null; },
            onConfirm: () => this.saveCurrency(),
          }),
        }) : ''}

        ${searchBar({
          value: this.currenciesSearch,
          onInput: e => { this.currenciesSearch = e.target.value; this.currenciesPage = 1; },
        })}

        ${this.currenciesLoading ? loadingState() :
          filtered.length === 0 ? emptyState('icon-coins',
            q ? 'No currencies match your search' : 'No currencies yet') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>ISO Code</th><th>Available in</th><th class="col-actions"></th></tr></thead>
                <tbody>
                  ${paged.map(cur => html`
                    <tr class="data-row" title="Edit ${cur.name}" @click=${() => this._editCurrency(cur)}>
                      <td>
                        <div class="name-cell">
                          <uui-icon class="row-icon" name="icon-coins"></uui-icon>
                          <strong>${cur.name}</strong>
                          ${cur.code === this.activeCurrencyCode ? pill('store currency', 'current') : ''}
                        </div>
                      </td>
                      <td>${cur.code}</td>
                      <td>${(cur.countryCodes || []).length
                        ? `${cur.countryCodes.length} countr${cur.countryCodes.length === 1 ? 'y' : 'ies'}`
                        : 'All countries'}</td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${cur.name}`, onClick: () => this.deleteCurrency(cur.id) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.currenciesPage = p; })}`}

        ${viewFooter(`${this.marketName} / Options / Currencies`,
          filtered.length ? `${filtered.length} currenc${filtered.length !== 1 ? 'ies' : 'y'}` : '')}
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
        ${this._viewHeader('Countries', html`
          ${refreshButton(() => this.loadMarketCountries())}
          ${this._createFlyout('country', 'Country', [
            ['New blank country', () => this.startMarketCountry(false)],
            ['New country from ISO 3166 preset', () => this.startMarketCountry(true)],
            ['All countries from ISO 3166 presets', () => this.addAllCountryPresets()],
          ])}`)}

        ${this._errorBanner(this.marketCountriesError, () => { this.marketCountriesError = null; })}

        ${c ? modalShell({
          headline: this.marketCountries.find(x => x.id === c.id) ? 'Edit Country' : 'New Country',
          onClose: () => { this.editingMarketCountry = null; },
          body: html`
            ${c.presetPicker ? formRow('ISO 3166 preset', html`
              <select class="form-input" @change=${e => this.applyCountryPreset(e.target.value)}>
                <option value="">Choose a country…</option>
                ${this.countries.map(p => html`<option value=${p.code} ?selected=${p.code === c.code}>${p.name} (${p.code})</option>`)}
              </select>`) : ''}
            ${formRow('Name', html`
              <input class="form-input" .value=${c.name || ''} placeholder="e.g. Sweden"
                @input=${e => { this.editingMarketCountry = { ...c, name: e.target.value }; }}>`)}
            ${formRow('ISO Code', html`
              <input class="form-input" maxlength="2" .value=${c.code || ''} placeholder="2 letter ISO country code"
                @input=${e => { this.editingMarketCountry = { ...c, code: e.target.value.toUpperCase() }; }}>`)}
            ${formRow('Default Currency', html`
              <select class="form-input" @change=${e => { this.editingMarketCountry = { ...c, defaultCurrencyId: e.target.value }; }}>
                <option value="">— None —</option>
                ${this.currencies.map(x => html`<option value=${x.id} ?selected=${x.id === c.defaultCurrencyId}>${x.name} (${x.code})</option>`)}
              </select>`)}
            ${formRow('Default Shipping Method', html`
              <select class="form-input" @change=${e => { this.editingMarketCountry = { ...c, defaultShippingMethodId: e.target.value }; }}>
                <option value="">— None —</option>
                ${this.shippingMethods.map(x => html`<option value=${x.id} ?selected=${x.id === c.defaultShippingMethodId}>${x.name}</option>`)}
              </select>`)}
            ${formRow('Default Payment Method', html`
              <select class="form-input" @change=${e => { this.editingMarketCountry = { ...c, defaultPaymentProviderAlias: e.target.value }; }}>
                <option value="">— None —</option>
                ${this.marketPaymentProviders.map(p => html`
                  <option value=${p.alias} ?selected=${p.alias === c.defaultPaymentProviderAlias}>${p.displayName || p.alias}</option>`)}
              </select>`)}`,
          actions: modalActions({
            onCancel: () => { this.editingMarketCountry = null; },
            onConfirm: () => this.saveMarketCountry(),
          }),
        }) : ''}

        ${searchBar({
          value: this.marketCountriesSearch,
          onInput: e => { this.marketCountriesSearch = e.target.value; this.marketCountriesPage = 1; },
        })}

        ${this.marketCountriesLoading ? loadingState() :
          filtered.length === 0 ? emptyState('icon-flag',
            q ? 'No countries match your search' : 'No countries yet',
            q ? '' : 'With none configured, the whole ISO 3166 list is offered everywhere.') :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr><th>Name</th><th>ISO Code</th><th>Default Currency</th><th class="col-actions"></th></tr></thead>
                <tbody>
                  ${paged.map(country => html`
                    <tr class="data-row" title="Edit ${country.name}"
                      @click=${() => { this.editingMarketCountry = { ...country }; }}>
                      <td><div class="name-cell"><uui-icon class="row-icon" name="icon-flag"></uui-icon><strong>${country.name}</strong></div></td>
                      <td>${country.code}</td>
                      <td>${currencyName(country.defaultCurrencyId)}</td>
                      <td class="col-actions">
                        ${iconButton({ title: `Delete ${country.name}`, onClick: () => this.deleteMarketCountry(country.id) })}
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderPager(filtered.length, page, PAGE_SIZE, p => { this.marketCountriesPage = p; })}`}

        ${viewFooter(`${this.marketName} / Options / Countries`,
          filtered.length ? `${filtered.length} countr${filtered.length !== 1 ? 'ies' : 'y'}` : '')}
      </div>`;
  }

  // ── Coming Soon ────────────────────────────────────────────────────────────

  _renderComingSoon(label) {
    return html`
      <div class="view-container">
        ${this._viewHeader(label)}
        ${emptyState('icon-box', `${label} is not yet available.`,
          'This feature will be added in a future release.')}
        ${viewFooter(`${this.marketName} / ${label}`)}
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
      // Embedded, so it renders its own .view-container — and takes the store name for its breadcrumb.
      case 'payment-providers':   return html`<ecomm-payment-providers-dashboard
        .marketId=${this.selectedMarketId} .marketName=${this.marketName} .embedded=${true}></ecomm-payment-providers-dashboard>`;
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

  // Only the chrome that is this dashboard's own — the section shell, the store tree, the welcome
  // cards, the analytics blocks. Everything shared (views, tables, pills, forms, modals, pagers)
  // comes from commerceStyles. See umbraco/docs/DESIGN-SYSTEM.md.
  static styles = [commerceStyles, css`
    :host { display: block; height: 100%; overflow: hidden; }

    .commerce-layout {
      display: flex;
      height: 100%;
      background: var(--ec-bg);
      font-family: var(--uui-font-family, sans-serif);
      font-size: 0.875rem;
    }

    /* ── Sidebar ─────────────────────────────────────────────────── */
    .sidebar {
      width: 260px;
      flex-shrink: 0;
      background: var(--ec-surface);
      border-right: 1px solid var(--ec-border);
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
      border-bottom: 1px solid var(--ec-border);
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--ec-text);
      user-select: none;
    }
    .store-header:hover { background: #f5f5f5; }

    .store-icon-wrap {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px;
      background: var(--ec-navy); border-radius: var(--ec-radius); color: #fff; flex-shrink: 0;
    }

    .store-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ec-text); }
    .store-caret { font-size: 0.7rem; color: var(--ec-text-muted); display: inline-block; transition: transform .15s ease; }
    .store-caret.open { transform: rotate(90deg); }

    /* Per-store tree */
    .sidebar-title {
      padding: 14px 12px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase;
      letter-spacing: 0.03em; color: #6b6b6b; cursor: pointer; border-bottom: 1px solid var(--ec-border);
      user-select: none;
    }
    .sidebar-title:hover { background: #f5f5f5; }
    .sidebar-title--active { color: var(--ec-accent); }
    .store-node {
      display: flex; align-items: center; gap: 8px; padding: 12px; cursor: pointer;
      font-weight: 600; font-size: 0.875rem; color: var(--ec-text); user-select: none;
    }
    .store-node:hover { background: #f5f5f5; }
    .store-node--active { color: var(--ec-navy); }
    .store-node-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Welcome / store cards */
    .commerce-home { padding: 28px 32px; overflow-y: auto; }
    .commerce-home h1 { font-size: 1.6rem; margin: 0 0 8px; color: var(--ec-text); }
    .commerce-home h2 { font-size: 1.1rem; margin: 24px 0 12px; color: var(--ec-text); }
    .home-intro { color: var(--ec-text-alt); max-width: 640px; }
    .store-cards { display: flex; flex-wrap: wrap; gap: 16px; }
    .store-card {
      width: 220px; background: var(--ec-surface); border: 1px solid var(--ec-border); border-radius: var(--ec-radius-lg);
      padding: 24px 16px; text-align: center; cursor: pointer; transition: box-shadow .15s, border-color .15s;
    }
    .store-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.08); border-color: var(--ec-navy); }
    .store-card-icon {
      display: flex; align-items: center; justify-content: center; width: 48px; height: 48px;
      margin: 0 auto 12px; background: #f0f0f3; border-radius: 50%; color: var(--ec-navy); font-size: 1.2rem;
    }
    .store-card-name { font-weight: 600; color: var(--ec-text); }
    .store-card-meta { color: var(--ec-text-muted); font-size: 0.8rem; margin-top: 4px; }

    .nav-list { list-style: none; margin: 4px 0 8px; padding: 0; }

    .nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px 8px 16px;
      cursor: pointer; color: #333333; font-size: 0.84rem;
      position: relative; user-select: none;
    }
    .nav-item:hover:not(.disabled) { background: #f5f5f5; }
    .nav-item.active { background: var(--ec-accent-bg); color: var(--ec-accent); font-weight: 600; }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #d9534f; border-radius: 0 2px 2px 0;
    }
    .nav-item.disabled { color: #bbbbbb; cursor: default; }

    .group-caret { margin-left: auto; font-size: 0.7em; color: var(--ec-text-muted); }

    .nav-subitem {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px 6px 40px;
      font-size: 0.8rem; list-style: none; color: var(--ec-text-alt);
      cursor: pointer; user-select: none; position: relative;
    }
    .nav-subitem:hover:not(.disabled) { background: #f5f5f5; }
    .nav-subitem.disabled { color: #bbbbbb; cursor: default; }
    .nav-subitem--active { background: var(--ec-accent-bg); color: var(--ec-accent); font-weight: 600; }
    .nav-subitem--active::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: #d9534f; border-radius: 0 2px 2px 0;
    }

    .nav-icon { font-size: 1rem; flex-shrink: 0; color: inherit; }
    .nav-icon--sm { font-size: 0.85rem; }

    /* ── Content area ─────────────────────────────────────────── */
    .commerce-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

    /* overflow-y lives on .view-container (kit), not here: the inline views bring their own
       "flex: 1; overflow: auto" body, but embedded child elements (payment providers) can't —
       they'd be clipped by .commerce-content's overflow: hidden with no scrollbar anywhere. */

    /* ── Analytics ────────────────────────────────────────────── */
    .analytics-body { flex: 1; overflow: auto; padding: 16px 24px; }

    .analytics-section { background: var(--ec-surface); border: 1px solid var(--ec-border); border-radius: var(--ec-radius-lg); overflow: hidden; }
    .analytics-section-title { padding: 12px 16px; font-size: 0.85rem; font-weight: 600; color: #444444; border-bottom: 1px solid var(--ec-border-soft); }

    .progress-wrap { display: flex; align-items: center; gap: 8px; }
    .progress-bar { height: 6px; background: #0ea5e9; border-radius: 3px; min-width: 2px; }

    /* ── Store tax rate (Tax Classes view) ────────────────────── */
    .store-tax {
      margin: 12px 24px 0; padding: 12px 16px;
      background: var(--ec-surface); border: 1px solid var(--ec-border); border-radius: var(--ec-radius-md);
    }
    .store-tax-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .store-tax-row label { font-weight: 600; margin-right: 4px; }
    .store-tax small { display: block; margin-top: 6px; color: var(--ec-text-muted); }

    /* ── Market list ──────────────────────────────────────────── */
    .market-list { padding: 6px 0 2px; border-bottom: 1px solid var(--ec-border); }
    .market-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 14px 6px 16px;
      font-size: 0.8rem; color: var(--ec-text-alt); cursor: pointer; user-select: none;
    }
    .market-item:hover { background: #f5f5f5; }
    .market-item--active { background: var(--ec-selected-bg); color: #1d4ed8; font-weight: 600; }
  `];
}

customElements.define('commerce-admin-dashboard', CommerceAdminDashboard);
export default CommerceAdminDashboard;
