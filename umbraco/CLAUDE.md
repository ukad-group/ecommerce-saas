# Umbraco eCommerce Plugin - Architecture & Implementation Guide

## Overview

This document outlines the architecture and implementation plan for an Umbraco plugin that integrates with the headless eCommerce SaaS platform. The plugin enables Umbraco sites to leverage the eCommerce API while maintaining full content management control in Umbraco.

**Target Umbraco Version**: 14+ (Bellissima - Modern backoffice with Lit/Web Components)

**Last Updated**: 2025-11-21

---

## Project Structure

```
/umbraco/
├── CLAUDE.md                    # This file - Architecture and planning
├── plugin/                      # Plugin package project (future)
│   └── YourBrand.Umbraco.Commerce/
└── sample-site/                 # Sample Umbraco site for testing (future)
    └── YourBrand.Commerce.Demo/
```

---

## Core Concept: Category Mirror Structure

### The Approach

The plugin creates a **1:1 mirror** of the eCommerce category structure in Umbraco's content tree:

```
Umbraco Content Tree              eCommerce API
═══════════════════════════════   ══════════════════════
Home
└── Shop
    ├── Electronics [Category]  →  Maps to "electronics-123"
    │   └── Product [Template]  →  Renders ANY product from category
    ├── Clothing [Category]     →  Maps to "clothing-456"
    │   └── Product [Template]  →  Renders ANY product from category
    └── Books [Category]        →  Maps to "books-789"
        └── Product [Template]  →  Renders ANY product from category
```

### How It Works

1. **Category Nodes**: Each Umbraco category node maps to a specific eCommerce category
2. **Product Template Node**: Each category has ONE generic "Product" node
3. **Dynamic Routing**: Product URLs are handled by routing logic
4. **Single Template**: The Product template dynamically renders ANY product from that category

### URL Structure

```
/shop/electronics              → Category listing page (Umbraco node)
/shop/electronics/product      → Product template node (visible in tree)
/shop/electronics/laptop-xyz   → Dynamic product page (uses Product template)
/shop/electronics/mouse-abc    → Dynamic product page (uses Product template)
```

---

## Architecture Decisions

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Umbraco CMS** | Umbraco CMS | 14.x+ |
| **Backoffice UI** | Lit (Web Components) | Latest |
| **Backend** | .NET | 8+ |
| **API Client** | HttpClient | Built-in |
| **Package Distribution** | NuGet | - |

### Why Umbraco 14+?

- Modern, future-proof architecture
- Web Components (Lit) replace legacy AngularJS
- Better TypeScript support
- Improved performance and developer experience
- Active development and long-term support

---

## Plugin Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                   Umbraco Backoffice                    │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Settings Panel │  │  Category    │  │  Dashboard  │ │
│  │  (Lit)         │  │  Picker (Lit)│  │  (Lit)      │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Plugin Backend (.NET Controllers)          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Settings     │  │  Category    │  │   Product   │ │
│  │   Service      │  │  API Proxy   │  │   Routing   │ │
│  └────────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│              eCommerce API (EComm.Api)                  │
│   /api/v1/tenants/{tenantId}/markets/{marketId}/...    │
└─────────────────────────────────────────────────────────┘
```

### Plugin Structure

```
YourBrand.Umbraco.Commerce/
├── App_Plugins/
│   └── YourBrandCommerce/
│       ├── manifest.ts                    # Package manifest (Umbraco 14)
│       ├── components/
│       │   ├── settings/
│       │   │   ├── settings-dashboard.element.ts
│       │   │   └── settings-dashboard.element.css
│       │   ├── propertyEditors/
│       │   │   ├── category-picker.element.ts
│       │   │   ├── category-picker-config.element.ts
│       │   │   └── category-picker.element.css
│       │   └── dashboards/
│       │       ├── commerce-dashboard.element.ts
│       │       └── commerce-dashboard.element.css
│       └── lang/
│           └── en-us.json
├── Controllers/
│   ├── CommerceSettingsApiController.cs   # Settings CRUD
│   ├── CategoryPickerApiController.cs     # Fetch categories
│   └── ProductRouteController.cs          # Handle product URLs
├── Services/
│   ├── ICommerceSettingsService.cs
│   ├── CommerceSettingsService.cs         # Settings management
│   ├── ICommerceApiClient.cs
│   └── CommerceApiClient.cs               # HTTP client to eCommerce API
├── ContentFinders/
│   └── ProductContentFinder.cs            # Product URL routing
├── Models/
│   ├── CommerceSettings.cs                # Settings model
│   ├── Category.cs                        # Category DTO
│   └── Product.cs                         # Product DTO
├── DocumentTypes/
│   ├── CategoryPageDocumentType.cs        # Category node definition
│   └── ProductPageDocumentType.cs         # Product template definition
├── Composers/
│   └── CommerceComposer.cs                # DI registration
└── YourBrand.Umbraco.Commerce.csproj
```

---

## Key Features

### 1. Dynamic Configuration Panel

**Problem Solved**: No redeployment needed for config changes.

**Implementation**: Settings dashboard in Umbraco backoffice (Settings section).

**Stored Settings**:
```json
{
  "apiBaseUrl": "https://api.yourplatform.com/api/v1",
  "tenantId": "tenant-a",
  "marketId": "market-1",
  "apiKey": "your-api-key"
}
```

**Storage Location**: Umbraco database (key-value table or custom table)

**Features**:
- Live editing in backoffice
- "Test Connection" button to validate settings
- Secure API key storage
- No web.config changes required

### 2. Category Picker Property Editor

**Purpose**: Allow editors to select an eCommerce category for each Umbraco category node.

**UI**: Dropdown populated from eCommerce API (fetches categories from configured tenant/market)

**Example Usage**:
```
Category Node: "Electronics"
├── Property: Category (Category Picker)
│   └── Selected: "electronics-123" (from API)
├── Property: Description (Rich Text)
└── Property: Banner Image (Media Picker)
```

### 3. Product URL Routing

**Custom Content Finder** intercepts product URLs and routes them to the Product template node.

**Flow**:
1. User visits `/shop/electronics/laptop-xyz`
2. Content Finder detects this is a product URL
3. Finds parent category node (`/shop/electronics`)
4. Reads `CategoryId` property from category node
5. Fetches product from eCommerce API by slug
6. Routes to Product template node with product data
7. Template renders product using API data + Umbraco layout

**Implementation** (Pseudocode):
```csharp
public class ProductContentFinder : IContentFinder
{
    public bool TryFindContent(IPublishedRequestBuilder request)
    {
        var path = request.Uri.GetAbsolutePathDecoded();
        // Parse: /shop/electronics/laptop-xyz

        // 1. Find category node (/shop/electronics)
        var categoryNode = FindCategoryNode(path);

        // 2. Check if has Product template child
        var productTemplate = categoryNode.Children
            .FirstOrDefault(x => x.ContentType.Alias == "productPage");

        // 3. Extract product slug (laptop-xyz)
        var productSlug = GetProductSlug(path);

        // 4. Fetch product from API
        var categoryId = categoryNode.Value<string>("categoryId");
        var product = _apiClient.GetProductBySlug(categoryId, productSlug);

        // 5. Route to product template
        request.SetPublishedContent(productTemplate);
        request.SetRouteValues(new { product });

        return true;
    }
}
```

### 4. Document Types (Content Types)

#### **Category Page**
```
Alias: categoryPage
Allowed Templates: CategoryPage
Properties:
- categoryId (Category Picker) - Maps to eCommerce category
- description (Rich Text Editor) - Category description/SEO
- bannerImage (Media Picker) - Category banner
- productsPerPage (Numeric) - Pagination settings
- productLayout (Dropdown) - Grid/List view option

Allowed Child Types: categoryPage, productPage
```

#### **Product Page** (Template Node)
```
Alias: productPage
Allowed Templates: ProductPage
Properties:
- seoOverrides (Composition) - Optional SEO overrides
- relatedContent (Content Picker) - Link to blog posts etc.
- productLayout (Dropdown) - Layout variations

Allowed Child Types: None
Allowed At Root: false
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create plugin project structure
- [ ] Implement CommerceSettings model and service (database storage)
- [ ] Build Settings Dashboard (Lit component)
- [ ] Create CommerceApiClient service
- [ ] Implement "Test Connection" functionality
- [ ] Basic error handling and logging

**Deliverable**: Admin can configure API settings in Umbraco backoffice

### Phase 2: Content Integration (Week 3-4)
- [ ] Create Category Picker property editor (Lit component)
- [ ] Implement category fetching from API
- [ ] Create Category Page and Product Page document types
- [ ] Build category listing template
- [ ] Basic styling and layout

**Deliverable**: Editors can create category nodes and map to eCommerce categories

### Phase 3: Product Routing (Week 5-6)
- [ ] Implement ProductContentFinder
- [ ] Create product detail template
- [ ] Add product data fetching by slug
- [ ] Handle 404s for non-existent products
- [ ] Implement caching strategy

**Deliverable**: Product pages render dynamically with eCommerce data

### Phase 4: Polish & Features (Week 7-8)
- [ ] Add Commerce Dashboard (order stats, quick links)
- [ ] Implement cart integration (if needed)
- [ ] Add image optimization/CDN support
- [ ] Performance optimization and caching
- [ ] Documentation and sample site
- [ ] Unit tests

**Deliverable**: Production-ready plugin package

---

## Technical Specifications

### Modern Umbraco 14 Property Editor (Lit)

**Example: Category Picker Element**

```typescript
// category-picker.element.ts
import { LitElement, html, css, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';

@customElement('commerce-category-picker')
export class CommerceCategoryPickerElement extends UmbElementMixin(LitElement) {
    @property({ type: String })
    value?: string;

    @state()
    private _categories: Array<{ id: string; name: string }> = [];

    @state()
    private _loading = false;

    connectedCallback() {
        super.connectedCallback();
        this.loadCategories();
    }

    async loadCategories() {
        this._loading = true;
        try {
            const response = await fetch('/umbraco/backoffice/api/commerce/categories');
            this._categories = await response.json();
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            this._loading = false;
        }
    }

    handleChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        this.value = select.value;
        this.dispatchEvent(new CustomEvent('property-value-change', {
            detail: { value: this.value }
        }));
    }

    render() {
        if (this._loading) {
            return html`<uui-loader></uui-loader>`;
        }

        return html`
            <uui-select
                .value=${this.value}
                @change=${this.handleChange}
                label="Select Category">
                <option value="">-- Select a category --</option>
                ${this._categories.map(cat => html`
                    <option value=${cat.id}>${cat.name}</option>
                `)}
            </uui-select>
        `;
    }

    static styles = css`
        :host {
            display: block;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        'commerce-category-picker': CommerceCategoryPickerElement;
    }
}
```

**Manifest Registration** (manifest.ts):

```typescript
import { ManifestPropertyEditorUi } from '@umbraco-cms/backoffice/extension-registry';

const propertyEditors: Array<ManifestPropertyEditorUi> = [
    {
        type: 'propertyEditorUi',
        alias: 'YourBrand.PropertyEditorUi.CategoryPicker',
        name: 'Commerce Category Picker',
        element: () => import('./components/propertyEditors/category-picker.element.js'),
        meta: {
            label: 'Category Picker',
            icon: 'icon-folder',
            group: 'commerce',
            propertyEditorSchemaAlias: 'Umbraco.Plain.String'
        }
    }
];

export const manifests = [...propertyEditors];
```

### Settings Service (.NET)

```csharp
public interface ICommerceSettingsService
{
    Task<CommerceSettings?> GetSettingsAsync();
    Task SaveSettingsAsync(CommerceSettings settings);
    Task<bool> TestConnectionAsync(CommerceSettings settings);
}

public class CommerceSettingsService : ICommerceSettingsService
{
    private readonly IKeyValueService _keyValueService;
    private readonly IHttpClientFactory _httpClientFactory;
    private const string SettingsKeyPrefix = "YourBrand.Commerce.";

    public CommerceSettingsService(
        IKeyValueService keyValueService,
        IHttpClientFactory httpClientFactory)
    {
        _keyValueService = keyValueService;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<CommerceSettings?> GetSettingsAsync()
    {
        var apiBaseUrl = await _keyValueService.GetValueAsync($"{SettingsKeyPrefix}ApiBaseUrl");
        var tenantId = await _keyValueService.GetValueAsync($"{SettingsKeyPrefix}TenantId");
        var marketId = await _keyValueService.GetValueAsync($"{SettingsKeyPrefix}MarketId");
        var apiKey = await _keyValueService.GetValueAsync($"{SettingsKeyPrefix}ApiKey");

        if (string.IsNullOrEmpty(apiBaseUrl))
            return null;

        return new CommerceSettings
        {
            ApiBaseUrl = apiBaseUrl,
            TenantId = tenantId ?? "",
            MarketId = marketId ?? "",
            ApiKey = apiKey ?? ""
        };
    }

    public async Task SaveSettingsAsync(CommerceSettings settings)
    {
        await _keyValueService.SetValueAsync($"{SettingsKeyPrefix}ApiBaseUrl", settings.ApiBaseUrl);
        await _keyValueService.SetValueAsync($"{SettingsKeyPrefix}TenantId", settings.TenantId);
        await _keyValueService.SetValueAsync($"{SettingsKeyPrefix}MarketId", settings.MarketId);
        await _keyValueService.SetValueAsync($"{SettingsKeyPrefix}ApiKey", settings.ApiKey);
    }

    public async Task<bool> TestConnectionAsync(CommerceSettings settings)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(settings.ApiBaseUrl);
            client.DefaultRequestHeaders.Add("X-Tenant-ID", settings.TenantId);
            client.DefaultRequestHeaders.Add("X-Market-ID", settings.MarketId);
            client.DefaultRequestHeaders.Add("X-API-Key", settings.ApiKey);

            var response = await client.GetAsync($"/tenants/{settings.TenantId}/markets");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
```

---

## Caching Strategy

### Why Caching Is Critical

- Reduce API calls to eCommerce backend
- Improve page load times
- Handle high traffic scenarios

### Cache Layers

1. **Memory Cache** (Short-term, per-request)
   - Category lists (5 minutes)
   - Product details (2 minutes)

2. **Distributed Cache** (Optional, for load-balanced setups)
   - Redis or SQL Server cache
   - Shared across web servers

3. **Output Cache** (Page-level)
   - Cache rendered HTML for anonymous users
   - Vary by product ID and query string

### Cache Invalidation

**Options**:
- **Time-based**: Simple TTL (good for MVP)
- **Event-based**: eCommerce API sends webhooks when products/categories change
- **Manual**: Admin dashboard button to clear cache

---

## Multi-Tenant Considerations

### Scenario: Multiple Umbraco Sites, One eCommerce Backend

```
Site A (UK Store)           ┐
- Tenant: tenant-uk         │
- Market: market-london     ├──→  Shared eCommerce API
                            │
Site B (US Store)           │
- Tenant: tenant-us         │
- Market: market-newyork    ┘
```

**Each Umbraco site** has its own settings (tenant/market) configured in the Settings Dashboard.

---

## Security Considerations

1. **API Key Storage**
   - Never store in web.config or appsettings.json
   - Use Umbraco database (encrypted at rest)
   - Consider Azure Key Vault for production

2. **Backoffice Authorization**
   - All API controllers require `[Authorize]` with backoffice policy
   - Only admins can access Settings Dashboard

3. **Frontend Security**
   - Don't expose API keys to client-side JavaScript
   - All API calls proxied through Umbraco backend

---

## Testing Strategy

### Unit Tests
- CommerceSettingsService
- CommerceApiClient
- ProductContentFinder routing logic

### Integration Tests
- Settings CRUD operations
- API communication with eCommerce API
- Category picker data loading

### E2E Tests (Manual/Automated)
- Create category node in Umbraco
- Select eCommerce category from picker
- View category listing page
- Navigate to product detail page
- Verify product data displays correctly

---

## Distribution & Installation

### NuGet Package

```xml
<PackageReference Include="YourBrand.Umbraco.Commerce" Version="1.0.0" />
```

### Installation Steps

1. Install NuGet package
2. Restart Umbraco site
3. Navigate to Settings → Commerce Settings
4. Configure API connection
5. Test connection
6. Create category and product document types (auto-installed)
7. Start building content tree

---

## Future Enhancements

### Phase 2 Features (Post-MVP)
- [ ] Cart management UI in backoffice
- [ ] Order dashboard with charts
- [ ] Product search integration
- [ ] Multi-language support
- [ ] Variant picker property editor
- [ ] Stock level indicators
- [ ] Price rule visualization

### Advanced Features
- [ ] Real-time inventory sync
- [ ] Webhook handlers for product updates
- [ ] Automated category tree sync
- [ ] A/B testing integration
- [ ] Personalization engine
- [ ] Analytics integration

---

## Questions & Decisions Log

### Q: Should categories auto-sync from eCommerce API?
**Decision**: No, manual for MVP. Editors create category nodes and map them. Auto-sync can be Phase 2.

### Q: How to handle product images?
**Decision**: Fetch from eCommerce API (via CDN URLs). Don't duplicate in Umbraco Media Library.

### Q: What if product doesn't exist?
**Decision**: ProductContentFinder returns false → Umbraco shows 404 page.

### Q: Support for product variants?
**Decision**: Phase 2. MVP assumes simple products only.

---

## Resources & References

- [Umbraco 14 Documentation](https://docs.umbraco.com/umbraco-cms/fundamentals/backoffice/extension-types)
- [Lit Web Components](https://lit.dev/)
- [Umbraco Property Editors](https://docs.umbraco.com/umbraco-cms/extending/property-editors)
- [Content Finders](https://docs.umbraco.com/umbraco-cms/reference/routing/request-pipeline/icontentfinder)

---

## Contact & Collaboration

This is an evolving document. As implementation progresses, update this file with:
- Actual code samples
- Lessons learned
- Architecture refinements
- Performance metrics

**Next Steps**: Begin Phase 1 implementation when ready.

---

**Document Version**: 1.0
**Status**: Planning / Architecture Design
**Next Review**: After Phase 1 completion
