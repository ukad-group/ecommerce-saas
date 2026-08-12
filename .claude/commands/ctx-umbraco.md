Review Umbraco CMS plugin implementation before proceeding.

## Umbraco Plugin Context

**Status**: Umbraco 17 (.NET 10) integration - Plugin implemented, Static assets working. Now includes a real cart/checkout with Nets Easy payments, and a full "Commerce" backoffice section (Orders, Carts, Discounts, Currencies, Countries, Order Statuses, Property Templates, Analytics)

### Overview
Umbraco CMS plugin that integrates the eCommerce SaaS platform into Umbraco's content management system. Enables editors to link categories and products from the eCommerce API into Umbraco content nodes.

### Architecture
- **Umbraco Version**: 17.0.0 (LTS) with .NET 10
- **Plugin Type**: Razor Class Library (RCL) with Bellissima backoffice extensions
- **UI Framework**: Lit web components (Umbraco's native framework)
- **Integration Pattern**: Content finders + property editors + dashboards

### Project Structure
```
umbraco/
├── plugin/
│   └── EComm.Umbraco.Commerce/           # Plugin project (RCL)
│       ├── Composers/
│       │   └── CommerceComposer.cs       # DI registration, content finders
│       ├── ContentFinders/
│       │   └── ProductContentFinder.cs   # Dynamic product URL routing
│       ├── Controllers/
│       │   ├── CommerceSettingsApiController.cs  # Settings CRUD
│       │   ├── CategoryPickerApiController.cs    # Category/product proxy + picker endpoints
│       │   └── CommerceAdminApiController.cs     # Commerce Admin backoffice API (orders, carts, discounts, etc.)
│       ├── Migrations/
│       │   ├── CommerceMigrationHandler.cs             # Runs migrations on startup
│       │   └── AddCommerceSectionToAdminGroupMigration.cs  # Grants Admins the "Commerce" section
│       ├── Services/
│       │   ├── ICommerceApiClient.cs     # eCommerce API client interface
│       │   ├── CommerceApiClient.cs      # HTTP client with caching
│       │   ├── ICommerceSettingsService.cs
│       │   └── CommerceSettingsService.cs # Settings persistence
│       ├── Models/
│       │   ├── CommerceSettings.cs       # TenantId, API config, document type aliases
│       │   ├── Category.cs, Product.cs, ProductVariant.cs, ProductListResult.cs
│       │   ├── CartModels.cs, OrderModels.cs   # Real cart/order data for backoffice + storefront
│       │   ├── Country.cs, Discount.cs, LeasingPeriod.cs, ShippingMethod.cs, PropertyTemplate.cs
│       │   └── FlexibleDateTimeConverter.cs
│       └── wwwroot/
│           ├── umbraco-package.json      # Plugin manifest (at root!)
│           ├── lang/
│           │   └── en-us.json            # Localization
│           └── components/
│               ├── propertyEditors/
│               │   ├── category-picker.js  # Category picker UI (market/store-aware)
│               │   ├── product-picker.js   # Pick a specific product for a product page node
│               │   ├── store-picker.js     # Pick which market/store a node belongs to
│               │   ├── category-config-picker.js       # Config-only category dropdown (the "Category" data-type setting)
│               │   └── products-by-category-picker.js  # Pick many products from a configured category (server-side search+paging)
│               ├── conditions/
│               │   └── is-product-page.condition.js  # Gates the eCommerce tab to product pages only
│               ├── workspaceViews/
│               │   └── products-workspace-view.js  # Full product editor (variants, SEO, leasing)
│               ├── commerce-admin/
│               │   └── commerce-admin-dashboard.js  # "Commerce" section: Orders/Carts/Discounts/Analytics/etc.
│               └── settings/
│                   └── settings-dashboard.js  # Settings UI
│
└── sample-site/
    └── EComm.Commerce.Demo/              # Sample Umbraco site with a real storefront
        ├── Controllers/
        │   ├── CartController.cs         # Session-based cart
        │   └── CheckoutController.cs     # Checkout + Nets Easy payment
        ├── Services/
        │   └── StoreCartService.cs
        ├── Program.cs                    # IMPORTANT: UseStaticWebAssets() required!
        ├── appsettings.json              # SQLite database config
        └── appsettings.Development.json  # Unattended install credentials
```

### Key Components

#### 1. Commerce Settings Dashboard
**Location**: Settings section → Commerce Settings
**File**: `wwwroot/components/settings/settings-dashboard.js`
**Purpose**: Configure eCommerce API connection (Tenant ID, API URL, API Key) and document type/property aliases (category/product page aliases, category/store/product ID property aliases). Market ID is **no longer** a global setting — a site can serve multiple markets, so market/store is picked per-node via the Store Picker property editor.
**Storage**: Settings tree in Umbraco database
**API Route**: `/umbraco/management/api/ecomm-commerce/settings`

**Authentication Pattern**: Uses `UMB_AUTH_CONTEXT` for Bearer token authentication
```javascript
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';

constructor() {
  super();
  this.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
    this._authContext = authContext;
  });
}

async getAuthHeaders() {
  const token = await this._authContext?.getLatestToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}
```

#### 2. Category Picker Property Editor
**Alias**: `EComm.PropertyEditorUi.CategoryPicker`
**File**: `wwwroot/components/propertyEditors/category-picker.js`
**Purpose**: Dropdown to select a category from the eCommerce API
**Usage**: Add to document type properties (stores category ID as string)
**API Route**: `/umbraco/management/api/ecomm-commerce/categories`

#### 2b. Products-By-Category Picker Property Editor
**Alias**: `EComm.PropertyEditorUi.ProductsByCategoryPicker` (+ config-only `EComm.PropertyEditorUi.CategoryConfigPicker`)
**File**: `wwwroot/components/propertyEditors/products-by-category-picker.js`
**Purpose**: Pick one or more commerce products, filtered to a category set **once on the data type** via the single "Category" setting (`meta.settings.properties`, the repo's first property-editor config). Stores an **array of product ids** (`Umbraco.Plain.Json`).
**Config UI**: `category-config-picker.js` — no document context on the data-type settings screen, so it scopes to the default market via `GET .../settings`.
**API Route**: `GET /umbraco/management/api/ecomm-commerce/products/{categoryId}?page&pageSize&search` (server-side paged + name/SKU search, returns `{products, totalCount, page, pageSize}`). Consumed by Westbay to render a trailer's "options" as real products.

#### 3. Products Workspace View
**Alias**: `ecomm.workspaceView.products`
**File**: `wwwroot/components/workspaceViews/products-workspace-view.js`
**Purpose**: Display eCommerce products as a tab in the document editor
**Location**: Appears as "eCommerce" tab (next to Content/Info tabs) exclusively on product-type document nodes — gated by the `EComm.Condition.IsProductPage` condition (see #10 below), not shown at all on category pages or any other content type
**API Route**: `/umbraco/management/api/ecomm-commerce/products/{categoryId}`

**How it works**:
1. Consumes `UMB_PROPERTY_DATASET_CONTEXT` to reactively observe `categoryId` property
2. When categoryId changes, automatically fetches products from eCommerce API
3. Displays products in a table with: Image, Name, Slug, Price, Stock quantity
4. **Full editor** (no longer read-only): variant/options builder with a combinations table, Highlights, Leasing Factor, Hide Price + hidden-price message, and SEO title/description
5. **Images**: rich `ProductImage` objects (`url`, `altText`, `focalPoint`, `crops`, `mediaKey`) edited via Umbraco's **native media picker** (`<umb-input-rich-media>`: pick / upload / reorder / native focal-point + crop editor); external provider/URL images in a secondary list. A single global crop (width×height) + focal-point toggle configured in Settings → Commerce Settings → **Images**. Bare URL strings still accepted (backward compatible). **How it works + how to render on your storefront: [umbraco/docs/PRODUCT-IMAGES.md](../../umbraco/docs/PRODUCT-IMAGES.md)**
6. **Global custom fields**: the market's property templates are merged into the product editor as an editable **Attributes** block (`renderCustomPropertiesEditor`) — template-backed rows show a "global" badge and can't be removed (unfilled ones seeded from the template default), ad-hoc rows are add/edit/remove. Edited values are written to `editedProduct.customProperties` and saved with the product. A property whose template is bound to a **Product Attribute** (`attributeId`) renders its value as a **dropdown** of that attribute's predefined values (`_propertyOptions`), not free text.
7. **Product attributes / variants**: variant axes use the market's Product Attribute library. `VariantOption.Values` are `{name, alias}` objects (API model) — normalized to plain strings on load and denormalized on save (`_normalizeVariantOptions`/`_denormalizeVariantOptions`) so the existing variant editor keeps working. Variant-combination uniqueness is validated on save (no two variants may share the same attribute-value combination).

**Context Pattern**: Uses Umbraco's property dataset context for reactive updates
```javascript
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';

this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, async (datasetContext) => {
  this.observe(
    await datasetContext.propertyValueByAlias('categoryId'),
    (value) => {
      this.categoryId = value;
      if (value) this.loadProducts();
    }
  );
});
```

**States handled**:
- Loading: Spinner with "Loading products..." message
- No product selected yet: Info message guiding user to the Content tab's Product Picker property
- API not configured: Error with instructions to configure settings
- Empty category: Friendly empty state message
- Network error: Error message with retry button
- Success: Table view with product count

**CRITICAL - User Tracking**: Use `UMB_CURRENT_USER_CONTEXT` (NOT `UMB_AUTH_CONTEXT`) to access current user:
```javascript
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
// Use currentUser.email for user identification
```

**Product Variants**: Supports inline editing of variants. Validation: skip master product price/stock when `HasVariants=true`

#### 4. Product Content Finder
**File**: `ContentFinders/ProductContentFinder.cs`
**Purpose**: Dynamic URL routing for products within categories
**Pattern**: `/category-path/product-slug` → routes to Product template node
**How it works**:
1. URL: `/shop/electronics/laptop-xyz`
2. Finds category node at `/shop/electronics` (must be `categoryPage` document type)
3. Extracts product slug `laptop-xyz`
4. Reads `categoryId` property from category node
5. Fetches product from API: `GET /products/by-slug/{slug}?categoryId={categoryId}`
6. Routes to child node with alias `productPage` (the template)

#### 5. Commerce API Client
**File**: `Services/CommerceApiClient.cs`
**Features**:
- HttpClient factory pattern
- In-memory caching (categories: 5min, products: 2min)
- Settings integration (reads from CommerceSettingsService)
- Methods: `GetCategoriesAsync`, `GetCategoryAsync`, `CreateCategoryAsync`, `GetProductsAsync`, `GetProductBySlugAsync`, `GetMarketsAsync`, `GetCountriesAsync`, `CreateProductAsync`, `DeleteProductAsync`
- **Cart**: `GetCartAsync`, `AddCartItemAsync`, `UpdateCartItemAsync`, `RemoveCartItemAsync`, `CreateOrderAsync` (session-based), plus `GetCartsAsync` (paged backoffice list, market-scoped)
- **Orders**: `GetOrdersAsync`, `GetOrderAsync`, `UpdateOrderStatusAsync`, `GetOrderStatusDefinitionsAsync`, `CreatePaymentAsync` (provider-neutral — starts a payment via the market's configured provider; see [docs/PAYMENT-PROVIDERS.md](../../docs/PAYMENT-PROVIDERS.md))
- **Market config**: `GetAttributesAsync`/`UpdateAttributesAsync`, `GetAttributePresetsAsync`/`UpdateAttributePresetsAsync`, shipping methods, leasing periods, property templates, discounts (full CRUD)

**Connection Testing**: Uses dedicated TenantInfo endpoint for connectivity validation
```csharp
// CommerceSettingsService.TestConnectionAsync()
var tenantUrl = $"{baseUrl}/tenants/{settings.TenantId}";
var request = new HttpRequestMessage(HttpMethod.Get, tenantUrl);
request.Headers.Add("X-API-Key", settings.ApiKey);
// Returns tenant info + available markets list
```

**eCommerce API Endpoint**: `GET /api/v1/tenants/{tenantId}` (requires API key authentication)

#### 6. CategoryPicker API Controller
**File**: `Controllers/CategoryPickerApiController.cs`
**Purpose**: Proxy endpoints for category and product data from eCommerce API
**Endpoints**:
- `GET /umbraco/management/api/ecomm-commerce/categories` - Get all categories (hierarchical tree, optional `marketId`)
- `GET /umbraco/management/api/ecomm-commerce/categories/{id}` - Get specific category
- `GET /umbraco/management/api/ecomm-commerce/products/{categoryId}` - Get products for workspace view (max 100, optional `marketId`)
- `GET /umbraco/management/api/ecomm-commerce/products-for-node/{nodeKey}` - Products for a node, resolving parent's categoryId/storeId server-side (works around Umbraco CMS #19213)
- `GET /umbraco/management/api/ecomm-commerce/product/{productId}` - Get a single product
- `POST /umbraco/management/api/ecomm-commerce/products` - Create a product (accepts `nodeKey` to resolve category/market server-side, and `categoryId`/`marketId` sent verbatim by the picker)
- `POST /umbraco/management/api/ecomm-commerce/products/{id}/delete` - Delete a product
- `POST /umbraco/management/api/ecomm-commerce/categories` - Create a category (in the picker's resolved market)

#### 8. Commerce Admin Dashboard & API
**Files**: `wwwroot/components/commerce-admin/commerce-admin-dashboard.js`, `Controllers/CommerceAdminApiController.cs`
**Purpose**: Full commerce back-office inside Umbraco, in a dedicated "Commerce" section (auto-granted to the Administrators group by `Migrations/AddCommerceSectionToAdminGroupMigration.cs`)
**Shell**: a "Welcome to the Commerce Section" landing (`activeView='home'`) with clickable **store cards**, and a left **per-store tree** — each market is an expandable node whose children are the nav items (Orders/Carts/Discounts/Analytics) + Options submenu. Selecting a child sets both the store and the view; the selected store scopes every view.
**Tabs**: Orders, Carts, Discounts, **Currencies**, **Countries**, **Product Attributes**, **Product Attribute Presets**, Order Statuses, Property Templates, Analytics
**API Route**: `/umbraco/management/api/ecomm-commerce` - `markets`, `orders`, `orders/{id}`, `orders/{id}/status`, `carts`, `order-statuses` (CRUD), `attributes`, `attribute-presets`, `property-templates`, `discounts` (CRUD), `payment-providers/*`, `currencies`, `market-countries`, `currency-presets`, `shipping-methods`
**Data loading**: every view fetches when it is opened, via a single `_loadView(key)` dispatch shared by
"switched view" and "switched store". Nothing is primed at startup and there are no load-once guards —
those made lists show data from the moment the section was first opened, with pagination as the only
way to force a refresh. `_selectStoreView` sets the store *then* switches view so exactly one fetch
happens, for the store being switched to.
**Sidebar state** (`expandedStores`, `optionsOpenStores`) is a `Set` of market ids — per store, so one
store's expanded Options node doesn't open every other store's.
**Carts tab**: real carts from `GET /api/v1/carts` (persisted `Carts` table), paged and searched
server-side, rows open a read-only cart detail view. Not orders-in-a-cart-status — that never worked,
since cart→order mirroring was removed. A cart has no customer, address, order number or status, and
its lines have no SKU, so `_renderCartDetailView` is its own renderer rather than a flag on the order one.
**Payment Providers** (`wwwroot/components/commerce-admin/payment-providers-dashboard.js`): a `<ecomm-payment-providers-dashboard embedded>` element rendered as the **Options → Payment Providers** view inside the Commerce Admin dashboard, scoped to the dashboard's selected store (no own market picker when `embedded`). List the store's configured providers, add (pick from `payment-providers/catalog`), edit, delete, and choose the active one. The settings form is rendered from each provider's schema the moment a provider is chosen, so new gateways need no UI changes; secrets are write-only (masked, only sent when changed). See [docs/PAYMENT-PROVIDERS.md](../../docs/PAYMENT-PROVIDERS.md).
**Currencies + Countries (Options)**: per-store settings screens rendered inline in
`commerce-admin-dashboard.js` (they reuse `_viewHeader`/`_errorBanner`/`_renderPager` and the
`.data-table`/`.form-panel--modal` kit, so no new element or CSS). Currencies edit ISO code, formatting
culture (from `currency-presets`, generated server-side from .NET culture data), a custom format
template, and *Available in Countries* (an **All** toggle ⇒ `countryCodes: null`, else the store's own
countries). Countries edit ISO code plus default currency / shipping method / payment provider. Both
Create buttons open a flyout: blank · one ISO preset · **all** ISO presets (a single bulk PUT skipping
codes already present). Saved whole-list via `PUT currencies` / `PUT market-countries`, exactly like
tax classes. `formatCurrency` prefers the configured `Currency.culture` for the store's active
currency, falling back to its built-in locale map (guarded on `_currenciesMarketId`, so store B's money
is never formatted with store A's culture). `FormatTemplate` is stored for storefront use only — a
browser can't apply .NET format specifiers.
**Order Statuses tab**: create / edit / delete tenant statuses (name, code, color, sort, active) through
the same modal editor kit as tax classes, but per-item REST (`POST`/`PUT`/`DELETE order-statuses[/{id}]`)
since statuses are their own rows rather than a market settings list. Every call carries the selected
store (`?marketId=`) — each store owns its set. `code` is create-only — orders store
it and the API ignores it on update. Every row can be deleted, including the seeded system defaults —
what blocks a delete is a *reference* to the code (an order, or a market's checkout settings), and the
API's refusals are surfaced verbatim in the error banner, so `CommerceApiClient` returns the error text
for these calls instead of swallowing it. Editing here also refreshes `statusDefs`, which colors every
order pill.
**Product Attributes tabs**: per-store attribute library (Name+Alias, values Name+Alias) and named presets (bundles of attributes), scoped to the selected market (`?marketId=`). Property Templates tab gains a "Values from attribute" binding so a template's product value becomes a dropdown of that attribute's values.

#### 9. Product Picker & Store Picker
**Files**: `wwwroot/components/propertyEditors/product-picker.js`, `store-picker.js`
**Product Picker** (`EComm.PropertyEditorUi.ProductPicker`): lets an editor pick a specific product for a product page node (resolves via `products-for-node`, auto-sets the node name to the product name on select). When nothing is selected, a **"+" button** opens an inline popup to create a product (solo/with-variants, name, SKU + price for solo); the new product is created in the same category/market the list resolved from and auto-selected.
**Nested / Block List editing**: `products-for-node` and `create` resolve the node's `categoryId` via `GetValueWithAncestorFallback`, so a node nested under folders inherits the category set on an ancestor (e.g. a "Trailer options" root). `product-picker.js` parses the **innermost** `/document/{key}/edit/{key}` segment from the URL so the picker targets the node actually being edited inside a Block List / infinite-editing overlay (not the outer product page). The current selection is shown as a category-independent "Selected: {name}" preview (via `GET product/{id}`) and kept in the list, so the picker never renders empty even when the selected product is outside the resolved category.
**Category Picker** also has the same inline **"+" create** popup (name only) when nothing is selected — it resolves the node's market via effective-store *before* creating so the new category lands in the market the picker lists (otherwise it would be created in the settings-default market and disappear on reload).
**Store Picker** (`EComm.PropertyEditorUi.StorePicker`): dropdown of markets (from `GetMarketsAsync`) so a node can declare which market/store it belongs to — replaces the old global Market ID setting

#### 7. Commerce Settings Service
**File**: `Services/CommerceSettingsService.cs`
**Storage**: Umbraco settings tree (`/umbraco/settings/commerce`)
**Methods**: `GetSettingsAsync`, `SaveSettingsAsync`
**Validation**: `IsValid` property checks all required fields

#### 10. Is Product Page Condition
**Alias**: `EComm.Condition.IsProductPage`
**File**: `wwwroot/components/conditions/is-product-page.condition.js`
**Purpose**: Gates the "eCommerce" workspace tab (`ecomm.workspaceView.products`) to product-type nodes only. Umbraco's built-in `Umb.Condition.WorkspaceContentTypeAlias` can't be used because its allowed-aliases list is static JSON baked into the manifest, while the "Product Page Aliases" list is only known at runtime (fetched from `GET .../settings/defaults`). Implemented as a custom condition class extending `UmbConditionBase` (from `@umbraco-cms/backoffice/extension-registry`) that observes the current node's content type alias via `UMB_DOCUMENT_WORKSPACE_CONTEXT` and flips `this.permitted` once the async settings fetch resolves — the extension registry re-evaluates tab visibility reactively whenever `permitted` changes. The settings fetch is memoized at module scope so repeat node navigations don't re-request it.
**Registered in**: `wwwroot/umbraco-package.json` as a `"type": "condition"` manifest, referenced by alias (no `match`/`oneOf` needed) in the workspace view's `conditions` array alongside `Umb.Condition.WorkspaceAlias`.

### Document Type Setup

#### Category Page (`categoryPage`)
- **Alias**: `categoryPage`
- **Allow at root**: Yes
- **Properties**:
  - `categoryId` (Category Picker) - **Required**, stores eCommerce category ID
- **Allowed children**: `categoryPage` (nested categories), `productPage` (template)
- **URL**: Standard Umbraco routing (e.g., `/shop/electronics`)

#### Product Page (`productPage`)
- **Alias**: `productPage` — one of possibly several; "Product Page Aliases" in Settings → Commerce Settings → Defaults is a list, so sites with more than one product content type add each alias there
- **Allow at root**: No (must be child of `categoryPage`)
- **Purpose**: Template node for product URLs (not published content)
- **URL Pattern**: `{parent-category-url}/{product-slug}` (handled by ProductContentFinder)
- **Note**: Create ONE Product Page node per category as a template. Only nodes whose content type alias is in Product Page Aliases get the "eCommerce" workspace tab (see #10 Is Product Page Condition) — category pages no longer show it.

### Umbraco 17 API Changes (Critical!)

The plugin was upgraded from Umbraco 14 → 17 with these breaking changes fixed:

#### 1. Content Finder Registration
```csharp
// OLD (Umbraco 14): ContentFinderByUrl (obsolete)
builder.ContentFinders().InsertBefore<ContentFinderByUrl, ProductContentFinder>();

// NEW (Umbraco 17): ContentFinderByUrlNew
builder.ContentFinders().InsertBefore<ContentFinderByUrlNew, ProductContentFinder>();
```

#### 2. Document Lookup API
```csharp
// OLD (Umbraco 14): GetByRoute()
var categoryNode = content.GetByRoute(categoryPath);

// NEW (Umbraco 17): IDocumentUrlService + GetById()
private readonly IDocumentUrlService _documentUrlService;

var documentKey = _documentUrlService.GetDocumentKeyByRoute(
    categoryPath,
    culture: null,
    documentStartNodeId: null,
    isDraft: false
);
if (documentKey.HasValue)
{
    var categoryNode = content.GetById(documentKey.Value);
}
```

#### 3. Children Property → Extension Method
```csharp
// OLD (Umbraco 14): Children property (obsolete)
var childNode = categoryNode.Children.FirstOrDefault(...);

// NEW (Umbraco 17): Children() extension method
var childNode = categoryNode.Children().FirstOrDefault(...);
```

#### 4. Dependency Injection Lifetime Mismatch
**Problem**: Content finders are singletons, but API client is scoped
**Solution**: Use `IServiceScopeFactory` pattern
```csharp
private readonly IServiceScopeFactory _serviceScopeFactory;

// In TryFindContent():
using var scope = _serviceScopeFactory.CreateScope();
var apiClient = scope.ServiceProvider.GetRequiredService<ICommerceApiClient>();
var product = await apiClient.GetProductBySlugAsync(categoryId, productSlug);
```

#### 5. Management API Controller Routing
**Problem**: Controllers with `[MapToApi]` attribute require explicit `[Route]` at controller level
**Solution**: Add explicit route attribute to controllers
```csharp
[ApiController]
[MapToApi("ecomm-commerce")]
[Route("umbraco/management/api/ecomm-commerce")]  // REQUIRED in Umbraco 17!
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class CommerceSettingsApiController : ManagementApiControllerBase
{
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings() { ... }

    [HttpPost("settings")]
    public async Task<IActionResult> SaveSettings([FromBody] CommerceSettings settings) { ... }
}
```

**Important**: Without the explicit `[Route]` attribute, endpoints will return 404 even though `[MapToApi]` is present.

### Running the Sample Site

#### Prerequisites
- .NET 10 SDK installed
- eCommerce API running at `http://localhost:5180`

#### Start Umbraco
```bash
cd umbraco/sample-site/EComm.Commerce.Demo
dotnet run
```
- **HTTPS (backoffice)**: https://localhost:44371/umbraco
- **HTTP (frontend)**: http://localhost:15990

#### Login Credentials
- **Email**: admin@example.com
- **Password**: Admin1234! (minimum 10 characters required)

#### Database
- **Type**: SQLite
- **Location**: `umbraco/sample-site/EComm.Commerce.Demo/umbraco/Data/Umbraco.sqlite.db`
- **Provider**: Microsoft.Data.Sqlite
- **Reset**: Delete database files and restart

### Critical Configuration

#### 1. Static Web Assets (REQUIRED!)
**File**: `sample-site/EComm.Commerce.Demo/Program.cs`

**CRITICAL FIX**: You need TWO things for static assets to work:

```csharp
WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// STEP 1: Enable static web assets from referenced projects
builder.WebHost.UseStaticWebAssets();

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .Build();

WebApplication app = builder.Build();

await app.BootUmbracoAsync();

// STEP 2: Enable static files middleware BEFORE Umbraco middleware
app.UseStaticFiles();

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
```

**Why**:
- `UseStaticWebAssets()` tells the build system to include RCL wwwroot files
- `UseStaticFiles()` tells the middleware pipeline to serve those files
- Files map from `wwwroot/` → `/App_Plugins/ECommCommerce/` via `StaticWebAssetBasePath`

**Without it**: All plugin files return 404, dashboard and property editors won't load

#### 2. Database Configuration
**File**: `sample-site/EComm.Commerce.Demo/appsettings.json`

```json
"ConnectionStrings": {
  "umbracoDbDSN": "Data Source=|DataDirectory|/Umbraco.sqlite.db",
  "umbracoDbDSN_ProviderName": "Microsoft.Data.Sqlite"
}
```

**Note**: `|DataDirectory|` resolves to `umbraco/Data/` folder

#### 3. Unattended Install
**File**: `sample-site/EComm.Commerce.Demo/appsettings.Development.json`

```json
"Umbraco": {
  "CMS": {
    "Unattended": {
      "InstallUnattended": true,
      "UnattendedUserName": "eComm Demo",
      "UnattendedUserEmail": "admin@example.com",
      "UnattendedUserPassword": "Admin1234!",  // Min 10 chars!
      "UnattendedTelemetryLevel": "Detailed"
    }
  }
}
```

### Common Issues & Solutions

#### Plugin Files Return 404
**Symptom**: https://localhost:44371/App_Plugins/ECommCommerce/umbraco-package.json returns 404
**Causes**:
1. Missing `builder.WebHost.UseStaticWebAssets();` in `Program.cs`
2. Missing `app.UseStaticFiles();` in middleware pipeline (BEFORE `app.UseUmbraco()`)
3. Wrong wwwroot folder structure (files must be at `wwwroot/` root, not `wwwroot/App_Plugins/...`)

**Fix**:
1. Add `builder.WebHost.UseStaticWebAssets();` before `CreateUmbracoBuilder()`
2. Add `app.UseStaticFiles();` after `BootUmbracoAsync()` and before `UseUmbraco()`
3. Ensure files are at `wwwroot/umbraco-package.json`, `wwwroot/components/`, etc.
4. Rebuild: `dotnet clean && dotnet build`

#### Commerce Settings Dashboard Not Visible
**Symptom**: Settings section doesn't show "Commerce Settings"
**Causes**:
1. Static web assets not working (see above)
2. Plugin not referenced in sample-site project
3. Browser cache (hard refresh: Ctrl+Shift+R)

**Fix**:
1. Check `Program.cs` has `UseStaticWebAssets()`
2. Verify project reference in `EComm.Commerce.Demo.csproj`:
   ```xml
   <ProjectReference Include="..\..\plugin\EComm.Umbraco.Commerce\EComm.Umbraco.Commerce.csproj" />
   ```
3. Clear browser cache or test in incognito mode

#### Category Picker Shows No Categories
**Symptom**: Property editor dropdown is empty
**Causes**:
1. Commerce settings not configured
2. eCommerce API not running
3. Invalid API credentials

**Fix**:
1. Go to Settings → Commerce Settings
2. Enter: Tenant ID (`tenant-a`), API URL (`http://localhost:5180/api/v1`)
3. Set the node's Store Picker property to the desired market, then click "Test Connection" to verify
4. Check browser console for errors

#### Failed to Fetch Dynamically Imported Module
**Symptom**: `Failed to fetch dynamically imported module: .../settings-dashboard.js`
**Cause**: External CDN imports for Lit library blocked by CSP/CORS or wrong import path
**Fix**: Use Umbraco's bundled Lit library:
```javascript
// WRONG - External CDN
import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/nicholasxjy/lit-cdn@latest/lit.min.js';

// CORRECT - Umbraco bundled
import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
```

#### Authentication Error (HTTPS Required)
**Symptom**: "This server only accepts HTTPS requests"
**Cause**: Accessed backoffice via HTTP URL (`http://localhost:15990/umbraco`)
**Fix**: Use HTTPS URL: `https://localhost:44371/umbraco`

#### Password Too Short
**Symptom**: "The password must be at least 10 characters long"
**Cause**: Umbraco 17 requires minimum 10-character passwords
**Fix**: Update `appsettings.Development.json` with 10+ character password

#### Dependency Injection Error
**Symptom**: "Cannot consume scoped service from singleton"
**Cause**: Trying to inject scoped service directly into content finder
**Fix**: Use `IServiceScopeFactory` pattern (already implemented in ProductContentFinder)

### Development Workflow

#### Add New Property Editor
1. Create Lit component in `wwwroot/App_Plugins/ECommCommerce/components/propertyEditors/`
2. Register in `umbraco-package.json`:
   ```json
   {
     "type": "propertyEditorUi",
     "alias": "EComm.PropertyEditorUi.MyEditor",
     "element": "/App_Plugins/ECommCommerce/components/propertyEditors/my-editor.js",
     "meta": {
       "label": "My Editor",
       "propertyEditorSchemaAlias": "Umbraco.Plain.String"
     }
   }
   ```
3. Rebuild plugin and sample-site
4. Add to document type in backoffice

#### Add New Dashboard
1. Create Lit component in `wwwroot/App_Plugins/ECommCommerce/components/dashboards/`
2. Register in `umbraco-package.json` with section condition:
   ```json
   {
     "type": "dashboard",
     "alias": "ecomm.my.dashboard",
     "element": "/App_Plugins/ECommCommerce/components/dashboards/my-dashboard.js",
     "conditions": [
       {
         "alias": "Umb.Condition.SectionAlias",
         "match": "Umb.Section.Settings"
       }
     ]
   }
   ```

#### Add New Workspace View
1. Create Lit component in `wwwroot/App_Plugins/ECommCommerce/components/workspaceViews/`
2. Register in `umbraco-package.json`:
   ```json
   {
     "type": "workspaceView",
     "alias": "ecomm.workspaceView.myView",
     "element": "/App_Plugins/ECommCommerce/components/workspaceViews/my-view.js",
     "weight": 800,
     "meta": {
       "label": "My View",
       "pathname": "myview",
       "icon": "icon-box"
     },
     "conditions": [
       {
         "alias": "Umb.Condition.WorkspaceAlias",
         "match": "Umb.Workspace.Document"
       }
     ]
   }
   ```
3. Use `UMB_PROPERTY_DATASET_CONTEXT` to access document properties
4. Use `UMB_AUTH_CONTEXT` for authenticated API calls
5. Rebuild and test

#### Modify API Integration
1. Update models in `Models/`
2. Update API client methods in `Services/CommerceApiClient.cs`
3. Update property editor/dashboard JavaScript to use new API
4. Rebuild and test

#### Debug Product Content Finder
1. Check logs for `ProductContentFinder` entries (look for `LogDebug`, `LogWarning`)
2. Verify category node has `categoryId` property set
3. Verify Product template node exists as child (alias: `productPage`)
4. Test API endpoint directly: `GET /api/v1/tenants/{tenant}/markets/{market}/products/by-slug/{slug}?categoryId={id}`

### Testing

#### Verify Plugin Installation
```bash
# 1. Check manifest is accessible
curl -k https://localhost:44371/App_Plugins/ECommCommerce/umbraco-package.json

# 2. Check property editor file
curl -k https://localhost:44371/App_Plugins/ECommCommerce/components/propertyEditors/category-picker.js

# 3. Check dashboard file
curl -k https://localhost:44371/App_Plugins/ECommCommerce/components/settings/settings-dashboard.js

# 4. Check workspace view file
curl -k https://localhost:44371/App_Plugins/ECommCommerce/components/workspaceViews/products-workspace-view.js
```

#### Test Settings API
```bash
# Get settings
curl -k https://localhost:44371/umbraco/backoffice/api/commercesettings/get

# Save settings (MarketId is no longer part of settings — market is picked per-node via Store Picker)
curl -k -X POST https://localhost:44371/umbraco/backoffice/api/commercesettings/save \
  -H "Content-Type: application/json" \
  -d '{"TenantId":"tenant-a","ApiBaseUrl":"http://localhost:5180/api/v1","ApiKey":""}'
```

### Important Files Reference

| File | Purpose |
|------|---------|
| `EComm.Umbraco.Commerce.csproj` | Plugin project (SDK: Razor, .NET 10, Umbraco 17) |
| `CommerceComposer.cs` | DI registration, HttpClient, Content finders |
| `ProductContentFinder.cs` | Dynamic product URL routing logic |
| `CommerceApiClient.cs` | HTTP client for eCommerce API |
| `CommerceSettingsController.cs` | Backoffice API for settings CRUD |
| `umbraco-package.json` | Plugin manifest (extensions registration) |
| `category-picker.js` | Category dropdown property editor |
| `products-workspace-view.js` | Products list workspace view (eCommerce tab) |
| `is-product-page.condition.js` | Gates the eCommerce tab to product pages only |
| `settings-dashboard.js` | Settings UI with save/test functionality |
| `Program.cs` | **CRITICAL**: Must enable static web assets |
| `appsettings.json` | Database connection (SQLite) |
| `appsettings.Development.json` | Unattended install config |

### Related Documentation
- Main project docs: See `umbraco/CLAUDE.md`
- Umbraco 17 docs: https://docs.umbraco.com/umbraco-cms/v/17.latest
- Bellissima backoffice: https://docs.umbraco.com/umbraco-cms/v/17.latest/extending
- Lit framework: https://lit.dev/

### Common Tasks

**Reset Umbraco database**: Delete `umbraco/sample-site/EComm.Commerce.Demo/umbraco/Data/Umbraco.sqlite.db*` and restart

**Rebuild plugin**:
```bash
cd umbraco/sample-site/EComm.Commerce.Demo
dotnet clean
dotnet build
dotnet run
```

**View logs**: Check console output for `[INF]`, `[WRN]`, `[ERR]` messages

**Test without cache**: Use browser incognito mode

**Check static assets**: Look for `*.staticwebassets.*.json` files in `bin/Debug/net10.0/`

**Add eCommerce API call**: Update `ICommerceApiClient` + `CommerceApiClient` + frontend component
