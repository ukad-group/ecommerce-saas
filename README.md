# eCommerce SaaS MVP

A minimal viable product for a standalone eCommerce back-office solution with market-based multi-tenancy, designed for easy integration with Umbraco, Optimizely, and other CMS platforms.

## Architecture Overview

The system uses a **market-based hierarchy**:
- **Tenant** → Business entity (e.g., retail chain)
- **Market** → Individual store/location within tenant
- **Categories** → Product organization per market
- **Products** → Catalog items per market

This allows each market to have its own unique catalog while remaining under the tenant umbrella.

## Project Philosophy

This project follows a **specification-driven development** approach. We build specifications first, develop UI with API mocks, then implement the actual backend infrastructure.

### Key Principles

1. **API-First**: Define contracts before implementation
2. **Mock-First Development**: Build and validate UI against mock backend
3. **YAGNI**: Only build what's explicitly requested
4. **TDD**: Write tests first, then code
5. **Keep It Simple**: Prefer simple over clever
6. **Multi-Tenant**: Data isolation at tenant and market level

See [CLAUDE.md](CLAUDE.md) for complete project guide and principles.

## Quick Start

New to the project? Start here:

1. **Read [CLAUDE.md](CLAUDE.md)** - Complete project overview, quick start, core principles, and essential info
2. **Check [docs/STATUS.md](docs/STATUS.md)** - Implementation status, what works, what's missing
3. **Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Tech stack and design decisions
4. **Explore [frontend/CLAUDE.md](frontend/CLAUDE.md)** - Frontend development guide

## Project Structure

```
/docs/           # Reference documentation
  STATUS.md          # Implementation status - what works, what's missing
  ARCHITECTURE.md    # Tech stack, data models, design decisions
  DEVELOPMENT.md     # Workflow, coding standards, spec template
/.claude/commands/   # Slash commands for feature context
  ctx-products.md, ctx-orders.md, ctx-rbac.md, ctx-tenants.md

/frontend/       # Admin backoffice React application
  /src/
    /components/ # UI components
    /pages/      # Route pages
    /services/   # API clients and TanStack Query hooks
    /store/      # Zustand state management
    /types/      # TypeScript definitions

/mock-api/       # .NET Mock API Server
  /MockApi/
    /Controllers/  # API endpoints
    /Models/       # Data models and DTOs
    /Data/         # SQLite database with EF Core

/showcase-dotnet/  # Showcase eCommerce website (ASP.NET MVC)
  /ECommShowcase.Web/

CLAUDE.md        # Main project guide (START HERE)
README.md        # This file
```

## Current Status

### Implemented Features

✅ **Product Catalog (001)** - Product and category management
- Create, edit, delete products
- Hierarchical categories
- Quick stock updates
- Product variants support

✅ **Cart & Order Management (002)** - Shopping cart and order processing
- Cart management (add, update, remove items)
- Admin order dashboard with filtering
- Order status workflow

✅ **Role-Based Access Control (003)** - Multi-role authentication
- Superadmin, Tenant Admin, Tenant User roles
- Protected routes and permission checks
- Automatic tenant/market selection

✅ **Tenant & Market Management (004)** - Multi-tenancy support
- Tenant CRUD operations
- Market management per tenant
- API key management

✅ **Mock API Migration** - Complete .NET backend mock
- ASP.NET Core Web API replacing browser mocks
- 8 controllers with full CRUD operations
- Comprehensive seed data

✅ **Showcase Website** - Customer-facing demo
- Product browsing and search
- Shopping cart
- Fake checkout flow

### What's Next

See [CLAUDE.md](CLAUDE.md) for detailed roadmap:
1. Production .NET backend implementation
2. Real database (SQLServer)
3. OAuth2/OIDC authentication
4. Email notifications
5. Advanced inventory management

## Technology Stack

### Admin Backoffice
- **Framework**: React 18 with TypeScript 5
- **Build Tool**: Vite 5
- **State Management**: Zustand 4
- **Data Fetching**: TanStack Query v5
- **Styling**: Tailwind CSS + Headless UI
- **Port**: http://localhost:5173

### Mock API Server
- **Framework**: ASP.NET Core 9.0 Web API
- **Language**: C# 12
- **Database**: SQLite with Entity Framework Core
- **Port**: http://localhost:5180

### Showcase Website
- **Framework**: ASP.NET Core 9.0 MVC
- **Styling**: Bootstrap 5
- **Port**: http://localhost:5025

### Production Backend (Planned)
- **Framework**: .NET 8+ (ASP.NET Core)
- **Database**: SQLServer (multi-tenant)
- **API**: RESTful with OpenAPI/Swagger
- **Auth**: OAuth2/OIDC
- **Caching**: Redis
- **Deployment**: Docker/Kubernetes

## Running the Application

The application consists of three separate services:

### 1. Mock API Server (Required)
```bash
cd mock-api/MockApi
dotnet run
# Starts on http://localhost:5180
```

### 2. Admin Backoffice
```bash
cd frontend
npm install  # First time only
npm run dev
# Starts on http://localhost:5173
```

Environment configuration (frontend/.env.local):
```bash
VITE_TENANT_ID=tenant-a
VITE_API_BASE_URL=http://localhost:5180/api/v1
VITE_USE_MOCKS=false
```

### 3. Showcase Website (Optional)
```bash
cd showcase-dotnet/ECommShowcase.Web
dotnet run
# Starts on http://localhost:5025
```

### Available Routes

**Admin Backoffice** (http://localhost:5173):
- `/login` - Login with profile selection
- `/admin` - Dashboard with metrics
- `/admin/products` - Product management
- `/admin/categories` - Category management
- `/admin/orders` - Order management
- `/admin/tenants` - Tenant management (superadmin)

**Showcase Website** (http://localhost:5025):
- `/` - Home page with featured products
- `/products` - Product catalog
- `/products/{id}` - Product details
- `/cart` - Shopping cart
- `/checkout` - Fake checkout flow

## Multi-Tenancy & Market Isolation

The system implements two-level data isolation:

**Tenant Level**:
- Tenants are completely isolated business entities
- Each tenant can have multiple markets

**Market Level**:
- Products, categories, and orders are market-specific
- Each market has its own catalog
- API calls include `X-Tenant-ID` and `X-Market-ID` headers

**Access Control**:
- **Superadmin**: All tenants and markets
- **Tenant Admin**: All markets within their tenant
- **Tenant User**: Specific assigned markets only

See [CLAUDE.md](CLAUDE.md#multi-tenancy--market-isolation) for details.

## Development Workflow

### 1. Check Status
Check [docs/STATUS.md](docs/STATUS.md) for what's implemented and what's missing.

### 2. Create Feature Specification
Document in `specs/[number]-[feature-name]/spec.md`:
- User stories with acceptance criteria
- Functional requirements
- Data models

### 3. Create Technical Plan
Document in `plan.md`:
- API contracts (OpenAPI)
- Component architecture
- Testing strategy

### 4. Implement with TDD
- Write tests first
- Implement features
- Validate against spec

## Contributing

### Development Process
1. Review relevant feature specification in `/specs/`
2. Check task status in `tasks.md`
3. Follow TDD workflow
4. Update documentation
5. Create PR with spec reference

### Coding Standards
- TypeScript strict mode
- 80%+ test coverage
- Follow component patterns in frontend/CLAUDE.md
- API contracts follow OpenAPI 3.0

### Git Workflow
- Feature branches: `feature/[spec-number]-[short-name]`
- Descriptive commit messages
- Link commits to spec/task numbers
- PR requires review and passing tests

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Main project guide with core principles (START HERE)
- **[docs/STATUS.md](docs/STATUS.md)** - Implementation status
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Tech stack and design
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Development workflow
- **[frontend/CLAUDE.md](frontend/CLAUDE.md)** - Frontend guide
- **[mock-api/CLAUDE.md](mock-api/CLAUDE.md)** - Mock API guide
- **[showcase-dotnet/CLAUDE.md](showcase-dotnet/CLAUDE.md)** - Showcase guide

## Key Features

### API-First Development
Every feature starts with OpenAPI contracts and mock implementation before real backend work.

### Mock Backend Architecture
.NET Mock API provides realistic development environment, easily replaceable with production backend.

### Test-Driven Development
All code follows TDD: tests first, then implementation. Minimum 80% coverage required.

### Multi-Tenant SaaS
Designed for SaaS from day one with tenant isolation at data and API level.

## Getting Help

- Review [CLAUDE.md](CLAUDE.md) for comprehensive information and core principles
- Check feature-specific CLAUDE.md files for detailed guidance
- See [docs/STATUS.md](docs/STATUS.md) for current implementation status
- Explore [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for workflow and standards

## License

TBD

---

**Last Updated**: 2025-11-12
**Status**: MVP Development Phase - SQLite Database Migration Complete
**Next Major Milestone**: Production Backend Implementation
