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
2. **Mock-First UI**: Build and validate UI against mocks
3. **Multi-Platform Ready**: Easy CMS integration
4. **SaaS-First**: Multi-tenant from day one
5. **MVP Focus**: Core features only, defer complexity

See [memory/constitution.md](memory/constitution.md) for complete project principles and guidelines.

## Quick Start

New to the project? Start here:

1. **Read [CLAUDE.md](CLAUDE.md)** - Complete project overview, technology stack, and getting started guide
2. **Review [memory/constitution.md](memory/constitution.md)** - Core principles and guidelines
3. **Check [specs/CLAUDE.md](specs/CLAUDE.md)** - Feature specifications overview
4. **Explore [frontend/CLAUDE.md](frontend/CLAUDE.md)** - Frontend development guide

## Project Structure

```
/specs/          # Feature specifications (see specs/CLAUDE.md)
  /001-product-catalog/
    spec.md      # Detailed feature specification
    plan.md      # Technical implementation plan
    tasks.md     # Task breakdown with status
    CLAUDE.md    # Feature guide and quick reference
  /002-cart-order-management/
  /003-role-based-access/
  CLAUDE.md      # Specifications directory guide

/memory/         # Project constitution and core principles
  constitution.md

/frontend/       # React + TypeScript frontend application
  /src/
    /components/ # UI components
    /pages/      # Route pages
    /services/   # API clients and hooks
    /mocks/      # MSW mock handlers
    /store/      # Zustand state management
    /types/      # TypeScript definitions
  CLAUDE.md      # Frontend development guide

/docs/           # Additional documentation

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

⚠️ **Role-Based Access Control (003)** - Multi-role authentication
- Superadmin login complete
- Tenant admin/user flows in progress

### What's Next

See [CLAUDE.md](CLAUDE.md) for detailed roadmap and priorities:
1. Complete RBAC tenant filtering
2. Implement checkout UI (API ready)
3. Add cart persistence
4. Begin .NET backend implementation

## Technology Stack

### Frontend (Implemented)
- **Framework**: React 18 with TypeScript 5
- **Build Tool**: Vite 5
- **Routing**: React Router 6
- **State Management**: Zustand 4
- **Data Fetching**: TanStack Query v5
- **API Mocking**: Mock Service Worker (MSW) 2
- **Styling**: Tailwind CSS + Headless UI
- **Testing**: Vitest + React Testing Library

### Backend (Planned)
- **Framework**: .NET 8+ (ASP.NET Core)
- **Database**: PostgreSQL (multi-tenant)
- **API**: RESTful with OpenAPI/Swagger
- **Auth**: OAuth2/OIDC
- **Deployment**: Docker/Kubernetes

## Development Workflow

### 1. Review Existing Specifications
Check [specs/CLAUDE.md](specs/CLAUDE.md) for implemented and planned features.

### 2. Create Feature Specification
Document requirements in `specs/[number]-[feature-name]/spec.md`:
- User stories with acceptance criteria
- Functional requirements
- Success criteria
- Data models

### 3. Create Technical Plan
Document implementation approach in `plan.md`:
- Technical context
- API contracts (OpenAPI)
- Component architecture
- Testing strategy

### 4. Break Down Tasks
Create actionable task list in `tasks.md` with status tracking.

### 5. Implement with TDD
Follow Test-Driven Development:
- Write tests first
- Implement features
- Validate against spec
- Update task status

## Running the Application

### Frontend Development Server
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5176
```

### Environment Configuration
Create `frontend/.env.local`:
```bash
VITE_TENANT_ID=demo-tenant
VITE_API_BASE_URL=http://localhost:5176/api
VITE_USE_MOCKS=true  # Use MSW for API mocking
```

### Available Routes
- `/login` - Login page (hardcoded profiles)
- `/admin` - Admin dashboard
- `/admin/products` - Product management
- `/admin/categories` - Category management
- `/admin/orders` - Order management
- `/cart` - Shopping cart

See [frontend/CLAUDE.md](frontend/CLAUDE.md) for complete frontend guide.

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

## Contributing

### Development Process
1. Review relevant feature specification in `/specs/`
2. Check task status in `tasks.md`
3. Follow TDD workflow
4. Update documentation as needed
5. Create PR with spec reference

### Coding Standards
- TypeScript strict mode
- 80%+ test coverage
- Component patterns documented in frontend/CLAUDE.md
- API contracts follow OpenAPI 3.0

### Git Workflow
- Feature branches: `feature/[spec-number]-[short-name]`
- Descriptive commit messages
- Link commits to spec/task numbers
- PR requires review and passing tests

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Main project guide (START HERE)
- **[memory/constitution.md](memory/constitution.md)** - Core principles
- **[specs/CLAUDE.md](specs/CLAUDE.md)** - Feature specifications guide
- **[frontend/CLAUDE.md](frontend/CLAUDE.md)** - Frontend development guide
- **Feature specs** - Detailed specs in `/specs/[feature]/`

## Key Features

### API-First Development
Every feature starts with OpenAPI contracts and MSW mocks before any real backend implementation.

### Mock-First UI
UI is built and validated against mocks first, ensuring UX is perfect before backend work begins.

### Test-Driven Development
All code follows TDD: tests first, then implementation. Minimum 80% coverage required.

### Multi-Tenant Architecture
Designed for SaaS from day one with tenant isolation at data and API level.

## Getting Help

- Review [CLAUDE.md](CLAUDE.md) for comprehensive project information
- Check feature-specific CLAUDE.md files for detailed guidance
- See [memory/constitution.md](memory/constitution.md) for core principles
- Explore `/specs/` for feature specifications

## License

TBD

---

**Last Updated**: 2025-10-28
**Status**: MVP Development Phase
**Next Major Milestone**: Complete RBAC and Checkout UI
