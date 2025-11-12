# Implementation Status

**Last Updated**: 2025-11-11

## Quick Reference

**What Works**: Products, Categories, Orders (admin), Cart, Tenants, Markets, API Keys, Superadmin Auth
**What's Missing**: Tenant Admin/User login flows, Checkout UI, Cart persistence

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

### API Endpoints
```
GET/POST   /api/v1/products
GET/PUT/DELETE   /api/v1/products/:id
GET   /api/v1/products/:id/versions
GET   /api/v1/products/:id/versions/:version
POST  /api/v1/products/:id/versions/:version/restore
GET/POST   /api/v1/categories
GET/PUT/DELETE   /api/v1/categories/:id
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
- Order status workflow: new → submitted → paid → processing → shipped → completed

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
```

### Known Issues
- No cart persistence for guest users (carts stored in database but not tied to sessions)

---

## Feature 003: Role-Based Access Control

**Status**: ⚠️ Partially Complete

### Roles
- **Superadmin**: All tenants, all markets, full access
- **Tenant Admin**: Their tenant only, full access within tenant
- **Tenant User**: Their tenant only, view all + edit products/categories

### Implemented
- Login page with profile selector
- **Superadmin login flow** (complete)
- Tenant selector for scoped roles (UI only)
- Auth state management (Zustand + localStorage)
- Protected routes
- Session persistence
- User info display with logout

### Missing
- ❌ **Tenant Admin login flow** (selector shown but not functional)
- ❌ **Tenant User login flow** (selector shown but not functional)
- ❌ Permission-based UI hiding/disabling
- ❌ Tenant filtering in all API calls (headers sent but not fully enforced)

### Mock Users (Hardcoded)
```
- Super Admin (admin@system.com) → All tenants
- Admin (Demo Store) (admin@demo.com) → tenant-a
- Catalog Manager (Demo Store) (manager@demo.com) → tenant-a, limited
```

### Known Issues
- Only superadmin login fully works
- Tenant admin/user can select tenant but filtering not complete
- Some API calls don't enforce tenant filtering

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
- Search and filtering
- Pagination
- Status management (active/inactive)

### API Endpoints
```
# Tenants (Superadmin only)
GET/POST   /api/v1/tenants
GET/PUT/DELETE   /api/v1/tenants/:id

# Markets
GET/POST   /api/v1/markets?tenantId=:id
GET/PUT/DELETE   /api/v1/markets/:id

# API Keys
GET   /api/v1/api-keys?marketId=:id
POST   /api/v1/api-keys
PUT   /api/v1/api-keys/:id/revoke
DELETE   /api/v1/api-keys/:id
```

### Known Issues
None

---

## Mock API Status

**Implementation**: ASP.NET Core 9.0 Web API
**Port**: http://localhost:5180
**Data**: SQLite database with Entity Framework Core (persistent storage)

### Controllers
1. ProductsController - Product CRUD + versioning
2. CategoriesController - Category hierarchy
3. CartController - Shopping cart operations
4. OrdersController - Customer orders
5. AdminOrdersController - Admin order management
6. TenantsController - Tenant management
7. MarketsController - Market management
8. ApiKeysController - API key generation/revocation

### Database Implementation
- **SQLite** with Entity Framework Core
- **Persistent storage** - Data survives API restarts
- **JSON columns** - Complex types stored as JSON
- **Composite primary key** for Products: `{Id, Version}` to support versioning
- **Factory pattern** - Thread-safe DbContext access with scoped contexts
- **Easy reset** - Delete `ecomm.db` file and restart

### Seed Data
- 3 Tenants (A, B, C)
- 7 Markets across tenants
- 12 Products (market-1 only)
- 5 Categories
- 6 Orders (various statuses)
- 9 API Keys

### Known Issues
None - Data now persists across restarts

---

## Showcase Website Status

**Implementation**: ASP.NET Core 9.0 MVC
**Port**: http://localhost:5025

### Implemented
- Product browsing and search
- Product details page
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
2. **Checkout UI** - Build customer checkout forms (API ready)
3. **Cart Persistence** - Add localStorage for admin, database for production
4. **Production Backend** - Replace mock-api with real .NET + SQLServer

---

## Migration Notes

### From Mock API to Production
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
