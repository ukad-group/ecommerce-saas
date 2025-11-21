# eCommerce SaaS MVP - Quick Start Guide

## Project Overview

Headless eCommerce SaaS platform with multi-tenant, market-based architecture.

**Components**:
1. **Admin Backoffice** (frontend/) - React admin UI
2. **Mock API** (mock-api/) - ASP.NET Core Web API
3. **Showcase Website** (showcase-dotnet/) - ASP.NET MVC demo storefront
4. **Umbraco Integration** (umbraco/) - CMS plugin for content management (planned)

**Data Hierarchy**:
```
Tenant (Business Entity)
└── Markets (Stores/Locations)
    └── Categories + Products
    └── Orders
```

**Key Concept**: Products and categories are **market-specific** (not tenant-wide). Each market has its own catalog.

## Tech Stack

- **Admin**: React 18 + TypeScript + Vite + TanStack Query + Zustand
- **Mock API**: ASP.NET Core 9.0 + SQLite + EF Core (port 5180)
- **Showcase**: ASP.NET MVC (port 5025)
- **Production** (future): .NET 8+ + SQLServer + OAuth2 + Redis

## Core Principles

1. **API-First**: Define contracts before implementation
2. **Mock-First**: UI validated against mocks before backend work
3. **YAGNI**: Only build what's explicitly requested
4. **TDD**: Write tests first, then code
5. **Keep It Simple**: Prefer simple over clever
6. **Multi-Tenant**: Data isolation at tenant and market level

## Running the Application

### 1. Mock API (Required)
```bash
cd mock-api/MockApi
dotnet run
# http://localhost:5180
```

### 2. Admin Backoffice
```bash
cd frontend
npm install  # First time only
npm run dev
# http://localhost:5173
```

**Config** (frontend/.env.local):
```bash
VITE_TENANT_ID=tenant-a
VITE_API_BASE_URL=http://localhost:5180/api/v1
VITE_USE_MOCKS=false
```

### 3. Showcase (Optional)
```bash
cd showcase-dotnet/ECommShowcase.Web
dotnet run
# http://localhost:5025
```

## Current Features

### ✅ Product Catalog
- CRUD operations with **versioning** (full history tracked)
- Multiple image upload with drag-and-drop reordering
- Image gallery on showcase with thumbnail navigation
- Hierarchical categories
- Quick stock updates
- Market-scoped catalogs
- **Use `/ctx-products` for details**

### ✅ Orders & Cart
- Shopping cart (add/update/remove)
- Admin order dashboard with filters
- Custom order status management (tenant-scoped, custom colors)
- **Missing**: Checkout UI, cart persistence
- **Use `/ctx-orders` for details**

### ✅ Role-Based Access
- Three roles: Superadmin, Tenant Admin, Tenant User
- Hardcoded profiles (no real auth)
- Protected routes
- **Missing**: Full tenant admin/user login flows
- **Use `/ctx-rbac` for details**

### ✅ Tenants & Markets
- Tenant CRUD (superadmin only)
- Market CRUD within tenant
- API key generation per market
- **Use `/ctx-tenants` for details**

## Mock Data

**Users** (Login credentials):
- **Super Admin** → All tenants, all markets
- **Admin (Demo Store)** → tenant-a only
- **Catalog Manager (Demo Store)** → tenant-a, limited permissions

**Tenants**:
- **Tenant A** (tenant-a) - 3 markets
- **Tenant B** (tenant-b) - 2 markets
- **Tenant C** (tenant-c) - 2 markets

**Data**: 12 products, 5 categories, 6 orders, 9 API keys (persists in SQLite database)

## Routes

**Admin** (http://localhost:5173):
- `/login` - Profile selection
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/categories` - Category management
- `/admin/orders` - Order management
- `/admin/order-statuses` - Order status management
- `/admin/tenants` - Tenant management (superadmin)

**Showcase** (http://localhost:5025):
- `/` - Home with featured products
- `/products` - Product catalog
- `/products/{id}` - Product details
- `/cart` - Shopping cart
- `/checkout` - Fake checkout (auto-pays)

## Multi-Tenancy

**Tenant Level**:
- Complete isolation between tenants
- Each tenant has multiple markets

**Market Level**:
- Products/categories/orders belong to specific markets
- API calls require `X-Tenant-ID` and `X-Market-ID` headers

**Roles**:
- **Superadmin**: All tenants, all markets, full permissions
- **Tenant Admin**: All markets in their tenant, full permissions
- **Tenant User**: Assigned markets only, view all + edit products/categories

## Project Structure

```
/docs/               # Reference documentation
  STATUS.md          # Implementation status - what works, what's missing
  ARCHITECTURE.md    # Tech stack, data models, design decisions
  DEVELOPMENT.md     # Workflow, coding standards, troubleshooting, spec template
  TEST-SCENARIOS.md  # Automated test scenarios for Playwright MCP
/.claude/commands/   # Slash commands for context loading
  ctx-products.md    # Product catalog context
  ctx-orders.md      # Orders & cart context
  ctx-rbac.md        # RBAC context
  ctx-tenants.md     # Tenants & markets context
/.mcp.json           # Playwright MCP configuration for automated testing
/frontend/           # React admin (see frontend/CLAUDE.md)
/mock-api/           # .NET Mock API (see mock-api/CLAUDE.md)
/showcase-dotnet/    # Demo storefront (see showcase-dotnet/CLAUDE.md)
/umbraco/            # Umbraco CMS plugin (see umbraco/CLAUDE.md)
```

## Slash Commands

Load specific context when working on features:

- **`/ctx-products`** - Product catalog implementation details
- **`/ctx-orders`** - Orders and cart implementation details
- **`/ctx-rbac`** - Role-based access control details
- **`/ctx-tenants`** - Tenant and market management details

## Development Workflow

### For New Features
1. Most features: just start coding (YAGNI)
2. Complex features: create minimal spec (see `docs/DEVELOPMENT.md` template)
3. Implement UI against mock API first
4. **Run happy path tests** using Playwright MCP (see below)
5. Update `docs/STATUS.md` when done
6. Delete spec if created (keep repo clean)

### For Bug Fixes
1. Write failing test
2. Fix bug
3. Verify test passes

### Automated Testing with Playwright MCP

**Setup**: Playwright MCP is configured in `.mcp.json` for browser automation testing.

**Test Scenarios**: See [docs/TEST-SCENARIOS.md](docs/TEST-SCENARIOS.md) for all happy path tests.

**How it works**:
- When implementing features, I can use Playwright MCP to automatically test the UI
- Tests run in Microsoft Edge with vision capabilities enabled
- Validates happy paths to ensure features work end-to-end
- Test scenarios cover: products, categories, orders, cart, checkout, images, tenants, and RBAC

**Manual Testing**: You can also run tests manually or ask me to validate specific scenarios.

## Common Tasks

**Add product field**: Update Product type → ProductForm → mock API → backend
**Manage order statuses**: Go to `/admin/order-statuses` to add/edit/delete custom statuses
**Add permission**: Check authStore.user.role → conditional UI → route protection
**Add tenant/market**: Update types → forms → mock API → backend
**Reset database**: Delete `mock-api/MockApi/ecomm.db` file and restart API

## Current Limitations

- **SQLite database**: Development-grade persistence (production will use SQLServer)
- **Hardcoded auth**: No real authentication system
- **No payments**: Simulated only (auto-pays)
- **No emails**: Not implemented

## Next Steps

1. **Complete RBAC**: Finish tenant admin/user login flows
2. **Checkout UI**: Build checkout forms (API ready)
3. **Cart Persistence**: Add localStorage for guest carts
4. **Production Backend**: .NET + SQLServer + OAuth2

## Troubleshooting

**Mock API not responding**: Check it's running on port 5180

**Frontend can't connect**: Verify VITE_API_BASE_URL in .env.local

**Auth not working**: Clear localStorage and re-login

**TypeScript errors**: Run `npm run type-check` in frontend

**Database issues**: Delete `mock-api/MockApi/ecomm.db` file and restart API to reset

## Documentation

- **This file** - Quick start, essentials, and core principles
- **[docs/STATUS.md](docs/STATUS.md)** - Implementation status, what works, what's missing
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Deep dive into tech stack
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Coding standards and workflow
- **[docs/TEST-SCENARIOS.md](docs/TEST-SCENARIOS.md)** - Automated test scenarios for Playwright MCP
- **[frontend/CLAUDE.md](frontend/CLAUDE.md)** - Frontend-specific guide
- **[mock-api/CLAUDE.md](mock-api/CLAUDE.md)** - Mock API backend guide
- **[showcase-dotnet/CLAUDE.md](showcase-dotnet/CLAUDE.md)** - Showcase-specific guide
- **[umbraco/CLAUDE.md](umbraco/CLAUDE.md)** - Umbraco CMS plugin architecture and planning

## Git Workflow

- Branch: `feature/[spec-number]-[short-name]`
- Commit: `feat:`, `fix:`, `refactor:` prefixes
- No direct commits to main
- PR requires review and passing tests

---

**Last Updated**: 2025-11-21
**Status**: Active Development - MVP Phase
