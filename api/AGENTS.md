# API Backend Guide

## Overview

ASP.NET Core Web API backend for the eCommerce platform. Serves both admin backoffice and showcase website.

**Port**: http://localhost:5180

## Purpose

- **Full-featured backend** - SQLite database with Entity Framework Core
- **Contract reference** - Defines API contracts
- **Cross-platform** - Used by React admin + ASP.NET showcase
- **Production-ready patterns** - Swap SQLite for SQLServer when scaling

## Context Modules

Claude Code supports `/ctx-*` commands; Codex should open the matching `.claude/commands/*.md` file.

- **`/ctx-products`** - Product catalog implementation details (`.claude/commands/ctx-products.md`)
- **`/ctx-orders`** - Orders and cart implementation details (`.claude/commands/ctx-orders.md`)
- **`/ctx-rbac`** - Role-based access control details (`.claude/commands/ctx-rbac.md`)
- **`/ctx-tenants`** - Tenant and market management details (`.claude/commands/ctx-tenants.md`)

## Tech Stack

- ASP.NET Core 9.0 Web API
- C# 12
- **SQLite database with Entity Framework Core** (persistent storage)
- CORS enabled for localhost
- Swagger/OpenAPI (auto-generated)

## Quick Start

```bash
cd EComm.Api
dotnet run
# http://localhost:5180

# View Swagger docs
# http://localhost:5180/swagger
```

## Project Structure

```
/api/
  EComm.sln                     # Solution file

  /EComm.Data/                  # Data Access Layer (separate project)
    /Entities/                  # Domain entities
      Product.cs, Category.cs, Order.cs, Cart.cs, Discount.cs,
      Tenant.cs, Market.cs, ApiKey.cs, OrderStatus.cs, User.cs
    /ValueObjects/              # Nested types organized by domain
      /Common/                  # Address, Country
      /Product/                 # ProductVariant, VariantOption, CustomProperty
      /Order/                   # OrderItem, CustomerInfo
      /Cart/                    # CartItem
      /Tenant/                  # TenantSettings, MarketSettings, CustomPropertyTemplate,
                                 # ShippingMethod, LeasingPeriod
      /ApiKey/                  # ApiKeyListItem
    ECommDbContext.cs           # EF Core DbContext with JSON column support
    DataStore.cs                # Data access layer (uses EF Core)
    DatabaseSeeder.cs           # Database seeding on startup

  /EComm.Payment/               # Payment providers (separate project)
    IPaymentProvider.cs         # Provider contract + resolver (gateway-agnostic core)
    PaymentModels.cs, PaymentProviderResolver.cs, PaymentProviderExtensions.cs
    /Providers/NetsEasy/        # Nets Easy provider (first implementation, self-registering)

  /EComm.Api/                   # Web API project
    /Controllers/               # 15 API controllers
      ProductsController.cs, CategoriesController.cs, CartController.cs,
      OrdersController.cs, AdminOrdersController.cs, OrderStatusController.cs,
      TenantsController.cs, MarketsController.cs, ApiKeysController.cs,
      AuthController.cs, FilesController.cs, CountriesController.cs,
      DiscountsController.cs, PaymentsController.cs,
      TenantApiKeysController.cs
    /DTOs/                      # Data Transfer Objects
      /Requests/                # Request DTOs by domain
        /Auth/, /Products/, /Orders/, /Cart/, /Tenants/, /Markets/,
        /ApiKeys/, /OrderStatuses/
      /Responses/               # Response DTOs by domain
        /Products/, /Categories/, /Tenants/, /Markets/, /ApiKeys/, /Files/
    /Authentication/            # API Key auth handler
    /uploads/                   # Uploaded product images (tenant/market scoped)
    Program.cs                  # API configuration
    appsettings.json           # Configuration
```

## 15 Controllers

### 1. ProductsController
```csharp
GET    /api/v1/products                        // List products (market-scoped); +paged=true&page&pageSize returns {items,total,page,pageSize}
POST   /api/v1/products                        // Create product
GET    /api/v1/products/{id}                   // Get current version
PUT    /api/v1/products/{id}                   // Update (creates new version)
DELETE /api/v1/products/{id}                   // Soft-delete (marks status "deleted")
DELETE /api/v1/products/{id}/permanent         // Hard-delete (removes all versions; cannot be undone)
GET    /api/v1/products/{id}/versions          // Get version history
GET    /api/v1/products/{id}/versions/{ver}    // Get specific version
POST   /api/v1/products/{id}/versions/{ver}/restore // Restore version
```

### 2. CategoriesController
```csharp
GET    /api/v1/categories              // List categories (market-scoped)
POST   /api/v1/categories              // Create category
GET    /api/v1/categories/{id}         // Get category
PUT    /api/v1/categories/{id}         // Update category
DELETE /api/v1/categories/{id}         // Delete category
```

### 3. CartController / CartsController
```csharp
// Storefront (anonymous; X-Session-ID identifies the cart)
GET    /api/v1/cart                    // Get (or implicitly create) the session's cart
POST   /api/v1/cart/items              // Add item to cart
PUT    /api/v1/cart/items/{id}         // Update item quantity
DELETE /api/v1/cart/items/{id}         // Remove item
DELETE /api/v1/cart                    // Clear the whole cart

// Backoffice (authenticated: JWT or API key)
GET    /api/v1/carts?search&page&pageSize // Paged cart list for the market, UpdatedAt DESC
```
**Carts are persisted** in a `Carts` table (JSON `Items` column), keyed by `SessionId` — not held in
memory, and not mirrored as "new"-status orders. A cart has no customer info; that arrives with
`CreateOrderRequest` at checkout. `search` therefore matches session id and product names.

### 4. OrdersController
```csharp
GET    /api/v1/orders                  // List customer orders
POST   /api/v1/orders                  // Create order from the session's cart
GET    /api/v1/orders/{id}             // Get order details
PUT    /api/v1/orders/{id}             // Update in place: rebuild an unpaid order from the session's
                                       // current cart, keeping Id/OrderNumber/CreatedAt (auth required)
PUT    /api/v1/orders/{id}/status      // Update status (via OrderStatusService)
```
`PUT /api/v1/orders/{id}` takes the same `CreateOrderRequest` body as POST and shares
`ApplyCartAndPricing` with it, so a re-submitted checkout re-prices exactly like a first submit. It
returns **409** once the order is settled (`paid`/the market's `OrderStatusAfterPayment`, or a
`PaymentStatus` of `Authorized`/`Captured`) so a real sale can never be rewritten, and moves no stock.
It exists for storefronts that create the order before the payment step and would otherwise mint a
second order when the customer backs out and re-submits.

### 5. AdminOrdersController
```csharp
GET    /api/v1/admin/orders            // List all orders (admin)
GET    /api/v1/admin/orders/{id}       // Get order details
PUT    /api/v1/admin/orders/{id}/status // Update order status
POST   /api/v1/admin/orders            // Import a historical order verbatim (migration)
PUT    /api/v1/admin/orders/{id}       // Upsert an order by id (migration)
```

### 6. TenantsController
```csharp
GET    /api/v1/tenants                 // List all tenants
POST   /api/v1/tenants                 // Create tenant
GET    /api/v1/tenants/{id}            // Get tenant
PUT    /api/v1/tenants/{id}            // Update tenant
DELETE /api/v1/tenants/{id}            // Delete tenant
```

### 7. MarketsController
```csharp
GET    /api/v1/markets?tenantId={id}   // List markets for tenant
POST   /api/v1/markets                 // Create market
GET    /api/v1/markets/{id}            // Get market
PUT    /api/v1/markets/{id}            // Update market
DELETE /api/v1/markets/{id}            // Delete market
GET/PUT   /api/v1/markets/{id}/shipping-methods       // Market's delivery options
GET/PUT   /api/v1/markets/{id}/leasing-periods        // Market's rental duration presets
GET/POST/PUT/DELETE /api/v1/markets/{id}/attributes       // Market's product-attribute library (variant axes; + bulk PUT)
GET/POST/PUT/DELETE /api/v1/markets/{id}/attribute-presets // Named bundles of attributes (+ bulk PUT)
GET/PUT   /api/v1/markets/{id}/tax-classes                    // Market's named tax rates (+ per-country overrides) + the flat fallback taxRate
PUT/DELETE /api/v1/markets/{id}/payment-providers/{alias}/surcharge // Provider's surcharge fee for this market
```

### 8. ApiKeysController
```csharp
GET    /api/v1/api-keys?marketId={id}  // List keys for market
POST   /api/v1/api-keys                // Generate new key (shows once!)
PUT    /api/v1/api-keys/{id}/revoke    // Revoke key
DELETE /api/v1/api-keys/{id}           // Delete key
```

### 9. FilesController
```csharp
POST   /api/v1/files/upload                                    // Upload product images (multipart/form-data)
GET    /api/v1/files/resize/{tenant}/{market}/{file}?width={w}&height={h} // Get resized image (cached 7 days)
DELETE /api/v1/files/{filename}                                // Delete uploaded image
```
**Features**:
- Uses SixLabors.ImageSharp for high-quality resizing
- Maintains aspect ratio with ResizeMode.Max
- Automatic browser caching (7 days via Cache-Control headers)
- Stores files at `/uploads/{tenantId}/{marketId}/`
- Supports: jpg, jpeg, png, gif, webp (max 5MB per file)

### 10. CountriesController
```csharp
GET    /api/v1/countries?marketId={id} // List countries (ISO list, filtered by market's shipping zones if set)
```

### 11. DiscountsController
```csharp
GET/POST         /api/v1/discounts       // List/create discounts (tenant+market scoped)
GET/PUT/DELETE   /api/v1/discounts/{id}  // Manage a discount
```

### 12. PaymentsController
```csharp
POST   /api/v1/orders/{id}/payment          // Create a payment via the market's provider, returns redirect URL
POST   /api/v1/payments/webhook/{provider?} // Provider payment status webhook (default/sole provider when omitted)
```

### 13. TenantApiKeysController
```csharp
GET/POST/DELETE  /api/v1/admin/tenants/{tenantId}/api-keys // Tenant-level API keys (not market-scoped)
```

## Payments (pluggable providers)

Payments live in their own **`EComm.Payment`** project (a class library referenced by `EComm.Api`) and go through a **provider abstraction** — `IPaymentProvider` + `PaymentProviderResolver` — so each market picks its gateway via `market.Settings.PaymentProvider`. `PaymentsController` is gateway-agnostic:
- `POST /api/v1/orders/{id}/payment` → resolves the market's provider, returns `{ paymentId, redirectUrl }` (`400` if no provider configured, `502` if the provider fails). Requires auth (JWT or `X-API-Key`).
- `POST /api/v1/payments/webhook/{provider?}` → the `{provider}` segment (or default/sole provider) verifies, parses and applies the body. Anonymous, but an **idempotent consumer**: events are deduplicated in `PaymentWebhookEvents`, `Order.PaymentStatus` only ever moves forward (`PaymentState` is ordered), and a failed `VerifyWebhookAsync` returns `401` instead of acking. On success it routes through `OrderStatusService` so stock is reserved.

The generic layer (`EComm.Payment/`) contains no gateway code. Providers self-register from their own folder (`EComm.Payment/Providers/<Name>/`) via an `Add<Name>PaymentProvider()` extension; the API's `Program.cs` calls `AddPaymentProviders()` + `AddNetsEasyPaymentProvider()`.

**Nets Easy** is the first provider (`EComm.Payment/Providers/NetsEasy/`): `NetsEasyClient` wraps the hosted-checkout REST API directly (no SDK); `NetsEasyPaymentProvider` reads a typed `NetsEasySettings` (live/test secret+checkout keys, `merchantTermsUrl`, `merchantNumber`, `testMode`, `merchantHandlesConsumerData` — every one of which is actually sent, except the checkout keys, which embedded checkout will need), prefills `checkout.consumer` from the order, registers its webhook subscriptions per payment with a per-payment authorization token, and maps Nets' event names onto the shared `PaymentState`. On success the webhook advances `Order.Status` to the market's `OrderStatusAfterPayment` (default `paid`) — this requires the Nets webhook to reach the API, so set `Payments:PublicBaseUrl` (tunnel it locally).

**Full guide** (implementing/using providers, and a cross-gateway comparison of webhook shapes): [docs/PAYMENT-PROVIDERS.md](../docs/PAYMENT-PROVIDERS.md).

## Market-Level Commerce Settings

`Market.Settings` (`MarketSettings`) now also holds, managed via the `MarketsController` sub-resources above:
- `ShippingMethods`, `LeasingPeriods`
- `Attributes` (product-attribute library — variant axes with `{name, alias}` values) + `AttributePresets` (named bundles)
- `CustomPropertyTemplates` (each may carry an `AttributeId` to render its product value as a dropdown of the attribute's values)
- `DefaultLeasingFactor`, `CartOrderStatus`
- `PaymentProvider` (alias of the gateway for this market) + `OrderStatusAfterPayment` (order status set on a successful payment, regardless of provider) + `PaymentProviders` (generic per-provider settings bag, keyed by alias → opaque JSON each provider deserializes into its own typed model via `context.GetSettings<T>()`) — see [docs/PAYMENT-PROVIDERS.md](../docs/PAYMENT-PROVIDERS.md)
- `PaymentSurcharges` (optional flat fee per provider alias, applied when that provider is active) + `TaxClasses` (named tax rates with default + per-country override). The class named by the **active** provider's surcharge sets both the goods tax on carts/orders and that fee's own tax, via `MarketSettings.ResolveGoodsTaxRate()`; with no usable class it falls back to the flat `TaxRate` (editable on the Tax Classes screen in both admins) — see [docs/PAYMENT-PROVIDERS.md](../docs/PAYMENT-PROVIDERS.md) and [docs/TAX-CLASSES.md](../docs/TAX-CLASSES.md)

## Data Store

**SQLite Database** (`ecomm.db`):
- Persistent storage across API restarts (including carts)
- **Never delete `ecomm.db` to pick up a schema change** — `EnsureCreated()` is a no-op on an existing
  file, so additive changes go through `SchemaUpgrader` (called from `Program.cs` after
  `EnsureCreated()`): `ALTER TABLE ... ADD COLUMN` for columns, `CREATE TABLE IF NOT EXISTS` for new
  tables such as `Carts`. `CartSchemaUpgraderTests` asserts the hand-written SQL and the EF model
  agree, since drift would only surface at runtime on an upgraded database.
- Entity Framework Core with JSON column support
- Automatic database creation and seeding
- **Reset capability**: Delete `ecomm.db` file, restart API → fresh database

**DataStore.cs** - Data access layer using EF Core:
```csharp
public class DataStore
{
    // Factory pattern for thread-safe DbContext access
    private DbContextOptions<ECommDbContext> _dbOptions;

    private ECommDbContext CreateContext()
    {
        return new ECommDbContext(_dbOptions);
    }

    // Each operation creates a new scoped context
    public List<Product> GetProducts()
    {
        using var context = CreateContext();
        return context.Products.AsNoTracking().ToList();
    }

    public void AddProduct(Product product)
    {
        using var context = CreateContext();
        context.Products.Add(product);
        context.SaveChanges();
    }
    // ... etc
}
```

**ECommDbContext.cs** - Entity Framework Core DbContext:
- Stores complex types as JSON (Lists, Dictionaries, nested objects)
- **Composite primary key for Products**: `{Id, Version}` to support versioning
- Uses `.AsNoTracking()` for read-only queries to avoid tracking conflicts
- Optimized indexes for common queries
- Supports product versioning with full history

## Seed Data

**SeedData.cs** provides:
- 3 Tenants (A, B, C)
- 7 Markets across tenants
- 12 Products (market-1 only)
- 5 Categories (hierarchical)
- 6 Orders (various statuses)
- 9 API Keys (various markets)
- 3 Mock users (for auth reference)

## Multi-Tenancy Headers

**Every request should include**:
```csharp
X-Tenant-ID: tenant-a
X-Market-ID: market-1
```

**API Key requests** (showcase):
```csharp
X-API-Key: sk_live_...
```

Controllers filter data based on these headers.

## Common Tasks

### Add New Endpoint
1. Add method to controller
2. Update DataStore if new entity
3. Add seed data if needed
4. Test with Swagger

### Add New Entity Field
1. Update entity class in `EComm.Data/Entities/`
2. Update seed data in `EComm.Data/DatabaseSeeder.cs`
3. Frontend will auto-pick up changes

### Change API Contract
1. Update controller method
2. Update model if needed
3. Inform frontend team
4. Document breaking changes

### Debug Data
1. Use Swagger UI: http://localhost:5180/swagger
2. Check SQLite database: `ecomm.db` (use DB Browser for SQLite)
3. Reset data: Delete `ecomm.db` and restart API

## CORS Configuration

**Program.cs** allows:
- http://localhost:5173 (admin frontend)
- http://localhost:5025 (showcase website)

Add more origins in `Program.cs` if needed.

## Product Versioning

**Every product update creates a new version**:
- Sequential version numbers (v1, v2, v3...)
- Full product snapshot stored in database
- **Uses composite primary key `{Id, Version}`** in Products table
- `IsCurrentVersion` flag marks the active version
- All versions persist in database for complete history
- Restore creates new version from historical snapshot

```csharp
// Update flow
PUT /api/v1/products/123
→ Marks existing product as IsCurrentVersion = false
→ Creates new Product row with incremented version number
→ Sets IsCurrentVersion = true on new version
→ Both versions coexist in database (composite key)
```

**Database Schema**:
```sql
-- Products table uses composite primary key to support versioning
PRIMARY KEY (Id, Version)
-- This allows multiple versions of same product (same Id, different Version)
-- Queries filter by IsCurrentVersion to get active version
```

## Important Notes

- **SQLite persistence** - Data persists across restarts
- **Easy reset** - Delete `ecomm.db` file to start fresh
- **No auth validation** - Headers checked but not validated
- **No rate limiting** - Unlimited requests
- **SQLite for development** - Swap to SQLServer for production scale
- **Image storage** - Files stored locally at `/uploads/{tenantId}/{marketId}/`
- **Image caching** - Static files and resized images cached for 7 days
- **Image optimization** - SixLabors.ImageSharp package for on-the-fly resizing

## Troubleshooting

**API not starting**: Check port 5180 is free

**CORS errors**: Verify origin in Program.cs CORS config

**Data reset**: Delete `ecomm.db` file and restart API

**404 errors**: Check route in Swagger docs

**Database locked**: Close any SQLite database viewers before restarting API

**Product update errors**: If you see "UNIQUE constraint failed" errors, delete `ecomm.db` and restart. The database will be recreated with the correct composite primary key schema.

**DbContext concurrency errors**: DataStore uses factory pattern with scoped contexts per operation. Each method creates its own `using var context = CreateContext()` instance to avoid threading issues.

## Scaling to Production

When ready for production scale:
1. **Migrate from SQLite to SQLServer** (EF Core makes this easy!)
2. Add real authentication (OAuth2/OIDC)
3. Add validation and error handling
4. Add rate limiting
5. Add logging and monitoring
6. Deploy with Docker/Kubernetes

---

**For API integration patterns, see**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
