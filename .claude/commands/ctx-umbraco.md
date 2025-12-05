Review Umbraco CMS plugin implementation before proceeding.

## Umbraco Plugin Context

**Status**: Umbraco 17 (.NET 10) integration - Plugin implemented, Static assets working

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
│       │   └── CommerceSettingsController.cs  # Backoffice API
│       ├── Services/
│       │   ├── ICommerceApiClient.cs     # eCommerce API client interface
│       │   ├── CommerceApiClient.cs      # HTTP client with caching
│       │   ├── ICommerceSettingsService.cs
│       │   └── CommerceSettingsService.cs # Settings persistence
│       ├── Models/
│       │   ├── CommerceSettings.cs       # TenantId, MarketId, API config
│       │   ├── Category.cs
│       │   ├── Product.cs
│       │   └── ProductListResult.cs
│       └── wwwroot/
│           ├── umbraco-package.json      # Plugin manifest (at root!)
│           ├── lang/
│           │   └── en-us.json            # Localization
│           └── components/
│               ├── propertyEditors/
│               │   └── category-picker.js  # Category picker UI
│               └── settings/
│                   └── settings-dashboard.js  # Settings UI
│
└── sample-site/
    └── EComm.Commerce.Demo/              # Sample Umbraco site
        ├── Program.cs                    # IMPORTANT: UseStaticWebAssets() required!
        ├── appsettings.json              # SQLite database config
        └── appsettings.Development.json  # Unattended install credentials
```

### Key Components

#### 1. Commerce Settings Dashboard
**Location**: Settings section → Commerce Settings
**File**: `wwwroot/components/settings/settings-dashboard.js`
**Purpose**: Configure eCommerce API connection (Tenant ID, Market ID, API URL, API Key)
**Storage**: Settings tree in Umbraco database
**API Route**: `/umbraco/management/api/ecomm-commerce/settings`

#### 2. Category Picker Property Editor
**Alias**: `EComm.PropertyEditorUi.CategoryPicker`
**File**: `wwwroot/components/propertyEditors/category-picker.js`
**Purpose**: Dropdown to select a category from the eCommerce API
**Usage**: Add to document type properties (stores category ID as string)
**API Route**: `/umbraco/management/api/ecomm-commerce/categories`

#### 3. Product Content Finder
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

#### 4. Commerce API Client
**File**: `Services/CommerceApiClient.cs`
**Features**:
- HttpClient factory pattern
- In-memory caching (categories: 5min, products: 2min)
- Settings integration (reads from CommerceSettingsService)
- Methods: `GetCategoriesAsync`, `GetCategoryAsync`, `GetProductsAsync`, `GetProductBySlugAsync`

#### 5. Commerce Settings Service
**File**: `Services/CommerceSettingsService.cs`
**Storage**: Umbraco settings tree (`/umbraco/settings/commerce`)
**Methods**: `GetSettingsAsync`, `SaveSettingsAsync`
**Validation**: `IsValid` property checks all required fields

### Document Type Setup

#### Category Page (`categoryPage`)
- **Alias**: `categoryPage`
- **Allow at root**: Yes
- **Properties**:
  - `categoryId` (Category Picker) - **Required**, stores eCommerce category ID
- **Allowed children**: `categoryPage` (nested categories), `productPage` (template)
- **URL**: Standard Umbraco routing (e.g., `/shop/electronics`)

#### Product Page (`productPage`)
- **Alias**: `productPage`
- **Allow at root**: No (must be child of `categoryPage`)
- **Purpose**: Template node for product URLs (not published content)
- **URL Pattern**: `{parent-category-url}/{product-slug}` (handled by ProductContentFinder)
- **Note**: Create ONE Product Page node per category as a template

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
2. Enter: Tenant ID (`tenant-a`), Market ID (`market-uk`), API URL (`http://localhost:5180/api/v1`)
3. Click "Test Connection" to verify
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
```

#### Test Settings API
```bash
# Get settings
curl -k https://localhost:44371/umbraco/backoffice/api/commercesettings/get

# Save settings
curl -k -X POST https://localhost:44371/umbraco/backoffice/api/commercesettings/save \
  -H "Content-Type: application/json" \
  -d '{"TenantId":"tenant-a","MarketId":"market-uk","ApiBaseUrl":"http://localhost:5180/api/v1","ApiKey":""}'
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
