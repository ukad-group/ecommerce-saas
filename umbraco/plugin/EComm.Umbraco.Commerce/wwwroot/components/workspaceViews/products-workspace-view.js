import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';

class ECommProductsWorkspaceView extends UmbElementMixin(LitElement) {
  static properties = {
    categoryId: { type: String },
    products: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
    defaultAliases: { type: Object },
    expandedProductId: { type: String },
    editedProduct: { type: Object },
    editedVariantId: { type: String },
    saving: { type: Boolean },
    saveSuccess: { type: String },
    validationErrors: { type: Object },
    currentUser: { type: Object }
  };

  constructor() {
    super();
    this.categoryId = null;
    this.products = [];
    this.loading = false;
    this.error = null;
    this.defaultAliases = null;
    this.expandedProductId = null;
    this.editedProduct = null;
    this.editedVariantId = null;
    this.saving = false;
    this.saveSuccess = null;
    this.validationErrors = {};
    this.currentUser = null;

    // Consume auth context for API calls
    this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
      this._authContext = authContext;
    });

    // Consume current user context
    this.consumeContext(UMB_CURRENT_USER_CONTEXT, (currentUserContext) => {
      if (currentUserContext?.currentUser) {
        this.observe(currentUserContext.currentUser, (user) => {
          this.currentUser = user;
        });
      }
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

            // Extract categoryId from data.values array using dynamic alias
            let newCategoryId = null;
            if (data.values && Array.isArray(data.values)) {
              const aliasToUse = this.defaultAliases?.categoryIdPropertyAlias || 'categoryId';
              const categoryIdProp = data.values.find(v => v?.alias === aliasToUse);
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

  connectedCallback() {
    super.connectedCallback();
    this.loadDefaultAliases();
  }

  async loadDefaultAliases() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        '/umbraco/management/api/ecomm-commerce/settings/defaults',
        {
          headers: headers,
          credentials: 'include'
        }
      );

      if (response.ok) {
        this.defaultAliases = await response.json();
      }
    } catch (err) {
      console.error('Failed to load default aliases:', err);
      // Use hardcoded fallbacks if fetch fails
      this.defaultAliases = {
        categoryPageAlias: 'categoryPage',
        categoryIdPropertyAlias: 'categoryId'
      };
    }
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

  toggleProductEdit(product) {
    if (this.expandedProductId === product.id) {
      // Collapse if already editing
      this.expandedProductId = null;
      this.editedProduct = null;
      this.editedVariantId = null;
      this.validationErrors = {};
      this.saveSuccess = null;
    } else {
      // Expand and create editable copy
      this.expandedProductId = product.id;
      this.editedProduct = { ...product };
      this.editedVariantId = null;
      this.validationErrors = {};
      this.saveSuccess = null;
      this.error = null;
    }
  }

  toggleVariantEdit(variant) {
    if (this.editedVariantId === variant.id) {
      // Collapse if already editing
      this.editedVariantId = null;
      this.validationErrors = {};
      this.saveSuccess = null;
    } else {
      // Expand and set as editing
      this.editedVariantId = variant.id;
      this.validationErrors = {};
      this.saveSuccess = null;
      this.error = null;
    }
  }

  handleProductInput(field, value) {
    this.editedProduct = {
      ...this.editedProduct,
      [field]: value
    };

    // Clear validation error for this field
    if (this.validationErrors[field]) {
      this.validationErrors = {
        ...this.validationErrors,
        [field]: null
      };
    }
  }

  validateProduct() {
    const errors = {};

    if (!this.editedProduct.name || this.editedProduct.name.trim() === '') {
      errors.name = 'Name is required';
    }

    // For products with variants, skip master product price/stock validation
    if (!this.editedProduct.hasVariants) {
      if (this.editedProduct.price == null || this.editedProduct.price < 0) {
        errors.price = 'Valid price is required';
      }

      if (this.editedProduct.stockQuantity == null || this.editedProduct.stockQuantity < 0) {
        errors.stockQuantity = 'Stock quantity must be 0 or greater';
      }
    } else {
      // Validate all variants if product has variants
      if (this.editedProduct.variants && this.editedProduct.variants.length > 0) {
        this.editedProduct.variants.forEach(variant => {
          const variantErrors = this.validateVariant(variant);
          Object.assign(errors, variantErrors);
        });
      }
    }

    this.validationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  async saveProduct() {
    if (!this.validateProduct()) {
      this.error = 'Please fix validation errors';
      return;
    }

    this.saving = true;
    this.error = null;
    this.saveSuccess = null;

    try {
      const headers = await this.getAuthHeaders();

      // Get current user from current user context
      let userName = 'system';

      if (this.currentUser) {
        // Use email as primary identifier
        userName = this.currentUser.email || this.currentUser.name || this.currentUser.userName || 'system';
      }

      // Set version creator on the product
      const productToSave = {
        ...this.editedProduct,
        versionCreatedBy: userName
      };

      const response = await fetch(
        `/umbraco/management/api/ecomm-commerce/products/${this.editedProduct.id}`,
        {
          method: 'PUT',
          headers: headers,
          credentials: 'include',
          body: JSON.stringify({
            product: productToSave,
            changeNotes: `Updated via Umbraco at ${new Date().toISOString()}`
          })
        }
      );

      if (response.ok) {
        const updated = await response.json();

        // Update product in local list
        this.products = this.products.map(p =>
          p.id === updated.id ? updated : p
        );

        this.saveSuccess = `Product updated successfully (v${updated.version})`;

        // Collapse edit form after 2 seconds
        setTimeout(() => {
          this.expandedProductId = null;
          this.editedProduct = null;
          this.saveSuccess = null;
        }, 2000);

      } else {
        const errorText = await response.text();
        this.error = `Failed to save: ${errorText || response.statusText}`;
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      this.error = 'Failed to save product: ' + err.message;
    } finally {
      this.saving = false;
    }
  }

  cancelEdit() {
    this.expandedProductId = null;
    this.editedProduct = null;
    this.editedVariantId = null;
    this.validationErrors = {};
    this.saveSuccess = null;
    this.error = null;
  }

  handleVariantInput(variantId, field, value) {
    if (!this.editedProduct || !this.editedProduct.variants) return;

    const variantIndex = this.editedProduct.variants.findIndex(v => v.id === variantId);
    if (variantIndex === -1) return;

    const updatedVariants = [...this.editedProduct.variants];
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      [field]: value
    };

    this.editedProduct = {
      ...this.editedProduct,
      variants: updatedVariants
    };

    // Clear validation error for this field
    const errorKey = `variant_${variantId}_${field}`;
    if (this.validationErrors[errorKey]) {
      this.validationErrors = {
        ...this.validationErrors,
        [errorKey]: null
      };
    }
  }

  validateVariant(variant) {
    const errors = {};

    if (variant.price == null || variant.price < 0) {
      errors[`variant_${variant.id}_price`] = 'Valid price is required';
    }

    if (variant.stockQuantity == null || variant.stockQuantity < 0) {
      errors[`variant_${variant.id}_stockQuantity`] = 'Stock quantity must be 0 or greater';
    }

    return errors;
  }

  formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  renderProductRow(product) {
    const isExpanded = this.expandedProductId === product.id;

    return html`
      <uui-table-row
        @click=${() => this.toggleProductEdit(product)}
        class="product-row ${isExpanded ? 'expanded' : ''}">

        <!-- Image -->
        <uui-table-cell style="width: 80px;">
          ${product.images?.length > 0 ? html`
            <img src="${product.images[0]}" alt="${product.name}" class="product-thumbnail" />
          ` : html`
            <uui-icon name="icon-picture" class="no-image-icon"></uui-icon>
          `}
        </uui-table-cell>

        <!-- Name -->
        <uui-table-cell>
          <strong>${product.name}</strong>
          ${product.hasVariants ? html`
            <uui-badge color="default" look="outline" style="margin-left: 8px;">
              ${product.variants?.length || 0} variants
            </uui-badge>
          ` : ''}
        </uui-table-cell>

        <!-- SKU -->
        <uui-table-cell style="width: 150px;">
          <code class="sku">${product.hasVariants ? 'See variants' : (product.sku || '-')}</code>
        </uui-table-cell>

        <!-- Price -->
        <uui-table-cell style="width: 120px;">
          ${product.hasVariants ? html`<span class="price">Varies</span>` : html`<span class="price">$${product.price?.toFixed(2) || '0.00'}</span>`}
        </uui-table-cell>

        <!-- Stock -->
        <uui-table-cell style="width: 100px;">
          ${product.hasVariants ? html`
            <span class="price">Varies</span>
          ` : html`
            <div class="stock-badge-wrapper">
              <uui-badge color="${(product.stockQuantity ?? 0) > 0 ? 'positive' : 'danger'}" look="primary">
                ${product.stockQuantity ?? 0}
              </uui-badge>
            </div>
          `}
        </uui-table-cell>

        <!-- Status -->
        <uui-table-cell style="width: 100px;">
          <div class="status-badge-wrapper">
            <uui-badge color="${product.status === 'active' ? 'positive' : 'default'}" look="primary">
              ${product.status || 'active'}
            </uui-badge>
          </div>
        </uui-table-cell>

        <!-- Version -->
        <uui-table-cell style="width: 80px;">
          <small>v${product.version || 1}</small>
        </uui-table-cell>
      </uui-table-row>

      ${isExpanded ? (product.hasVariants ? this.renderVariantsSection(product) : this.renderEditForm(product)) : ''}
    `;
  }

  renderVariantsSection(product) {
    return html`
      <tr class="variants-section-row">
        <td colspan="7" @click=${(e) => e.stopPropagation()}>
          <div class="variants-container">
            <h4>Product Variants</h4>
            <p class="variant-info">This product has ${product.variants?.length || 0} variants. Edit individual variant prices and stock below.</p>

            ${this.saveSuccess ? html`
              <uui-badge color="positive" look="primary" class="save-success">
                ${this.saveSuccess}
              </uui-badge>
            ` : ''}

            ${this.error ? html`
              <uui-badge color="danger" look="primary" class="save-error">
                ${this.error}
              </uui-badge>
            ` : ''}

            <!-- Version Info -->
            <div class="version-info">
              <small>
                <strong>Version:</strong> ${product.version || 1} |
                <strong>Last Updated:</strong> ${this.formatDate(product.updatedAt)} |
                <strong>Updated By:</strong> ${product.versionCreatedBy || 'System'}
              </small>
            </div>

            <div class="variants-list">
              ${product.variants?.map(variant => this.renderVariantRow(variant))}
            </div>

            <div class="button-group">
              <uui-button
                look="secondary"
                @click=${this.cancelEdit}>
                Close
              </uui-button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  renderVariantRow(variant) {
    const isEditing = this.editedVariantId === variant.id;
    const optionsText = Object.entries(variant.options || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    return html`
      <div class="variant-row ${isEditing ? 'editing' : ''}" @click=${() => this.toggleVariantEdit(variant)}>
        <div class="variant-header">
          <div class="variant-options">
            <uui-icon name="icon-box"></uui-icon>
            <strong>${optionsText}</strong>
            ${variant.isDefault ? html`<uui-badge color="positive" look="outline">Default</uui-badge>` : ''}
          </div>
          <div class="variant-summary">
            <span class="variant-sku">${variant.sku}</span>
            <span class="variant-price">$${variant.price?.toFixed(2)}</span>
            <uui-badge color="${variant.stockQuantity > 0 ? 'positive' : 'danger'}" look="primary">
              Stock: ${variant.stockQuantity}
            </uui-badge>
            <uui-badge color="${variant.status === 'active' ? 'positive' : 'default'}" look="primary">
              ${variant.status}
            </uui-badge>
          </div>
        </div>

        ${isEditing ? this.renderVariantEditForm(variant) : ''}
      </div>
    `;
  }

  renderVariantEditForm(variant) {
    return html`
      <div class="variant-edit-form" @click=${(e) => e.stopPropagation()}>
        <div class="edit-form-grid">
          <!-- Price -->
          <div class="form-group">
            <uui-label for="variant-price-${variant.id}" required>Price</uui-label>
            <uui-input
              id="variant-price-${variant.id}"
              type="number"
              step="0.01"
              .value=${String(variant.price || '')}
              @input=${(e) => this.handleVariantInput(variant.id, 'price', parseFloat(e.target.value))}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.validationErrors[`variant_${variant.id}_price`] ? html`
              <small class="error-text">${this.validationErrors[`variant_${variant.id}_price`]}</small>
            ` : ''}
          </div>

          <!-- Stock -->
          <div class="form-group">
            <uui-label for="variant-stock-${variant.id}" required>Stock Quantity</uui-label>
            <uui-input
              id="variant-stock-${variant.id}"
              type="number"
              .value=${String(variant.stockQuantity ?? '')}
              @input=${(e) => this.handleVariantInput(variant.id, 'stockQuantity', parseInt(e.target.value))}
              ?disabled=${this.saving}
              required>
            </uui-input>
            ${this.validationErrors[`variant_${variant.id}_stockQuantity`] ? html`
              <small class="error-text">${this.validationErrors[`variant_${variant.id}_stockQuantity`]}</small>
            ` : ''}
          </div>

          <!-- Status -->
          <div class="form-group">
            <uui-label for="variant-status-${variant.id}">Status</uui-label>
            <select
              id="variant-status-${variant.id}"
              class="variant-status-select"
              .value=${variant.status || 'active'}
              @change=${(e) => this.handleVariantInput(variant.id, 'status', e.target.value)}
              ?disabled=${this.saving}>
              <option value="active" ?selected=${variant.status === 'active'}>Active</option>
              <option value="inactive" ?selected=${variant.status === 'inactive'}>Inactive</option>
            </select>
          </div>
        </div>

        <div class="button-group">
          <uui-button
            look="secondary"
            @click=${() => this.toggleVariantEdit(variant)}
            ?disabled=${this.saving}>
            Cancel
          </uui-button>

          <uui-button
            look="primary"
            color="positive"
            @click=${() => this.saveProduct()}
            ?disabled=${this.saving}>
            ${this.saving ? 'Saving...' : 'Save Variant'}
          </uui-button>
        </div>
      </div>
    `;
  }

  renderEditForm(originalProduct) {
    return html`
      <tr class="edit-form-row">
        <td colspan="7" @click=${(e) => e.stopPropagation()}>
          <div class="edit-form-container">

            ${this.saveSuccess ? html`
              <uui-badge color="positive" look="primary" class="save-success">
                ${this.saveSuccess}
              </uui-badge>
            ` : ''}

            ${this.error ? html`
              <uui-badge color="danger" look="primary" class="save-error">
                ${this.error}
              </uui-badge>
            ` : ''}

            <div class="edit-form-grid">

              <!-- Name -->
              <div class="form-group">
                <uui-label for="product-name" required>Name</uui-label>
                <uui-input
                  id="product-name"
                  .value=${this.editedProduct.name}
                  @input=${(e) => this.handleProductInput('name', e.target.value)}
                  ?disabled=${this.saving}
                  required>
                </uui-input>
                ${this.validationErrors.name ? html`
                  <small class="error-text">${this.validationErrors.name}</small>
                ` : ''}
              </div>

              <!-- Price -->
              <div class="form-group">
                <uui-label for="product-price" required>Price</uui-label>
                <uui-input
                  id="product-price"
                  type="number"
                  step="0.01"
                  .value=${String(this.editedProduct.price || '')}
                  @input=${(e) => this.handleProductInput('price', parseFloat(e.target.value))}
                  ?disabled=${this.saving}
                  required>
                </uui-input>
                ${this.validationErrors.price ? html`
                  <small class="error-text">${this.validationErrors.price}</small>
                ` : ''}
              </div>

              <!-- Stock -->
              <div class="form-group">
                <uui-label for="product-stock" required>Stock Quantity</uui-label>
                <uui-input
                  id="product-stock"
                  type="number"
                  .value=${String(this.editedProduct.stockQuantity ?? '')}
                  @input=${(e) => this.handleProductInput('stockQuantity', parseInt(e.target.value))}
                  ?disabled=${this.saving}
                  required>
                </uui-input>
                ${this.validationErrors.stockQuantity ? html`
                  <small class="error-text">${this.validationErrors.stockQuantity}</small>
                ` : ''}
              </div>

              <!-- Status -->
              <div class="form-group">
                <uui-label for="product-status">Status</uui-label>
                <uui-select
                  id="product-status"
                  .value=${this.editedProduct.status || 'active'}
                  @change=${(e) => this.handleProductInput('status', e.target.value)}
                  ?disabled=${this.saving}>
                  <option value="active" ?selected=${this.editedProduct.status === 'active'}>Active</option>
                  <option value="inactive" ?selected=${this.editedProduct.status === 'inactive'}>Inactive</option>
                  <option value="draft" ?selected=${this.editedProduct.status === 'draft'}>Draft</option>
                </uui-select>
              </div>

              <!-- Description (full width) -->
              <div class="form-group full-width">
                <uui-label for="product-description">Description</uui-label>
                <textarea
                  id="product-description"
                  class="description-textarea"
                  .value=${this.editedProduct.description || ''}
                  @input=${(e) => this.handleProductInput('description', e.target.value)}
                  ?disabled=${this.saving}
                  rows="3"
                  placeholder="Product description..."></textarea>
              </div>

            </div>

            <!-- Version Info -->
            <div class="version-info">
              <small>
                <strong>Version:</strong> ${originalProduct.version || 1} |
                <strong>Last Updated:</strong> ${this.formatDate(originalProduct.updatedAt)} |
                <strong>Updated By:</strong> ${originalProduct.versionCreatedBy || 'System'}
              </small>
            </div>

            <!-- Action Buttons -->
            <div class="button-group">
              <uui-button
                look="secondary"
                @click=${this.cancelEdit}
                ?disabled=${this.saving}>
                Cancel
              </uui-button>

              <uui-button
                look="primary"
                color="positive"
                @click=${this.saveProduct}
                ?disabled=${this.saving}>
                ${this.saving ? 'Saving...' : 'Save Changes'}
              </uui-button>
            </div>

          </div>
        </td>
      </tr>
    `;
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
            <uui-table-head-cell style="width: 150px;">SKU</uui-table-head-cell>
            <uui-table-head-cell style="width: 120px;">Price</uui-table-head-cell>
            <uui-table-head-cell style="width: 100px;">Stock</uui-table-head-cell>
            <uui-table-head-cell style="width: 100px;">Status</uui-table-head-cell>
            <uui-table-head-cell style="width: 80px;">Version</uui-table-head-cell>
          </uui-table-head>

          <uui-table-body>
            ${this.products.map(product => this.renderProductRow(product))}
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
      border-collapse: collapse;
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

    /* Center Stock, Status, and Version columns */
    uui-table-head-cell:nth-child(5),
    uui-table-head-cell:nth-child(6),
    uui-table-head-cell:nth-child(7),
    uui-table-row > uui-table-cell:nth-child(5),
    uui-table-row > uui-table-cell:nth-child(6),
    uui-table-row > uui-table-cell:nth-child(7) {
      text-align: center;
    }

    /* Right-align Price column */
    uui-table-head-cell:nth-child(4),
    uui-table-row > uui-table-cell:nth-child(4) {
      text-align: right;
    }

    uui-table-row > uui-table-cell:nth-child(6) uui-badge,
    uui-table-row > uui-table-cell:nth-child(7) > * {
      position: static !important;
      display: inline-block !important;
      margin: 0 auto;
    }

    .stock-badge-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
    }

    .stock-badge-wrapper uui-badge {
      position: static !important;
      display: inline-flex;
      align-items: center;
    }

    .status-badge-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
    }

    .status-badge-wrapper uui-badge {
      display: inline-flex;
      align-items: center;
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

    .sku {
      font-family: monospace;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface-alt);
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--uui-color-border);
      display: inline-block;
    }

    .price {
      font-weight: 500;
    }

    .product-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .product-row:hover {
      background-color: var(--uui-color-surface-alt);
    }

    .product-row.expanded {
      background-color: var(--uui-color-surface-alt);
      box-shadow: inset 0 0 0 1px var(--uui-color-border);
    }

    .edit-form-row {
      background-color: var(--uui-color-surface);
    }

    .edit-form-container {
      padding: var(--uui-size-space-5);
      border-top: 1px solid var(--uui-color-border);
    }

    .edit-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .edit-form-grid .form-group {
      display: flex;
      flex-direction: column;
    }

    .edit-form-grid .form-group.full-width {
      grid-column: 1 / -1;
    }

    .edit-form-grid uui-label {
      margin-bottom: var(--uui-size-space-1);
    }

    .edit-form-grid uui-input,
    .edit-form-grid uui-select {
      width: 100%;
    }

    .description-textarea {
      width: 100%;
      padding: var(--uui-size-space-2);
      font-family: inherit;
      font-size: var(--uui-size-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      resize: vertical;
    }

    .description-textarea:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .error-text {
      color: var(--uui-color-danger);
      font-size: var(--uui-size-3);
      margin-top: var(--uui-size-space-1);
    }

    .version-info {
      margin: var(--uui-size-space-4) 0;
      padding: var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
    }

    .version-info small {
      color: var(--uui-color-text-alt);
    }

    .save-success,
    .save-error {
      margin-bottom: var(--uui-size-space-4);
    }

    /* Variant styles */
    .variants-section-row {
      background-color: var(--uui-color-surface);
    }

    .variants-container {
      padding: var(--uui-size-space-5);
      border-top: 1px solid var(--uui-color-border);
    }

    .variants-container h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .variant-info {
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-4);
    }

    .variants-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-4);
    }

    .variant-row {
      padding: var(--uui-size-space-3);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface-alt);
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .variant-row:hover {
      background: var(--uui-color-surface);
    }

    .variant-row.editing {
      background: var(--uui-color-surface-alt);
      border-color: var(--uui-color-border);
      box-shadow: inset 0 0 0 1px var(--uui-color-border);
    }

    .variant-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .variant-options {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .variant-options uui-icon {
      color: var(--uui-color-text-alt);
    }

    .variant-summary {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .variant-sku {
      font-family: monospace;
      font-size: var(--uui-size-4);
      background: var(--uui-color-surface);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .variant-price {
      font-weight: 500;
    }

    .variant-edit-form {
      margin-top: var(--uui-size-space-4);
      padding-top: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
    }

    .variant-status-select {
      width: 100%;
      padding: var(--uui-size-space-2);
      font-family: inherit;
      font-size: var(--uui-size-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: var(--uui-color-surface);
      color: var(--uui-color-text);
    }

    .variant-status-select:focus {
      outline: 2px solid var(--uui-color-focus);
      outline-offset: 2px;
    }

    .variant-status-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
}

customElements.define('ecomm-products-workspace-view', ECommProductsWorkspaceView);

export default ECommProductsWorkspaceView;
