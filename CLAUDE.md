# eCommerce SaaS Platform - Developer Guide

> This file provides context for AI assistants (like Claude) and developers working on the codebase.

## Project Overview

Open-source headless eCommerce platform with multi-tenant, market-based architecture. Licensed under Apache 2.0 - free to use, modify, and build upon.

**Components**:
1. **Admin Backoffice** (frontend/) - React admin UI
2. **API Backend** (api/) - ASP.NET Core Web API
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
- **API**: ASP.NET Core 9.0 + SQLite + EF Core (port 5180)
- **Showcase**: ASP.NET MVC (port 5025)
- **Production-ready**: Swap SQLite for SQLServer when scaling

## Core Principles

1. **API-First**: Define contracts before implementation
2. **YAGNI**: Only build what's explicitly requested
3. **Keep It Simple**: Prefer simple over clever
4. **Multi-Tenant**: Data isolation at tenant and market level

## Running the Application

### 1. API Backend (Required)
```bash
cd api/EComm.Api
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

### Product Catalog
- CRUD operations with **versioning** (full history tracked)
- Multiple image upload with drag-and-drop reordering
- Image gallery on showcase with thumbnail navigation
- Hierarchical categories
- Quick stock updates
- Market-scoped catalogs
- **Custom property templates** - Define market-level property templates that appear on all products
- **Use `/ctx-products` for details**

### Orders & Cart
- Shopping cart (add/update/remove)
- Admin order dashboard with filters
- Custom order status management (tenant-scoped, custom colors)
- **Missing**: Checkout UI, cart persistence
- **Use `/ctx-orders` for details**

### Role-Based Access
- Three roles: Superadmin, Tenant Admin, Tenant User
- JWT authentication with httpOnly cookies
- Protected routes
- **Use `/ctx-rbac` for details**

### Tenants & Markets
- Tenant CRUD (superadmin only)
- Market CRUD within tenant
- API key generation per market
- **Use `/ctx-tenants` for details**

## Test Users

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@platform.com | password123 | Superadmin | All tenants |
| admin@demostore.com | password123 | Tenant Admin | tenant-a only |
| catalog@demostore.com | password123 | Catalog Manager | tenant-a, limited |

**Seed Data**: 3 tenants, 7 markets, 12 products, 5 categories, 6 orders, 9 API keys

## Routes

**Admin** (http://localhost:5173):
- `/login` - Profile selection
- `/admin` - Dashboard
- `/admin/products` - Product management
- `/admin/products/property-templates` - Market property templates
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
  DEVELOPMENT.md     # Workflow, coding standards, troubleshooting
  TEST-SCENARIOS.md  # Automated test scenarios for Playwright MCP
/.claude/commands/   # Slash commands for context loading
  ctx-products.md    # Product catalog context
  ctx-orders.md      # Orders & cart context
  ctx-rbac.md        # RBAC context
  ctx-tenants.md     # Tenants & markets context
/frontend/           # React admin (see frontend/CLAUDE.md)
/api/                # .NET API Backend (see api/CLAUDE.md)
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
3. Implement UI against API first
4. Update `docs/STATUS.md` when done

### For Bug Fixes
1. Write failing test
2. Fix bug
3. Verify test passes

### Automated Testing with Playwright MCP

**Setup**: Playwright MCP is configured in `.mcp.json` for browser automation testing.

**Test Scenarios**: See [docs/TEST-SCENARIOS.md](docs/TEST-SCENARIOS.md) for all happy path tests.

## Common Tasks

**Add product field**: Update Product type → ProductForm → API model → frontend
**Manage order statuses**: Go to `/admin/order-statuses` to add/edit/delete custom statuses
**Add permission**: Check authStore.user.role → conditional UI → route protection
**Add tenant/market**: Update types → forms → API → frontend
**Reset database**: Delete `api/EComm.Api/ecomm.db` file and restart API

## Scaling to Production

1. **Database**: Swap SQLite for SQLServer (EF Core makes this easy)
2. **Authentication**: Add OAuth2/OIDC
3. **Caching**: Add Redis
4. **Deployment**: Docker/Kubernetes

## Troubleshooting

**API not responding**: Check it's running on port 5180

**Frontend can't connect**: Verify VITE_API_BASE_URL in .env.local

**Auth not working**: Clear localStorage and re-login

**TypeScript errors**: Run `npm run type-check` in frontend

**Database issues**: Delete `api/EComm.Api/ecomm.db` file and restart API to reset

## Documentation

- **This file** - Quick start, essentials, and core principles
- **[docs/STATUS.md](docs/STATUS.md)** - Implementation status, what works, what's missing
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Deep dive into tech stack
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Coding standards and workflow
- **[docs/TEST-SCENARIOS.md](docs/TEST-SCENARIOS.md)** - Automated test scenarios for Playwright MCP
- **[frontend/CLAUDE.md](frontend/CLAUDE.md)** - Frontend-specific guide
- **[api/CLAUDE.md](api/CLAUDE.md)** - API backend guide
- **[showcase-dotnet/CLAUDE.md](showcase-dotnet/CLAUDE.md)** - Showcase-specific guide
- **[umbraco/CLAUDE.md](umbraco/CLAUDE.md)** - Umbraco CMS plugin architecture and planning

## Git Workflow

- Branch: `feature/[spec-number]-[short-name]`
- Commit: `feat:`, `fix:`, `refactor:` prefixes
- No direct commits to main
- PR requires review and passing tests

## License

This project is licensed under the **Apache License 2.0**. You are free to use, modify, and distribute this code. See [LICENSE](LICENSE) for details.

---

**Last Updated**: 2025-11-27
**Status**: Open Source Release
**Built by**: [UKAD](https://ukad-group.com)
