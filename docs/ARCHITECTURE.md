# Architecture Reference

## Technology Stack

### Admin Backoffice (frontend/)
- React 18 + TypeScript 5 + Vite 5
- State: Zustand 4 (persisted to localStorage)
- Data: TanStack Query v5
- UI: Tailwind CSS + Headless UI
- Forms: React Hook Form
- Port: http://localhost:5173

### API Backend (api/)
- ASP.NET Core 9.0 Web API + C# 12
- **Two-project architecture**: EComm.Api (controllers, DTOs) + EComm.Data (entities, data access)
- **SQLite database with Entity Framework Core** (persistent storage)
- Factory pattern for thread-safe DbContext access
- 11 Controllers: Products, Categories, Cart, Orders, AdminOrders, OrderStatus, Tenants, Markets, ApiKeys, Auth, Files
- Port: http://localhost:5180

### Showcase Website (showcase-dotnet/)
- ASP.NET Core 9.0 MVC + C# 12
- Bootstrap 5 + Razor views
- Session-based cart
- Port: http://localhost:5025

### Production Backend (Planned)
- .NET 8+ with SQLServer
- OAuth2/OIDC auth
- Redis caching
- Docker/Kubernetes

## Data Hierarchy

```
Tenant (Business Entity - e.g., Retail Chain)
└── Markets (Individual Stores/Locations)
    └── Categories (Product Organization)
        └── Products (Catalog Items)
            └── Variants
```

**Key Points**:
- Products and categories are **market-specific** (not tenant-wide)
- Orders belong to specific markets
- Users have tenant-level access with optional market restrictions
- API calls include both `X-Tenant-ID` and `X-Market-ID` headers

## Multi-Tenancy Isolation

**Tenant Level**:
- Complete data isolation
- Each tenant has multiple markets
- Superadmin sees all; Tenant Admin/User see only their tenant

**Market Level**:
- Each market has its own catalog (products, categories)
- Orders are market-specific
- API keys are market-scoped

**Access Control**:
- **Superadmin**: All tenants, all markets, full permissions
- **Tenant Admin**: All markets in their tenant, full permissions
- **Tenant User**: Assigned markets only, limited permissions (view all, edit products/categories only)

## API Integration Pattern

**Frontend → API**:
```typescript
// Headers on every request
{
  'X-Tenant-ID': 'tenant-a',
  'X-Market-ID': 'market-1',
  'Content-Type': 'application/json'
}
```

**Showcase → API**:
```csharp
// API Key in header
{
  'X-API-Key': 'sk_live_...',
  'Content-Type': 'application/json'
}
```

## Project Structure

```
/docs/               # Reference documentation (this folder)
  STATUS.md          # Implementation status
  ARCHITECTURE.md    # This file - tech stack and design
  DEVELOPMENT.md     # Coding standards and workflow
/.claude/commands/   # Slash commands for feature context
/frontend/           # React admin backoffice
  /src/
    /components/     # Reusable UI components
    /pages/          # Route pages
    /services/       # API clients + TanStack Query hooks
    /store/          # Zustand state (auth, cart)
    /types/          # TypeScript interfaces
/api/                # .NET API Backend (EComm.Api + EComm.Data projects)
/showcase-dotnet/    # Demo storefront
```

## Migration to Production Backend

When ready:
1. Keep frontend `.env.local` with `VITE_USE_MOCKS=false`
2. Update `VITE_API_BASE_URL` to production URL
3. Replace SQLite with SQLServer for production
4. Add SQLServer, OAuth2, Redis, etc.
5. Test all flows against production API

## Why These Choices?

**Why .NET API Backend vs MSW?**
- Real HTTP calls (visible in Network tab)
- Cross-platform (admin + showcase both use it)
- Same stack as production backend
- Easy transition (just swap URL)

**Why Zustand?**
- Minimal boilerplate vs Redux
- Built-in localStorage persistence
- TypeScript-first, tiny bundle (~1KB)

**Why TanStack Query?**
- Best cache management for REST APIs
- Optimistic updates built-in
- Excellent DevTools

**Why ASP.NET MVC for Showcase?**
- Different rendering approach (SSR vs SPA)
- Shows platform works with various frameworks
- Familiar to .NET developers
- Closer to real CMS integration patterns
