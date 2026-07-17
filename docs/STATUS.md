# Implementation Status

**Last Updated**: 2026-07-03

## Quick Reference

**What Works**: Products, Categories, Orders (admin), Cart, Tenants, Markets, API Keys, Superadmin Auth, Product Add-ons, **Product Attributes** (per-store variant-axis library + presets), Discounts (API), Nets Easy Payments, **Responsive UI**, **UKAD Branding**
**What's Missing**: Tenant Admin/User login flows, Checkout UI (showcase-dotnet), Cart persistence, Nets Easy webhook signature verification

---

## UI/UX

**Status**: ✅ Complete - Fully Responsive with UKAD Brand Identity

### Implemented
- **UKAD Brand Colors** - Consistent throughout application
  - Primary: `#4a6ba8` (buttons, links, interactive elements)
  - Hover: `#3d5789` (hover states)
  - Dark Navy: `#304477` (text, dark accents)
- **Responsive Design** - Mobile-first approach
  - Hamburger menu on mobile/tablet (< 1024px)
  - Full navigation on desktop (≥ 1024px)
  - Progressive table column hiding on smaller screens
  - Mobile card views for products and orders
  - Custom `useMediaQuery()` and `useResponsive()` hooks
- **Image Optimization**
  - Server-side image resizing API
  - Multiple size variants (thumbnail 100x100, medium 600x600, large 1200x1200)
  - Proper resolution selection based on context
- **Component Library**
  - Reusable Button component with UKAD colors
  - Mobile-friendly forms and inputs
  - Responsive navigation with MobileMenu component
  - OrderCard and ProductCard for mobile views

### Known Issues
None

---

## Feature 001: Product Catalog

**Status**: ✅ Complete with versioning

### Implemented
- Product CRUD (create, read, update, delete)
- Hierarchical categories
- **Product versioning** - Full history tracking
  - Every update creates new version
  - Version restore with one click
  - Track who/when/why changes made
- Quick stock updates
- Product status (active/inactive/draft)
- Search and filtering
- Market-scoped catalogs
- **Custom property templates** (market-level)
  - Define reusable property templates per market
  - Templates auto-appear on all products
  - Properties with "Market" badge cannot be removed
  - SortOrder support with drag reordering
  - Umbraco plugin: template values are editable per-product on the product's eCommerce tab (templates merged into the editor, unfilled ones seeded from their default)
- **Rich product images** - Images are objects (`url`, `altText`, `focalPoint`, `crops`, `mediaKey`), not bare URL strings
  - Focal-point-aware cover cropping on storefronts (`object-position`) + alt text
  - Umbraco plugin edits them via the native media picker (focal point + crop editor); React admin has a focal-point/alt editor
  - Backward compatible: bare URL strings still accepted (no DB reset)
  - Umbraco integration + storefront rendering guide: `umbraco/docs/PRODUCT-IMAGES.md`

### API Endpoints
```
GET/POST   /api/v1/products
GET/PUT/DELETE   /api/v1/products/:id
GET   /api/v1/products/:id/versions
GET   /api/v1/products/:id/versions/:version
POST  /api/v1/products/:id/versions/:version/restore
GET/POST   /api/v1/categories
GET/PUT/DELETE   /api/v1/categories/:id
GET/PUT   /api/v1/admin/markets/:id/property-templates
```

### Known Issues
None

---

## Feature 002: Cart & Order Management

**Status**: ⚠️ Partially Complete

### Implemented
- Shopping cart (add/update/remove items)
- Cart totals calculation
- Admin order dashboard with metrics
- Order list with filters (status, tenant, date, search)
- Order details view
- Order status updates with notes
- Stock warnings in cart
- **Custom order status management** (tenant-scoped)
  - Default status preset per tenant
  - Create/edit/delete custom statuses
  - Custom colors and sort order
  - Delete protection (statuses in use)
  - Dynamic status filters and badges

### Missing
- ❌ Checkout UI (forms and pages) - **API infrastructure ready**
- ❌ Customer-facing order tracking
- ❌ Cart persistence across sessions
- ❌ Refund workflows
- ❌ Abandoned cart recovery

### API Endpoints
```
# Cart (Customer)
GET   /api/v1/cart
POST   /api/v1/cart/items
PUT   /api/v1/cart/items/:id
DELETE   /api/v1/cart/items/:id

# Orders (Admin)
GET   /api/v1/admin/orders
GET   /api/v1/admin/orders/:id
PUT   /api/v1/admin/orders/:id/status

# Order Statuses (Admin)
GET   /api/v1/order-statuses
GET   /api/v1/order-statuses/active
POST   /api/v1/order-statuses
PUT   /api/v1/order-statuses/:id
DELETE   /api/v1/order-statuses/:id
POST   /api/v1/order-statuses/reset-defaults
```

### Known Issues
- No cart persistence for guest users (carts stored in-memory, synced to Orders with "new" status)

---

## Feature 003: Role-Based Access Control

**Status**: ✅ Complete (JWT Authentication)

### Roles
- **Superadmin**: All tenants, all markets, full access
- **Tenant Admin**: Their tenant only, full access within tenant
- **Tenant User**: Their tenant only, view all + edit products/categories

### Implemented
- **JWT Authentication** with httpOnly cookies (XSS protection)
- **Dual authentication**: JWT for admin, API Key for integrations/showcase
- Email/password login (BCrypt hashed passwords)
- Auth state management (Zustand + API)
- Protected routes with auto-redirect on 401
- Backend authorization on all admin endpoints
- User database entity with role management
- Session persistence with 1-hour JWT expiry
- User info display with logout

### Missing
- ❌ Permission-based UI hiding/disabling (all logged-in users see same UI)
- ❌ Full tenant filtering in API calls (headers sent but not fully enforced)

### Test Users (Password: "password123")
```
- admin@platform.com → SUPERADMIN → All tenants
- admin@demostore.com → TENANT_ADMIN → tenant-a
- catalog@demostore.com → TENANT_USER → tenant-a, market-1 only
```

### Authentication Architecture
- **Frontend**: httpOnly cookies for JWT storage
- **Backend**: JWT Bearer + API Key dual authentication
- **Admin endpoints**: `[Authorize(Policy = "AdminOnly")]` - JWT only
- **Public endpoints**: `[Authorize]` - JWT or API Key accepted
- **CORS**: Configured for credentials with explicit origins

### Known Issues
- All logged-in users see same UI (no role-based hiding yet)
- Tenant filtering not fully enforced on backend

---

## Feature 004: Tenant & Market Management

**Status**: ✅ Complete

### Implemented
- Tenant CRUD (superadmin only)
- Market CRUD within tenant
- API key generation per market
  - Keys shown once on creation
  - Masked display (last 4 chars)
  - Revoke functionality
- **Tenant-level API keys** (superadmin, not market-scoped) - managed at `/admin/tenants/:tenantId/api-keys`
- Market shipping methods, leasing periods, and shippable countries configuration
- Search and filtering
- Pagination
- Status management (active/inactive)

### API Endpoints
```
# Tenants (Superadmin only)
GET/POST   /api/v1/tenants
GET/PUT/DELETE   /api/v1/tenants/:id
GET/POST/DELETE   /api/v1/admin/tenants/:tenantId/api-keys

# Markets
GET/POST   /api/v1/markets?tenantId=:id
GET/PUT/DELETE   /api/v1/markets/:id
GET/PUT   /api/v1/markets/:id/shipping-methods
GET/PUT   /api/v1/markets/:id/leasing-periods

# API Keys (market-scoped)
GET   /api/v1/api-keys?marketId=:id
POST   /api/v1/api-keys
PUT   /api/v1/api-keys/:id/revoke
DELETE   /api/v1/api-keys/:id
```

### Known Issues
None

---

## Feature 005: Product Options / Add-ons

**Status**: ✅ Complete (admin UI, API, showcase display)

### Implemented
- Market-scoped library of reusable "option presets" (purchasable add-ons): `single` (standalone) or `group` (bundles related singles via `SubOptionIds`)
- Managed in admin at `/admin/products/option-presets` (search, add, inline edit, delete), and in the Umbraco plugin's Commerce dashboard (Option Presets tab, scoped to the selected market)
- Optional preset photo: a rich `Image` (`url`, `altText`, `focalPoint`, `crops`, `mediaKey`) pickable from Umbraco Media in the plugin, rendered focal-point-cropped on the storefront; legacy `imageUrl` string still accepted
- Products attach "option blocks" (title + description + disable toggle) referencing presets from `ProductForm`
- Showcase product detail page renders attached option blocks as purchasable add-ons; add-to-cart accepts `optionId`

### Known Issues
- Admin's product-level option block picker only lets you attach `single` presets, not `group` presets, even though the data model and showcase rendering support groups on a block

### API Endpoints
```
GET/POST/PUT/DELETE   /api/v1/markets/:id/option-presets
GET   /api/v1/option-presets   # public, active-only (used by showcase/storefronts)
```

---

## Feature 008: Product Attributes

**Status**: ✅ Complete (API, React admin, Umbraco plugin) — showcase renders variants unchanged

### Implemented
- **Per-store (market-scoped) attribute library** — each attribute has a Name + **Alias** and a list of values (each Name + Alias). Stored in `Market.Settings.Attributes` (JSON column). This is the renamed/expanded "variant options" concept.
- **Attribute Presets** — named bundles of attributes (`Market.Settings.AttributePresets`) applied to a product all at once.
- **Product variant axes** (`VariantOption`) can be **global** (linked to a library attribute via `AttributeId`, with a selected subset of values) or **local** (defined inline). Values are now `{ name, alias }` objects. `ProductVariant.Options` stays a `name → valueName` dict, so variant generation/matching (and the showcase) are unchanged.
- **Variant uniqueness** enforced server-side (`ProductsController.ValidateVariants`) + client-side: no two variants may share the same attribute-value combination (order-independent) or SKU.
- **Property templates → attribute binding**: a market property template can carry an `AttributeId`; on a product that custom-property renders as a **dropdown of the attribute's predefined values** instead of free text.
- **React admin**: `/admin/products/attributes` and `/admin/products/attribute-presets` library pages; ProductForm "Attributes" section (global picker + apply-preset + local add); Property Templates page "Values from attribute" column.
- **Umbraco plugin**: Commerce dashboard **Product Attributes** + **Product Attribute Presets** tabs; Property Templates tab attribute binding; product workspace view custom-property dropdowns + variant uniqueness.

### Migration note
The `VariantOption.Values` JSON shape changed (string → `{name, alias}`). Existing data was migrated in place (no `ecomm.db` reset); the seeder writes the new shape. The Umbraco plugin is consumed by Westbay via NuGet — repackage + bump the reference to pick up the model change (Westbay.Core consuming code updated to the new shape).

### API Endpoints
```
GET/POST/PUT/DELETE   /api/v1/admin/markets/:id/attributes            # + bulk PUT
GET/POST/PUT/DELETE   /api/v1/admin/markets/:id/attribute-presets     # + bulk PUT
```

---

## Feature 006: Discounts

**Status**: ⚠️ API + Umbraco backoffice only — no React admin UI yet

### Implemented
- Discount CRUD (tenant + market scoped) at the API level
- Managed from the Umbraco plugin's Commerce Admin dashboard (Discounts tab)

### Missing
- React admin UI for managing discounts

### API Endpoints
```
GET/POST   /api/v1/discounts
GET/PUT/DELETE   /api/v1/discounts/:id
```

---

## Feature 007: Payments (Nets Easy)

**Status**: ⚠️ Real integration, not production-hardened

### Implemented
- `PaymentsController` creates a Nets Easy hosted-checkout payment and returns a redirect URL
- Webhook updates `Order.PaymentStatus` (Initialized → Authorized → Captured)
- Wired into the Umbraco sample site's real checkout flow (Cart → Checkout → Confirmation)
- Nets credentials configured per market (`Market.Settings.NetsSecretApiKey`, `NetsTestMode`)

### Missing / Known Issues
- Webhook does not verify Nets' signature/HMAC yet — do not rely on this for real money without adding it
- The primary showcase-dotnet storefront still uses the fake auto-pay checkout; Nets Easy is only wired into the Umbraco demo site's checkout

### API Endpoints
```
POST   /api/v1/orders/:id/payment
POST   /api/v1/payments/webhook
```

---

## API Backend Status

**Implementation**: ASP.NET Core 9.0 Web API
**Port**: http://localhost:5180
**Data**: SQLite database with Entity Framework Core (persistent storage)

### Controllers
1. AuthController - Login/logout/me endpoints with JWT
2. ProductsController - Product CRUD + versioning
3. CategoriesController - Category hierarchy
4. CartController - Shopping cart operations
5. OrdersController - Customer orders
6. AdminOrdersController - Admin order management
7. OrderStatusController - Custom order status management
8. TenantsController - Tenant management
9. MarketsController - Market management (+ shipping methods, leasing periods, option presets)
10. ApiKeysController - API key generation/revocation
11. CountriesController - ISO country list (market-scoped)
12. DiscountsController - Discount CRUD
13. OptionPresetsController - Public read-only option presets (for storefronts)
14. PaymentsController - Nets Easy payment creation + webhook
15. TenantApiKeysController - Tenant-level (superadmin) API keys

### Authentication
- **JWT**: 1-hour expiry, httpOnly cookies, BCrypt password hashing
- **API Keys**: Market-scoped, SHA256 hashing
- **Dual Auth Handler**: Supports both JWT and API Key authentication

### Database Implementation
- **SQLite** with Entity Framework Core
- **Persistent storage** - Data survives API restarts
- **JSON columns** - Complex types stored as JSON
- **Composite primary key** for Products: `{Id, Version}` to support versioning
- **Factory pattern** - Thread-safe DbContext access with scoped contexts
- **Easy reset** - Delete `ecomm.db` file and restart

### Seed Data
- 3 Users (1 superadmin, 1 tenant admin, 1 tenant user)
- 3 Tenants (A, B, C)
- 7 Markets across tenants
- 12 Products (market-1 only)
- 5 Categories
- 6 Orders (various statuses)
- 9 API Keys
- Default order statuses for all tenants

### Known Issues
None - Data now persists across restarts

---

## Showcase Website Status

**Implementation**: ASP.NET Core 9.0 MVC
**Port**: http://localhost:5025

### Implemented
- Product browsing and search
- Product details page
- Product add-ons / option presets on the detail page (single + group options)
- Shopping cart with session persistence
- Fake checkout (auto-pays orders)
- Order confirmation page

### Missing
- Real payment processing
- User accounts
- Customer order tracking

### Known Issues
- Checkout always succeeds (fake payment)
- Session-based cart (no persistence)

---

## Next Priorities

1. **Complete RBAC** - Finish tenant admin/user login flows
2. **Checkout UI** - Build customer checkout forms in showcase-dotnet (API + Nets Easy ready; already live in the Umbraco demo site)
3. **Cart Persistence** - Add localStorage for admin, database for production
4. **Nets Easy webhook security** - Verify signature/HMAC before accepting real payments
5. **Discounts admin UI** - Build React admin screens (API + Umbraco backoffice already support it)
6. **Production Backend** - Replace SQLite with SQLServer for production use

---

## Migration Notes

### From Development to Production
1. Keep frontend `.env.local` with `VITE_USE_MOCKS=false`
2. Update `VITE_API_BASE_URL` to production backend
3. Implement same API contracts in production
4. Add real database, auth, caching, etc.
5. Test all flows against production

### Authentication Upgrade
1. Replace hardcoded profiles with OAuth2/OIDC
2. Implement real user management
3. Add JWT token handling
4. Maintain same role structure (superadmin, tenant_admin, tenant_user)
