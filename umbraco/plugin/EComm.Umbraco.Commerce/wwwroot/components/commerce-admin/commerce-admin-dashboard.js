import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import '@umbraco-cms/backoffice/media'; // registers the native <umb-input-rich-media> element

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
  { key: 'order-statuses',      label: 'Order Statuses',       icon: 'icon-settings', enabled: true },
  { key: 'option-presets',      label: 'Option Presets',       icon: 'icon-code',     enabled: true },
  { key: 'property-templates',  label: 'Property Templates',   icon: 'icon-list',     enabled: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getOrderStatusLabel  = s => ORDER_STATUS_LABELS[s]   || s || 'Unknown';
const getPaymentStatusLabel = s => PAYMENT_STATUS_LABELS[s] || s || 'Unknown';
const derivePaymentStatus  = s => s === 'paid' ? 'paid' : (s === 'cancelled' || s === 'refunded' ? s : 'initialized');

// ─── Component ───────────────────────────────────────────────────────────────

class CommerceAdminDashboard extends UmbElementMixin(LitElement) {
  static properties = {
    // navigation
    activeView:     { type: String  },
    storeExpanded:  { type: Boolean },
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
    // option presets
    optionPresets:        { type: Array   },
    optionPresetsLoading: { type: Boolean },
    optionPresetsError:   { type: String  },
    editingPreset:        { type: Object  },
    defaultAliases:       { type: Object  },
    optionImageWorking:   { type: Boolean },
    optionPresetsSearch:  { type: String  },
    optionPresetsPage:    { type: Number  },
    _presetPickerOpen:    { type: Boolean },
    _presetPickerSearch:  { type: String  },
    _presetPickerPage:    { type: Number  },
    // property templates
    propertyTemplates:        { type: Array   },
    propertyTemplatesLoading: { type: Boolean },
    propertyTemplatesError:   { type: String  },
    editingTemplate:          { type: Object  },
    propertyTemplatesSearch:  { type: String  },
    propertyTemplatesPage:    { type: Number  },
  };

  constructor() {
    super();
    this.activeView    = 'orders';
    this.storeExpanded = true;
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
    this.optionPresets = []; this.optionPresetsLoading = false; this.optionPresetsError = null; this.editingPreset = null;
    this.defaultAliases = null; this.optionImageWorking = false;
    this.optionPresetsSearch = ''; this.optionPresetsPage = 1;
    this._presetPickerOpen = false; this._presetPickerSearch = ''; this._presetPickerPage = 1;
    this.propertyTemplates = []; this.propertyTemplatesLoading = false; this.propertyTemplatesError = null; this.editingTemplate = null;
    this.propertyTemplatesSearch = ''; this.propertyTemplatesPage = 1;

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

  // ─── Umbraco media picker helpers (single option image) ─────────────────────

  async resolveUmbracoMediaUrls(keys, authHeader) {
    try {
      if (!authHeader) authHeader = `Bearer ${await this._authContext?.getLatestToken()}`;
      const params = keys.map(k => `id=${encodeURIComponent(k)}`).join('&');
      const res = await fetch(`/umbraco/management/api/v1/media/urls?${params}`, {
        headers: { 'Authorization': authHeader }, credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(i => i.urlInfos?.[0]?.url || null).filter(Boolean);
    } catch { return []; }
  }

  async _mediaInfo(mediaKey) {
    this._mediaInfoCache = this._mediaInfoCache || {};
    if (this._mediaInfoCache[mediaKey]) return this._mediaInfoCache[mediaKey];
    const authHeader = `Bearer ${await this._authContext?.getLatestToken()}`;
    let url = '';
    try { url = (await this.resolveUmbracoMediaUrls([mediaKey], authHeader))[0] || ''; } catch { /* ignore */ }
    let altText;
    try {
      const res = await fetch(`/umbraco/management/api/v1/media/${mediaKey}`, {
        headers: { Authorization: authHeader }, credentials: 'include',
      });
      if (res.ok) altText = this._readAltFromMediaDetail(await res.json());
    } catch { /* ignore */ }
    const info = { url, altText };
    this._mediaInfoCache[mediaKey] = info;
    return info;
  }

  _readAltFromMediaDetail(detail) {
    const values = (detail && detail.values) || [];
    const aliases = ['alttext', 'alt', 'alternativetext'];
    for (const alias of aliases) {
      const v = values.find(x => (x.alias || '').toLowerCase() === alias && typeof x.value === 'string' && x.value.trim());
      if (v) return v.value.trim();
    }
    return (detail && detail.variants && detail.variants[0] && detail.variants[0].name) || undefined;
  }

  /** The single configured crop preset (Settings → Images), as the native picker's preselectedCrops. */
  _preselectedCrops() {
    const c = this.defaultAliases?.productImageCrop;
    if (!c || !(c.width > 0) || !(c.height > 0)) return [];
    return [{ alias: c.alias || 'product', label: c.label, width: c.width, height: c.height }];
  }

  /** Build the <umb-input-rich-media> value from a single option image (media-backed only). */
  _optionImageRichValue(image) {
    if (!image || !image.mediaKey) return [];
    return [{ key: image.mediaKey, mediaKey: image.mediaKey, mediaTypeAlias: '', focalPoint: image.focalPoint || null, crops: image.crops || [] }];
  }

  /** Map the native element value back to a single option image, resolving URL + alt. */
  async _onOptionImageChange(value) {
    const p = this.editingPreset;
    if (!p) return;
    const entry = (Array.isArray(value) ? value : []).find(e => e && e.mediaKey);
    if (!entry) { this.editingPreset = { ...p, image: null }; return; }
    this.optionImageWorking = true;
    try {
      const info = await this._mediaInfo(entry.mediaKey);
      const baseUrl = (info.url && info.url.split('?')[0]) || (p.image && p.image.url) || '';
      this.editingPreset = {
        ...this.editingPreset,
        image: {
          url: baseUrl,
          mediaKey: entry.mediaKey,
          altText: (p.image && p.image.altText) || info.altText || undefined,
          focalPoint: entry.focalPoint || undefined,
          crops: (entry.crops && entry.crops.length) ? entry.crops : undefined,
        },
      };
    } finally { this.optionImageWorking = false; }
  }

  /** Reusable image-picker form row for the option editor (single photo + legacy URL fallback). */
  _renderOptionImageField(p) {
    return html`
      <div class="form-row"><label>Image</label>
        <div style="flex:1">
          <umb-input-rich-media
            .value=${this._optionImageRichValue(p.image)}
            ?multiple=${false}
            .focalPointEnabled=${this.defaultAliases?.enableFocalPoint ?? true}
            .preselectedCrops=${this._preselectedCrops()}
            @change=${e => this._onOptionImageChange(e.target.value)}>
          </umb-input-rich-media>
          ${this.optionImageWorking ? html`<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><uui-loader></uui-loader><span style="font-size:0.8rem;color:#999">Working…</span></div>` : ''}
          <input class="form-input" style="margin-top:6px" .value=${p.imageUrl || ''} placeholder="…or paste an image URL"
            @input=${e => { this.editingPreset = { ...this.editingPreset, imageUrl: e.target.value }; }}>
        </div>
      </div>`;
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
    else if (this.activeView === 'property-templates') this.loadPropertyTemplates();
    else if (this.activeView === 'option-presets') { this.editingPreset = null; this.loadOptionPresets(); }
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

  // ── Option Presets ─────────────────────────────────────────────────────────

  async loadOptionPresets() {
    this.optionPresetsLoading = true; this.optionPresetsError = null; this.optionPresetsPage = 1;
    try {
      const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
      const data = await this._get(`/umbraco/management/api/ecomm-commerce/option-presets${qs}`);
      // API now returns { presets: [...], total, page, pageSize }
      this.optionPresets = Array.isArray(data) ? data : (data?.presets ?? []);
    } catch (e) { this.optionPresetsError = e.message; }
    finally { this.optionPresetsLoading = false; }
  }

  async _saveOptionPresets(presets) {
    const headers = await this.getAuthHeaders();
    const qs = this.selectedMarketId ? `?marketId=${encodeURIComponent(this.selectedMarketId)}` : '';
    const r = await fetch(`/umbraco/management/api/ecomm-commerce/option-presets${qs}`, {
      method: 'PUT', headers, credentials: 'include',
      body: JSON.stringify({ presets })
    });
    if (!r.ok) throw new Error(r.statusText);
  }

  async savePreset() {
    const p = this.editingPreset;
    if (!p) return;
    try {
      const list = p.id
        ? this.optionPresets.map(x => x.id === p.id ? p : x)
        : [...this.optionPresets, { ...p, id: crypto.randomUUID() }];
      await this._saveOptionPresets(list);
      this.editingPreset = null;
      this.loadOptionPresets();
    } catch (e) { this.optionPresetsError = e.message; }
  }

  async deletePreset(id) {
    try {
      const list = this.optionPresets.filter(x => x.id !== id);
      await this._saveOptionPresets(list);
      this.loadOptionPresets();
    } catch (e) { this.optionPresetsError = e.message; }
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
      const tmpl = { name: t.name.trim(), defaultValue: t.defaultValue || '', sortOrder };
      const list = t._isNew
        ? [...this.propertyTemplates, tmpl]
        : this.propertyTemplates.map((x, i) => i === t._idx ? tmpl : x);
      await this._savePropertyTemplates(list);
      this.editingTemplate = null;
      this.loadPropertyTemplates();
    } catch (e) { this.propertyTemplatesError = e.message; }
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
    if (key === 'option-presets'     && !this.optionPresets.length      && !this.optionPresetsLoading)     this.loadOptionPresets();
    if (key === 'property-templates' && !this.propertyTemplates.length  && !this.propertyTemplatesLoading) this.loadPropertyTemplates();
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
    return html`
      <div class="pagination-bar">
        <button class="page-btn" ?disabled=${page <= 1} @click=${() => goTo(page - 1)}>←</button>
        ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => html`
          <button class="page-btn ${page === p ? 'page-btn--active' : ''}" @click=${() => goTo(p)}>${p}</button>`)}
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

  // ── Option Presets ─────────────────────────────────────────────────────────

  _renderOptionPresetsView() {
    const p = this.editingPreset;
    const PAGE_SIZE = 10;
    const q = (this.optionPresetsSearch || '').toLowerCase();
    const filtered = q
      ? this.optionPresets.filter(x => x.name?.toLowerCase().includes(q) || x.sku?.toLowerCase().includes(q))
      : this.optionPresets;
    const page = this.optionPresetsPage;
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const singles = this.optionPresets.filter(x => (x.kind || 'single') === 'single');

    return html`
      <div class="view-container">
        ${this._viewHeader('Option Presets', html`
          <div style="display:flex;gap:6px">
            <uui-button look="primary" @click=${() => { this.editingPreset = { id: crypto.randomUUID(), name:'', sku:'', price:0, stockQuantity:0, kind:'single', status:'active', description:'', imageUrl:'' }; }}>
              + Single
            </uui-button>
            <uui-button look="secondary" @click=${() => { this.editingPreset = { id: crypto.randomUUID(), name:'', sku:'', price:0, stockQuantity:0, kind:'group', status:'active', description:'', imageUrl:'', subOptionIds:[] }; }}>
              + Group
            </uui-button>
          </div>`)}

        ${this._errorBanner(this.optionPresetsError, () => { this.optionPresetsError = null; })}

        ${p ? html`
          <div class="form-panel">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <h3 style="margin:0">${p.id && this.optionPresets.find(x=>x.id===p.id) ? 'Edit Preset' : 'New Preset'}</h3>
              <span class="pill ${(p.kind||'single')==='group' ? 'pill--group' : 'pill--single'}">${p.kind||'single'}</span>
              <select class="form-input" style="width:auto;font-size:0.8rem" .value=${p.kind||'single'}
                @change=${e => {
                  const k = e.target.value;
                  this.editingPreset = k === 'group'
                    ? {...p, kind:'group', subOptionIds: p.subOptionIds||[]}
                    : {...p, kind:'single', subOptionIds: undefined};
                }}>
                <option value="single">Single option</option>
                <option value="group">Group (sub-options)</option>
              </select>
            </div>

            ${(p.kind||'single') === 'group' ? html`
              <div class="form-row"><label>Name</label>
                <input class="form-input" .value=${p.name||''} placeholder="e.g. Couplings"
                  @input=${e => { this.editingPreset = {...p, name: e.target.value}; }}>
              </div>
              <div class="form-row"><label>Status</label>
                <select class="form-input" .value=${p.status||'active'}
                  @change=${e => { this.editingPreset = {...p, status: e.target.value}; }}>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option>
                </select>
              </div>
              ${this._renderOptionImageField(p)}
              <div class="form-row"><label>Description</label>
                <textarea class="form-input" rows="2" .value=${p.description||''} placeholder="Optional"
                  @input=${e => { this.editingPreset = {...p, description: e.target.value}; }}></textarea>
              </div>
              <div class="form-row"><label>Sub options</label>
                <div style="display:flex;flex-direction:column;gap:4px">
                  ${(p.subOptionIds||[]).map((id, i) => {
                    const s = singles.find(x => x.id === id);
                    return html`
                      <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--uui-color-interactive,#4a6ba8);border-radius:4px;background:#eff6ff;font-size:0.875rem">
                        <span style="color:#999;width:1.2rem;flex-shrink:0">${i+1}.</span>
                        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s ? s.name : id}</span>
                        ${s ? html`<span style="color:#999;font-size:0.8rem;flex-shrink:0">${this.formatCurrency(s.price)}</span>` : ''}
                        <button style="background:none;border:none;cursor:pointer;color:#999;font-size:1rem;line-height:1;padding:0 2px;flex-shrink:0"
                          @click=${() => { const cur = p.subOptionIds||[]; this.editingPreset = {...p, subOptionIds: cur.filter(x=>x!==id)}; }}>×</button>
                      </div>`;
                  })}
                  <button style="background:none;border:1px dashed #ccc;border-radius:4px;padding:6px;font-size:0.85rem;color:#999;cursor:pointer;text-align:center;width:100%"
                    @click=${() => { this._presetPickerSearch = ''; this._presetPickerPage = 1; this._presetPickerOpen = true; }}>
                    ── Add new ──
                  </button>
                </div>
                ${this._presetPickerOpen ? html`
                  <div style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"
                    @click=${() => { this._presetPickerOpen = false; }}>
                    <div style="background:#fff;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.18);width:320px;max-width:90vw;overflow:hidden"
                      @click=${e => e.stopPropagation()}>
                      <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center">
                        <input style="flex:1;border:1px solid #d1d5db;border-radius:4px;padding:4px 8px;font-size:0.875rem;outline:none"
                          type="search" placeholder="Search singles…"
                          .value=${this._presetPickerSearch}
                          @input=${e => { this._presetPickerSearch = e.target.value; this._presetPickerPage = 1; }}>
                        <button style="background:none;border:none;cursor:pointer;font-size:1.25rem;color:#6b7280;line-height:1"
                          @click=${() => { this._presetPickerOpen = false; }}>×</button>
                      </div>
                      <div style="max-height:280px;overflow-y:auto">
                        ${(() => {
                          const PICKER_SIZE = 8;
                          const q = (this._presetPickerSearch||'').toLowerCase();
                          const cur = p.subOptionIds||[];
                          const avail = singles.filter(s => s.id !== p.id && !cur.includes(s.id) && (!q || s.name?.toLowerCase().includes(q)));
                          if (!avail.length) return html`<p style="padding:1rem;text-align:center;color:#9ca3af;font-size:0.875rem">${q ? 'No matches.' : 'All singles already added.'}</p>`;
                          const pg = this._presetPickerPage;
                          const totalPg = Math.ceil(avail.length / PICKER_SIZE);
                          const paged = avail.slice((pg-1)*PICKER_SIZE, pg*PICKER_SIZE);
                          return html`
                            ${paged.map(s => html`
                              <button style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 12px;background:none;border:none;border-bottom:1px solid #f3f4f6;cursor:pointer;font-size:0.875rem;text-align:left"
                                @click=${() => {
                                  const cur2 = p.subOptionIds||[];
                                  this.editingPreset = {...p, subOptionIds: [...cur2, s.id]};
                                  this._presetPickerOpen = false; this._presetPickerSearch = ''; this._presetPickerPage = 1;
                                }}>
                                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name||'(unnamed)'}</span>
                                <span style="color:#6b7280;flex-shrink:0;font-size:0.8rem">${this.formatCurrency(s.price)}</span>
                              </button>`)}
                            ${totalPg > 1 ? html`
                              <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:6px 12px;border-top:1px solid #e5e7eb;font-size:0.8rem;color:#6b7280">
                                <button style="background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:3px;color:${pg<=1?'#d1d5db':'#374151'}" ?disabled=${pg<=1}
                                  @click=${() => { this._presetPickerPage = pg-1; }}>←</button>
                                <span>${pg} / ${totalPg}</span>
                                <button style="background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:3px;color:${pg>=totalPg?'#d1d5db':'#374151'}" ?disabled=${pg>=totalPg}
                                  @click=${() => { this._presetPickerPage = pg+1; }}>→</button>
                              </div>` : ''}`;
                        })()}
                      </div>
                    </div>
                  </div>` : ''}
              </div>` : html`
              <div class="form-row"><label>Name</label>
                <input class="form-input" .value=${p.name||''} placeholder="e.g. Towbar 50mm"
                  @input=${e => { this.editingPreset = {...p, name: e.target.value}; }}>
              </div>
              <div class="form-row"><label>SKU</label>
                <input class="form-input" .value=${p.sku||''} placeholder="OPT-TOWBAR-50"
                  @input=${e => { this.editingPreset = {...p, sku: e.target.value}; }}>
              </div>
              <div class="form-row"><label>Price</label>
                <input class="form-input" type="number" min="0" step="0.01" .value=${p.price||0}
                  @input=${e => { this.editingPreset = {...p, price: parseFloat(e.target.value)||0}; }}>
              </div>
              <div class="form-row"><label>Stock</label>
                <input class="form-input" type="number" min="0" .value=${p.stockQuantity||0}
                  @input=${e => { this.editingPreset = {...p, stockQuantity: parseInt(e.target.value)||0}; }}>
              </div>
              ${this._renderOptionImageField(p)}
              <div class="form-row"><label>Status</label>
                <select class="form-input" .value=${p.status||'active'}
                  @change=${e => { this.editingPreset = {...p, status: e.target.value}; }}>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option>
                </select>
              </div>
              <div class="form-row"><label>Description</label>
                <textarea class="form-input" rows="2" .value=${p.description||''} placeholder="Optional"
                  @input=${e => { this.editingPreset = {...p, description: e.target.value}; }}></textarea>
              </div>`}

            <div class="form-actions">
              <uui-button look="primary" @click=${() => this.savePreset()}>Save</uui-button>
              <uui-button look="secondary" @click=${() => { this.editingPreset = null; }}>Cancel</uui-button>
            </div>
          </div>` : ''}

        <div class="filters-bar">
          <div class="filters-left"></div>
          <div class="filters-right">
            <div class="search-wrap">
              <uui-icon name="icon-search" class="search-icon"></uui-icon>
              <input class="search-input" type="search" placeholder="Search presets…"
                .value=${this.optionPresetsSearch}
                @input=${e => { this.optionPresetsSearch = e.target.value; this.optionPresetsPage = 1; }}>
            </div>
          </div>
        </div>

        ${this.optionPresetsLoading ? this._stateCenter(html`<uui-loader></uui-loader><p>Loading…</p>`) :
          filtered.length === 0 ? this._stateCenter(html`
            <uui-icon name="icon-code" style="font-size:3rem;opacity:0.25"></uui-icon>
            <p>${q ? 'No presets match your search' : 'No option presets yet'}</p>`) :
          html`
            <div class="table-scroll">
              <table class="data-table">
                <thead><tr>
                  <th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Kind</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  ${paged.map(preset => html`
                    <tr class="data-row">
                      <td>
                        <strong>${preset.name}</strong>
                        ${preset.description ? html`<div style="font-size:0.75rem;color:#999;margin-top:2px">${preset.description}</div>` : ''}
                      </td>
                      <td><code>${preset.sku || '—'}</code></td>
                      <td>${(preset.kind||'single')==='group' ? html`<em style="color:#999">—</em>` : this.formatCurrency(preset.price)}</td>
                      <td>${(preset.kind||'single')==='group' ? html`<em style="color:#999">—</em>` : (preset.stockQuantity ?? '—')}</td>
                      <td><span class="pill ${(preset.kind||'single')==='group' ? 'pill--group' : 'pill--single'}">${preset.kind||'single'}</span></td>
                      <td><span class="pill ${preset.status === 'active' ? 'pill--active' : 'pill--inactive'}">${preset.status}</span></td>
                      <td class="row-actions">
                        <uui-button look="secondary" compact @click=${(e) => { e.stopPropagation(); this.editingPreset = {...preset, subOptionIds: preset.subOptionIds||[]}; }}>Edit</uui-button>
                        <uui-button look="secondary" color="danger" compact @click=${(e) => { e.stopPropagation(); this.deletePreset(preset.id); }}>Del</uui-button>
                      </td>
                    </tr>`)}
                </tbody>
              </table>
            </div>
            ${this._renderLocalPagination(filtered.length, page, PAGE_SIZE, p => { this.optionPresetsPage = p; })}`}

        <div class="view-footer">
          <span class="breadcrumb">${this.marketName} / Options / Option Presets</span>
          ${filtered.length > 0 ? html`<span class="breadcrumb" style="margin-left:auto">${filtered.length} preset${filtered.length !== 1 ? 's' : ''}</span>` : ''}
        </div>
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
              <label>Default Value</label>
              <input class="form-input" .value=${t.defaultValue || ''} @input=${e => { this.editingTemplate = { ...t, defaultValue: e.target.value }; }} placeholder="Optional">
            </div>
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
                  <th>#</th><th>Name</th><th>Default Value</th><th></th>
                </tr></thead>
                <tbody>
                  ${paged.map((tmpl, i) => { const idx = (page - 1) * PAGE_SIZE + i; return html`
                    <tr class="data-row">
                      <td>${tmpl.sortOrder ?? idx}</td>
                      <td><strong>${tmpl.name}</strong></td>
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
        <div class="store-header" @click=${() => { this.storeExpanded = !this.storeExpanded; }}>
          <span class="store-icon-wrap"><uui-icon name="icon-shopping-basket"></uui-icon></span>
          <span class="store-name">${this.marketName}</span>
          <span class="store-caret ${this.storeExpanded ? 'open' : ''}">▾</span>
        </div>

        ${this.storeExpanded ? html`
          ${this.markets.length > 1 ? html`
            <div class="market-list">
              ${this.markets.map(m => html`
                <div class="market-item ${this.selectedMarketId === m.id ? 'market-item--active' : ''}"
                     @click=${(e) => { e.stopPropagation(); this._selectMarket(m); }}>
                  <uui-icon name="icon-store" class="nav-icon nav-icon--sm"></uui-icon>
                  ${m.name}
                </div>`)}
            </div>` : ''}

          <ul class="nav-list">
            ${NAV_ITEMS.map(item => html`
              <li class="nav-item ${(this.activeView === item.key || (item.key === 'orders' && this.activeView === 'order-detail')) ? 'active' : ''} ${!item.enabled ? 'disabled' : ''}"
                  @click=${() => item.enabled && this._selectView(item.key)}>
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
              <li class="nav-subitem ${!sub.enabled ? 'disabled' : ''} ${this.activeView === sub.key ? 'nav-subitem--active' : ''}"
                  @click=${() => sub.enabled && this._selectView(sub.key)}>
                <uui-icon name="${sub.icon}" class="nav-icon nav-icon--sm"></uui-icon>
                ${sub.label}
              </li>`) : ''}
          </ul>
        ` : ''}
      </nav>`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOT RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  _renderCurrentView() {
    switch (this.activeView) {
      case 'orders':         return this._renderOrdersView();
      case 'order-detail':   return this._renderOrderDetailView();
      case 'carts':          return this._renderCartsView();
      case 'analytics':      return this._renderAnalyticsView();
      case 'order-statuses': return this._renderOrderStatusesView();
      case 'discounts':      return this._renderDiscountsView();
      case 'option-presets':      return this._renderOptionPresetsView();
      case 'property-templates':  return this._renderPropertyTemplatesView();
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
    .store-caret { font-size: 0.75rem; color: #888; }
    .store-caret.open { transform: rotate(0deg); }

    .nav-list { list-style: none; margin: 4px 0; padding: 0; }

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

    .row-actions { display: flex; gap: 4px; white-space: nowrap; }
  `;
}

customElements.define('commerce-admin-dashboard', CommerceAdminDashboard);
export default CommerceAdminDashboard;
