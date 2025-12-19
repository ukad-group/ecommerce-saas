import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';

class ECommProductsWorkspaceView extends UmbElementMixin(LitElement) {
  static properties = {
    categoryId: { type: String },
    products: { type: Array },
    loading: { type: Boolean },
    error: { type: String }
  };

  constructor() {
    super();
    this.categoryId = null;
    this.products = [];
    this.loading = false;
    this.error = null;

    // Consume auth context for API calls
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });

    // Consume workspace context to get document data
    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (workspaceContext) => {
      if (!workspaceContext) return;

      this._workspaceContext = workspaceContext;

      // Observe workspace data for property changes
      if (workspaceContext.data) {
        this.observe(
          workspaceContext.data,
          (data) => {
            if (!data) return;

            // Extract categoryId from data.values array
            let newCategoryId = null;
            if (data.values && Array.isArray(data.values)) {
              const categoryIdProp = data.values.find(v => v?.alias === 'categoryId');
              if (categoryIdProp) {
                newCategoryId = categoryIdProp.value;
              }
            }

            // Only reload if categoryId actually changed
            if (newCategoryId !== this.categoryId) {
              this.categoryId = newCategoryId;
              if (newCategoryId) {
                this.loadProducts();
              } else {
                this.products = [];
                this.error = null;
              }
            }
          }
        );
      }
    });
  }

  async getAuthHeaders() {
    const token = await this._authContext?.getLatestToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async loadProducts() {
    if (!this.categoryId) {
      this.error = 'No category selected';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/products/${this.categoryId}`,
        {
          headers: headers,
          credentials: 'include'
        }
      );

      if (response.ok) {
        const result = await response.json();
        this.products = result.products || [];
      } else if (response.status === 404) {
        this.error = 'API not configured. Please go to Settings > Commerce Settings to configure the eCommerce API connection.';
      } else {
        const errorText = await response.text();
        this.error = `Failed to load products: ${errorText || response.statusText}`;
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      this.error = 'Failed to connect to eCommerce API: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading-state">
          <uui-loader></uui-loader>
          <p>Loading products...</p>
        </div>
      `;
    }

    if (!this.categoryId) {
      return html`
        <uui-box>
          <div class="info-state">
            <uui-icon name="icon-info"></uui-icon>
            <h3>No Category Selected</h3>
            <p>To view products from the eCommerce API, you need to select a category first.</p>
            <ol>
              <li>Go to the <strong>Content</strong> tab</li>
              <li>Find the <strong>Category</strong> property</li>
              <li>Select a category from the dropdown</li>
              <li>Save the document</li>
              <li>Return to this tab to see products</li>
            </ol>
          </div>
        </uui-box>
      `;
    }

    if (this.error) {
      return html`
        <uui-box>
          <div class="error-state">
            <uui-icon name="icon-alert" style="color: var(--uui-color-danger);"></uui-icon>
            <h3>Error Loading Products</h3>
            <p>${this.error}</p>
            <uui-button
              look="secondary"
              @click=${this.loadProducts}>
              <uui-icon name="icon-refresh"></uui-icon>
              Retry
            </uui-button>
          </div>
        </uui-box>
      `;
    }

    if (this.products.length === 0) {
      return html`
        <uui-box>
          <div class="empty-state">
            <uui-icon name="icon-box"></uui-icon>
            <h3>No Products Found</h3>
            <p>This category doesn't have any products yet.</p>
            <small>Products added via the eCommerce API will appear here automatically.</small>
          </div>
        </uui-box>
      `;
    }

    return html`
      <uui-box>
        <div slot="headline">Products (${this.products.length})</div>
        <p class="description">
          Read-only view of products from the eCommerce API for this category.
        </p>

        <uui-table>
          <uui-table-head>
            <uui-table-head-cell style="width: 80px;">Image</uui-table-head-cell>
            <uui-table-head-cell>Name</uui-table-head-cell>
            <uui-table-head-cell style="width: 200px;">Slug</uui-table-head-cell>
            <uui-table-head-cell style="width: 120px;">Price</uui-table-head-cell>
            <uui-table-head-cell style="width: 100px;">Stock</uui-table-head-cell>
          </uui-table-head>

          <uui-table-body>
            ${this.products.map(product => html`
              <uui-table-row>
                <uui-table-cell style="width: 80px;">
                  ${product.images?.length > 0 ? html`
                    <img
                      src="${product.images[0]}"
                      alt="${product.name}"
                      class="product-thumbnail"
                    />
                  ` : html`
                    <uui-icon name="icon-picture" class="no-image-icon"></uui-icon>
                  `}
                </uui-table-cell>
                <uui-table-cell>
                  <strong>${product.name}</strong>
                  ${product.description ? html`
                    <div class="product-description">${product.description}</div>
                  ` : ''}
                </uui-table-cell>
                <uui-table-cell style="width: 200px;">
                  <code class="slug">${product.slug || '-'}</code>
                </uui-table-cell>
                <uui-table-cell style="width: 120px;">
                  <span class="price">$${product.price?.toFixed(2) || '0.00'}</span>
                </uui-table-cell>
                <uui-table-cell style="width: 100px;">
                  <div class="stock-badge-wrapper">
                    <uui-badge
                      color="${(product.stockQuantity ?? 0) > 0 ? 'positive' : 'danger'}"
                      look="primary">
                      ${product.stockQuantity ?? 0}
                    </uui-badge>
                  </div>
                </uui-table-cell>
              </uui-table-row>
            `)}
          </uui-table-body>
        </uui-table>
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

    uui-table {
      width: 100%;
      display: table;
      table-layout: fixed;
    }

    uui-table-head {
      display: table-header-group;
    }

    uui-table-body {
      display: table-row-group;
    }

    uui-table-row {
      display: table-row;
    }

    uui-table-cell,
    uui-table-head-cell {
      display: table-cell;
      vertical-align: middle;
      padding: var(--uui-size-space-3);
      box-sizing: border-box;
    }

    uui-table-row > uui-table-cell:last-child {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stock-badge-wrapper {
      position: relative;
      display: inline-block;
    }

    .stock-badge-wrapper uui-badge {
      position: static !important;
      display: inline-block;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      gap: var(--uui-size-space-3);
    }

    .info-state,
    .error-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      text-align: center;
    }

    .info-state uui-icon,
    .empty-state uui-icon {
      font-size: 48px;
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    .error-state uui-icon {
      font-size: 48px;
      margin-bottom: var(--uui-size-space-4);
    }

    .info-state h3,
    .error-state h3,
    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .info-state p,
    .error-state p,
    .empty-state p {
      margin: 0 0 var(--uui-size-space-3) 0;
      color: var(--uui-color-text-alt);
    }

    .info-state ol {
      text-align: left;
      margin: var(--uui-size-space-3) 0;
      padding-left: var(--uui-size-space-5);
    }

    .info-state li {
      margin-bottom: var(--uui-size-space-2);
    }

    .error-state uui-button {
      margin-top: var(--uui-size-space-3);
    }

    .empty-state small {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-size-4);
    }

    .description {
      margin-bottom: var(--uui-size-space-4);
      color: var(--uui-color-text-alt);
    }

    uui-table {
      width: 100%;
    }

    .product-thumbnail {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: var(--uui-border-radius);
      border: 1px solid var(--uui-color-border);
    }

    .no-image-icon {
      font-size: 32px;
      color: var(--uui-color-text-alt);
    }

    .product-description {
      font-size: var(--uui-size-4);
      color: var(--uui-color-text-alt);
      margin-top: var(--uui-size-space-1);
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .slug {
      font-family: monospace;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface-alt);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .price {
      font-weight: 500;
    }
  `;
}

customElements.define('ecomm-products-workspace-view', ECommProductsWorkspaceView);

export default ECommProductsWorkspaceView;
