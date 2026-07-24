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

const NAV_ITEMS = [
  { key: 'orders',    label: 'Orders',     icon: 'icon-document',        enabled: true  },
  { key: 'carts',     label: 'Carts',      icon: 'icon-shopping-basket',  enabled: true  },
  { key: 'discounts', label: 'Discounts',  icon: 'icon-tag',              enabled: true  },
  { key: 'analytics', label: 'Analytics',  icon: 'icon-chart',            enabled: true  },
];

const OPTIONS_SUBITEMS = [
  { key: 'order-statuses',        label: 'Order Statuses',              icon: 'icon-settings', enabled: true },
  { key: 'payment-providers',     label: 'Payment Providers',           icon: 'icon-bill',     enabled: true },
  { key: 'attributes',            label: 'Product Attributes',          icon: 'icon-tag',      enabled: true },
  { key: 'property-templates',    label: 'Property Templates',          icon: 'icon-list',     enabled: true },
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
    storeExpanded:  { type: Boolean },
    expandedStores: { type: Object },
    optionsOpen:    { type: Boolean },
    marketName:     { type: String  },
    // multi-market
    markets:          { type: Array  },
    selectedMarketId: { type: String },
    cartOrderStatus:  { type: String },
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
    carts:         { type: Array   },
    cartsLoading:  { type: Boolean },
    cartsError:    { type: String  },
    cartsSearch:   { type: String  },
    // analytics
    analyticsOrders:   { type: Array   },
    analyticsLoading:  { type: Boolean },
    analyticsError:    { type: String  },
    // order statuses tab
    orderStatuses:        { type: Array   },
    orderStatusesLoading: { type: Boolean },
    orderStatusesError:   { type: String  },
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
  };

  constructor() {
    super();
    this.activeView    = 'home';
    this.storeExpanded = true;
    this.expandedStores = new Set();
    this.optionsOpen   = false;
    this.marketName    = 'Store';
    this.markets = []; this.selectedMarketId = ''; this.cartOrderStatus = 'new';

    this.orders = []; this.ordersLoading = false; this.ordersError = null;
    this.orderStatusFilter = ''; this.paymentStatusFilter = ''; this.ordersSearch = '';
    this.showOSMenu = false; this.showPSMenu = false;
    this.selectedOrder = null; this.updatingStatusId = null;
    this.allSelected = false; this.selectedIds = new Set();
    this.currentPage = 1; this.pageSize = 20; this.totalCount = 0;

    this.carts = []; this.cartsLoading = false; this.cartsError = null; this.cartsSearch = '';

    this.analyticsOrders = []; this.analyticsLoading = false; this.analyticsError = null;

    this.orderStatuses = []; this.orderStatusesLoading = false; this.orderStatusesError = null;
    this.statusDefs = [];

    this.discounts = []; this.discountsLoading = false; this.discountsError = null; this.editingDiscount = null;
    this.defaultAliases = null;
    this.propertyTemplates = []; this.propertyTemplatesLoading = false; this.propertyTemplatesError = null; this.editingTemplate = null;
    this.propertyTemplatesSearch = ''; this.propertyTemplatesPage = 1;
    this.attributes = []; this.attributesLoading = false; this.attributesError = null; this.editingAttribute = null;
    this.attributesSearch = ''; this.attributesPage = 1;
    this.attributePresets = []; this.attributePresetsLoading = false; this.attributePresetsError = null; this.editingAttributePreset = null;
    this.attributePresetsSearch = ''; this.attributePresetsPage = 1;

    this.consumeContext(UMB_AUTH_CONTEXT, ctx => { this._authContext = ctx; });
    this._closeMenus = () => { this.showOSMenu = false; this.showPSMenu = false; };
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

    // Load markets for the tenant (cartOrderStatus comes from per-market settings)
    try {
      const data = await this._get('/umbraco/management/api/ecomm-commerce/markets');
      this.markets = Array.isArray(data) ? data : [];
      if (this.markets.length > 0) {
        this.selectedMarketId = this.markets[0].id;
        this.marketName = this.markets[0].name;
        this.cartOrderStatus = this.markets[0].cartOrderStatus || 'new';
      } else if (s?.marketId) {
        this.marketName = s.marketId;
      }
    } catch { if (s?.marketId) this.marketName = s.marketId; }

    this.loadDefaultAliases();
    await this.loadStatusDefs();
    this.loadOrders();
  }

  async loadDefaultAliases() {
    try {
      this.defaultAliases = await this._get('/umbraco/management/api/ecomm-commerce/settings/defaults');
    } catch { /* focal point defaults on, no crop */ }
  }

  _selectMarket(m) {
    this.selectedMarketId = m.id;
    this.marketName = m.name;
    this.cartOrderStatus = m.cartOrderStatus || 'new';
    this.currentPage = 1;
    if (this.activeView === 'orders' || this.activeView === 'order-detail') this.loadOrders();
    else if (this.activeView === 'carts') this.loadCarts();
    else if (this.activeView === 'discounts') this.loadDiscounts();
    else if (this.activeView === 'analytics') this.loadAnalytics();
    else if (this.activeView === 'property-templates') { this.loadPropertyTemplates(); this.loadAttributes(); }
    else if (this.activeView === 'attributes') { this.editingAttribute = null; this.loadAttributes(); }
    else if (this.activeView === 'attribute-presets') { this.editingAttributePreset = null; this.loadAttributes(); this.loadAttributePresets(); }
  }

  async loadStatusDefs() {
    try {
      const data = await this._get('/umbraco/management/api/ecomm-commerce/order-statuses');
      this.statusDefs = Array.isArray(data) ? data : [];
    } catch { /* non-fatal: falls back to CSS pill classes */ }
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

  async loadCarts() {
    this.cartsLoading = true; this.cartsError = null;
    try {
      const qs = new URLSearchParams({ status: this.cartOrderStatus || 'new' });
      if (this.selectedMarketId) qs.set('marketId', this.selectedMarketId);
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/orders?${qs}`);
      this.carts = data.orders || [];
    } catch (e) { this.cartsError = e.message; }
    finally { this.cartsLoading = false; }
  }

  get filteredCarts() {
    if (!this.cartsSearch) return this.carts;
    const q = this.cartsSearch.toLowerCase();
    return this.carts.filter(c =>
      c.orderNumber?.toLowerCase().includes(q) ||
      c.customer?.fullName?.toLowerCase().includes(q) ||
      c.customer?.email?.toLowerCase().includes(q));
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

  async loadOrderStatuses() {
    // Reuse statusDefs if already loaded; otherwise fetch fresh
    if (this.statusDefs.length) {
      this.orderStatuses = this.statusDefs;
      return;
    }
    this.orderStatusesLoading = true; this.orderStatusesError = null;
    try {
      const data = await this._get('/umbraco/management/api/ecomm-commerce/order-statuses');
      this.orderStatuses = Array.isArray(data) ? data : [];
      this.statusDefs = this.orderStatuses; // keep in sync
    } catch (e) { this.orderStatusesError = e.message; }
    finally { this.orderStatusesLoading = false; }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  _selectView(key) {
    this.activeView = key;
    if (OPTIONS_SUBITEMS.find(i => i.key === key)) this.optionsOpen = true;
    if (key === 'carts'          && !this.carts.length          && !this.cartsLoading)          this.loadCarts();
    if (key === 'analytics'      && !this.analyticsOrders.length && !this.analyticsLoading)     this.loadAnalytics();
    if (key === 'order-statuses' && !this.orderStatuses.length   && !this.orderStatusesLoading) this.loadOrderStatuses();
    if (key === 'discounts'      && !this.discounts.length       && !this.discountsLoading)      this.loadDiscounts();
    if (key === 'property-templates') { if (!this.propertyTemplates.length && !this.propertyTemplatesLoading) this.loadPropertyTemplates(); if (!this.attributes.length && !this.attributesLoading) this.loadAttributes(); }
    if (key === 'attributes'         && !this.attributes.length         && !this.attributesLoading)        this.loadAttributes();
    if (key === 'attribute-presets') { if (!this.attributes.length && !this.attributesLoading) this.loadAttributes(); if (!this.attributePresets.length && !this.attributePresetsLoading) this.loadAttributePresets(); }
  }

  // ── Formatting ─────────────────────────────────────────────────────────────

  formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  // Currency comes from the selected market (single currency per market), not a hardcoded $.
  formatCurrency(n) {
    const code = this.markets?.find(m => m.id === this.selectedMarketId)?.currency || 'USD';
    const locale = { SEK: 'sv-SE', NOK: 'nb-NO', DKK: 'da-DK', EUR: 'de-DE', GBP: 'en-GB', USD: 'en-US' }[code] || 'en-US';
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

        ${this._renderPagination()}
        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Orders</span></div>
      </div>`;
  }

  _renderPagination() {
    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    if (totalPages <= 1) return '';

    const pages = new Set([1, totalPages]);
    for (let p = this.currentPage - 1; p <= this.currentPage + 1; p++) {
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const items = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push(null);
      items.push(sorted[i]);
    }

    const goTo = p => { this.currentPage = p; this.loadOrders(); };

    return html`
      <div class="pagination-bar">
        <button class="page-btn" ?disabled=${this.currentPage <= 1} @click=${() => goTo(this.currentPage - 1)}>←</button>
        ${items.map(p => p === null
          ? html`<span class="page-ellipsis">…</span>`
          : html`<button class="page-btn ${this.currentPage === p ? 'page-btn--active' : ''}" @click=${() => goTo(p)}>${p}</button>`
        )}
        <button class="page-btn" ?disabled=${this.currentPage >= totalPages} @click=${() => goTo(this.currentPage + 1)}>→</button>
      </div>`;
  }

  _renderLocalPagination(total, page, pageSize, goTo) {
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
    const carts = this.filteredCarts;
    return html`
      <div class="view-container">
        ${this._viewHeader('Carts', html`
          <uui-button look="secondary" compact @click=${this.loadCarts}>
            <uui-icon name="icon-refresh"></uui-icon> Refresh
          </uui-button>`)}

        ${this._errorBanner(this.cartsError, () => { this.cartsError = null; })}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Search carts…"
                .value=${this.cartsSearch} @input=${e => { this.cartsSearch = e.target.value; }}>
            </div>
          </div>
        </div>

        ${this.cartsLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading carts…</p>`) :
          carts.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-shopping-basket" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No active carts</p>
            <p style="font-size:0.8rem;color:#aaa">Carts appear here when customers start shopping but haven't checked out yet.</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Cart</th><th>Customer</th><th>Items</th><th class="col-r">Total</th><th>Last Activity</th>
                </tr></thead>
                <tbody>
                  ${carts.map(c => html`
                    <tr class="data-row">
                      <td>
                        <div class="name-cell">
                          <span class="doc-icon"><uui-icon name="icon-shopping-basket"></uui-icon></span>
                          <span class="name-primary">${c.orderNumber || c.id}</span>
                        </div>
                      </td>
                      <td>
                        ${c.customer?.fullName
                          ? html`<span class="name-primary">${c.customer.fullName}</span><span class="name-sub">${c.customer.email}</span>`
                          : html`<span class="muted">Anonymous</span>`}
                      </td>
                      <td>${(c.lineItems || c.items || []).length} item${(c.lineItems || c.items || []).length !== 1 ? 's' : ''}</td>
                      <td class="col-r"><span class="pay-amount">${this.formatCurrency(c.total)}</span></td>
                      <td class="col-date">${this.formatDate(c.updatedAt || c.createdAt)}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>`}

        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Carts</span></div>
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
    return html`
      <div class="view-container">
        ${this._viewHeader('Order Statuses', html`
          <uui-button look="secondary" compact @click=${this.loadOrderStatuses}>
            <uui-icon name="icon-refresh"></uui-icon> Refresh
          </uui-button>`)}

        ${this._errorBanner(this.orderStatusesError, () => { this.orderStatusesError = null; })}

        ${this.orderStatusesLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          this.orderStatuses.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-settings" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>No order statuses found</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th style="width:40px"></th>
                  <th>Name</th><th>Code</th><th>Sort</th><th>Active</th><th>System</th>
                </tr></thead>
                <tbody>
                  ${this.orderStatuses.map(s => html`
                    <tr class="data-row">
                      <td><span class="color-dot" style="background:${s.color || '#6B7280'}"></span></td>
                      <td><strong>${s.name}</strong></td>
                      <td><code>${s.code}</code></td>
                      <td>${s.sortOrder}</td>
                      <td>
                        <span class="pill ${s.isActive ? 'pill--active' : 'pill--inactive'}">
                          ${s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        ${s.isSystemDefault
                          ? html`<span class="pill pill--system">System</span>`
                          : html`<span class="muted">—</span>`}
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>`}

        <div class="view-footer"><span class="breadcrumb">${this.marketName} / Order Statuses</span></div>
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
            ${this._renderLocalPagination(filtered.length, page, PAGE_SIZE, p => { this.propertyTemplatesPage = p; })}`}

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
            ${this._renderLocalPagination(filtered.length, page, PAGE_SIZE, p => { this.attributesPage = p; })}`}

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
            ${this._renderLocalPagination(filtered.length, page, PAGE_SIZE, p => { this.attributePresetsPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Product Attribute Presets</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} preset${filtered.length !== 1 ? 's' : ''}</span>` : ''}
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
            <li class="nav-item ${inThisStore && (this.activeView === item.key || (item.key === 'orders' && this.activeView === 'order-detail')) ? 'active' : ''} ${!item.enabled ? 'disabled' : ''}"
                @click=${(e) => { e.stopPropagation(); item.enabled && this._selectStoreView(m, item.key); }}>
              <uui-icon name="${item.icon}" class="nav-icon"></uui-icon>
              ${item.label}
            </li>`)}

          <li class="nav-item nav-item--group"
              @click=${e => { e.stopPropagation(); this.optionsOpen = !this.optionsOpen; }}>
            <uui-icon name="icon-settings" class="nav-icon"></uui-icon>
            Options
            <span class="group-caret ${this.optionsOpen ? 'open' : ''}">▾</span>
          </li>

          ${this.optionsOpen ? OPTIONS_SUBITEMS.map(sub => html`
            <li class="nav-subitem ${!sub.enabled ? 'disabled' : ''} ${inThisStore && this.activeView === sub.key ? 'nav-subitem--active' : ''}"
                @click=${(e) => { e.stopPropagation(); sub.enabled && this._selectStoreView(m, sub.key); }}>
              <uui-icon name="${sub.icon}" class="nav-icon nav-icon--sm"></uui-icon>
              ${sub.label}
            </li>`) : ''}
        </ul>` : ''}`;
  }

  _toggleStore(m) {
    const next = new Set(this.expandedStores);
    if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
    this.expandedStores = next;
  }

  _selectStoreView(m, key) {
    if (this.selectedMarketId !== m.id) this._selectMarket(m);
    this._selectView(key);
  }

  _openStore(m) {
    this.expandedStores = new Set(this.expandedStores).add(m.id);
    this._selectMarket(m);
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
      case 'analytics':      return this._renderAnalyticsView();
      case 'order-statuses': return this._renderOrderStatusesView();
      case 'discounts':      return this._renderDiscountsView();
      case 'attributes':          return this._renderAttributesView();
      case 'attribute-presets':   return this._renderAttributePresetsView();
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

    .view-container { display: flex; flex-direction: column; height: 100%; background: #f4f4f4; }

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
