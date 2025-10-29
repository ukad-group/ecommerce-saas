# eCommerce SaaS MVP - Project Guide

## Project Overview

This is a headless eCommerce SaaS platform MVP with a multi-tenant, market-based architecture. The system consists of:

1. **SaaS Backoffice**: Admin UI/UX for managing markets, products, variants, categories, orders, and tenants
2. **Backoffice APIs**: RESTful APIs for the admin interface (currently mocked with MSW, real backend to be implemented)
3. **Client APIs**: Separate APIs for storefront integrations (future phase)
4. **CMS Plugins & SDKs**: Framework-specific integrations for Umbraco, Optimizely, etc. (future phase)

### Data Hierarchy

The system follows a market-based hierarchy:

```
Tenant (Business Entity - e.g., Retail Chain)
└── Markets (Individual Stores/Locations)
    └── Categories (Product Organization)
        └── Products (Catalog Items)
```

**Key Concepts**:
- **Tenant**: A business entity using the platform (e.g., "ABC Retail Group")
- **Market**: A specific store or sales channel within a tenant (e.g., "Downtown Store", "Airport Location")
- **Categories**: Product categories specific to each market
- **Products**: Catalog items specific to each market

This allows each market to have its own unique catalog, categories, and product offerings while remaining under the same tenant umbrella.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript 5
- **Build Tool**: Vite 5
- **Routing**: React Router 6
- **State Management**: Zustand 4 (with localStorage persistence)
- **Data Fetching**: TanStack Query v5
- **API Mocking**: Mock Service Worker (MSW) 2
- **Styling**: Tailwind CSS + Headless UI
- **Forms**: React Hook Form
- **Testing**: Vitest + React Testing Library

### Backend (Future Phase)
- **.NET**: 8+ with ASP.NET Core
- **Database**: PostgreSQL (multi-tenant ready)
- **API Documentation**: OpenAPI/Swagger
- **Authentication**: OAuth2/OIDC

## Core Principles

### I. API-First Development
Every feature starts with a well-defined API contract and mock implementation. The UI must be developed against API mocks first, validated visually and functionally, before any real backend implementation begins.

**Why**: Ensures clear separation of concerns, early validation of UX, parallel development capability, and integration flexibility for multiple CMS platforms.

### II. Mock-First UI Development
UI components must be built and validated against mock data before backend implementation:
- Create realistic mock data representing all edge cases
- Validate UI/UX thoroughly with stakeholders using mocks
- Ensure responsive design and accessibility before backend work
- Document expected API contracts through mock implementations

### III. Multi-Platform Integration Ready
Design all features to support easy integration with various CMS platforms:
- Clean API boundaries with no platform-specific coupling
- Standardized authentication and authorization patterns
- Webhook and event-driven architecture support
- Embeddable components with minimal dependencies

### IV. Minimal Viable Product Focus (YAGNI)
**Stick to YAGNI principle**: If something isn't specifically requested, it isn't needed. Whether it is a model field, a button, a page, or popup.

**Start with core eCommerce functionality only**:
- Product catalog management
- Shopping cart and checkout
- Order management
- Basic customer accounts
- Payment processing integration
- Essential admin back-office tools

**Defer complex features like**:
- Advanced inventory management
- Multi-warehouse support
- Complex promotions and discounts
- Marketplace features

### V. SaaS-First Architecture
Design for multi-tenancy from day one:
- Clear tenant isolation at data and API level
- Configuration per tenant (branding, features, limits)
- Scalable infrastructure considerations
- Subscription and billing awareness

### VI. Test-Driven Development (NON-NEGOTIABLE)
All features must follow TDD workflow:
1. Define feature specification (what and why)
2. Create API contracts and mocks
3. Write UI tests against mocks
4. Implement UI with mocks
5. Write backend API tests
6. Implement backend
7. Integration testing
8. User acceptance validation

### VII. Simplicity and Clarity
- Prefer simple, well-understood patterns over clever solutions
- Code should be self-documenting with clear naming
- Architecture should be easy to explain to new team members
- Dependencies should be minimal and well-justified

## Development Workflow

### Specification Phase
1. Create feature specification document (spec.md)
2. Validate specification completeness
3. Stakeholder review and approval
4. Update specification during development as needed

### Planning Phase
1. Create technical plan (plan.md)
2. Define API contracts (OpenAPI specification)
3. Create mock implementations
4. Break down into tasks (tasks.md)

### Implementation Phase
1. Implement UI with mocks first
2. Validate UI/UX with stakeholders
3. Implement backend to match API contract
4. Integration testing
5. Deployment to staging environment

### Quality Gates
- All code must have tests (minimum 80% coverage)
- All APIs must have OpenAPI documentation
- All PRs require code review and passing CI/CD
- No direct commits to main branch

## Project Structure

```
/specs/                          # Feature specifications
  /001-product-catalog/
  /002-cart-order-management/
  /003-role-based-access/
/memory/                         # Project constitution and shared knowledge
/frontend/                       # Frontend React application
  /src/
    /components/                 # Reusable UI components
      /cart/
      /orders/
      /checkout/
      /admin/
      /auth/
      /common/
    /pages/                      # Page-level components (routes)
    /services/                   # API client abstraction
      /api/
      /hooks/                    # TanStack Query hooks
    /mocks/                      # MSW mock API handlers
      /handlers/
      /data/
    /store/                      # Zustand state management
    /types/                      # TypeScript interfaces
    /utils/                      # Helper functions
  /tests/                        # Component and integration tests
/docs/                           # Additional documentation
```

### Feature Branch Naming
- Pattern: `feature/[spec-number]-[short-name]`
- Example: `feature/001-product-catalog`
- Each feature corresponds to one specification

## Implemented Features

### 1. Product Catalog Management (Feature 001)
**Status**: Partially Implemented

**What Works**:
- Product CRUD operations
- Category management with hierarchical structure
- Product variants and custom properties support
- Quick stock updates
- Product status management (Active/Inactive/Draft)

**Key Components**:
- ProductsPage, ProductList, ProductForm
- CategoriesPage, CategoryList, CategoryForm
- QuickStockUpdate component

**API Endpoints** (Mocked):
- `GET/POST /api/v1/products`
- `GET/PUT/DELETE /api/v1/products/:id`
- `GET/POST /api/v1/categories`
- `GET/PUT/DELETE /api/v1/categories/:id`

### 2. Cart & Order Management (Feature 002)
**Status**: Partially Implemented

**What Works**:
- Shopping cart view with line items
- Add/update/remove cart items
- Cart totals calculation
- Admin order dashboard with metrics
- Order list with filtering (status, tenant, date, search)
- Order details view
- Order status updates with notes
- Stock warnings

**What's Missing**:
- Checkout UI (forms and pages) - API infrastructure ready
- Customer-facing order tracking
- Cart persistence across sessions
- Refund workflows
- Cart abandonment tracking

**Key Components**:
- CartPage, CartItem, CartSummary, CartIndicator
- AdminDashboardPage, AdminOrdersPage, AdminOrderDetailsPage
- OrderStatusUpdate, OrderFilters, OrderStatusBadge

**API Endpoints** (Mocked):
- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PUT /api/v1/cart/items/:id`
- `DELETE /api/v1/cart/items/:id`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/:id`
- `PUT /api/v1/admin/orders/:id/status`

### 3. Role-Based Access Control (Feature 003)
**Status**: Partially Implemented

**Implemented**:
- Three user roles: Superadmin, Tenant Admin, Tenant User
- Login page with profile selector
- Tenant selector for scoped roles
- Auth state management with Zustand
- Protected routes
- Session persistence via localStorage
- User info display with logout

**User Roles**:
- **Superadmin**: Full access to all tenants and system functions
- **Tenant Admin**: Full access within selected tenant
- **Tenant User**: View all within tenant, edit only products/categories

**What's Missing**:
- Tenant admin and tenant user login flows (only superadmin complete)
- Permission-based UI element hiding/disabling
- Tenant data filtering in API calls

**Key Components**:
- LoginPage, ProfileSelector, TenantSelector
- UserInfo component in navigation
- ProtectedRoute wrapper
- authStore (Zustand)

### 4. Tenant & Market Management (Feature 004)
**Status**: In Development

**Implementation Plan**:

#### Data Models

**Enhanced Tenant Type**:
```typescript
interface Tenant {
  id: string;
  name: string;           // Unique slug
  displayName: string;
  status: 'active' | 'inactive';
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  settings?: {
    maxMarkets?: number;
    maxUsers?: number;
    features?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Enhanced Market Type**:
```typescript
interface Market {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: 'physical' | 'online' | 'hybrid';
  status: 'active' | 'inactive';
  currency: string;
  timezone: string;
  address?: Address;
  apiKeyCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**API Key Type**:
```typescript
interface ApiKey {
  id: string;
  tenantId: string;
  marketId: string;
  name: string;           // Descriptive name
  keyHash: string;        // Never store plain text
  lastFourChars: string;
  status: 'active' | 'revoked';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

interface ApiKeyCreationResponse {
  id: string;
  key: string;            // Full key (shown only once)
  name: string;
  marketId: string;
  createdAt: Date;
}
```

#### Component Structure
```
/components
  /tenants
    TenantList.tsx
    TenantForm.tsx
    TenantFilters.tsx
    TenantStatusBadge.tsx
  /markets
    MarketList.tsx
    MarketForm.tsx
    MarketFilters.tsx
    MarketTypeBadge.tsx
  /api-keys
    ApiKeyList.tsx
    ApiKeyGenerator.tsx
    ApiKeyDisplay.tsx

/pages/admin
  /tenants
    TenantsPage.tsx
    TenantDetailsPage.tsx
  /markets
    MarketsPage.tsx
    MarketDetailsPage.tsx
    ApiKeysPage.tsx
```

#### Mock Implementation

**API Key Generation**:
```typescript
function generateApiKey(): string {
  const prefix = 'sk_live_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const hexString = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + hexString;
}
```

**TanStack Query Hooks**:
- `useTenants()` - List with filters
- `useTenant(id)` - Single tenant
- `useCreateTenant()` - Create mutation
- `useMarkets(tenantId?)` - List markets
- `useMarket(id)` - Single market
- `useApiKeys(marketId)` - List API keys
- `useGenerateApiKey()` - Generate key mutation
- `useRevokeApiKey()` - Revoke key mutation

#### Navigation Updates
- Add "Tenants & Markets" tab for superadmin
- Add "Markets" tab for tenant admin
- Hide for tenant users
- Implement role-based route protection

## Running the Application

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
# Opens at http://localhost:5176
```

### Available Routes

**Public Routes**:
- `/login` - Login page with profile selection

**Admin Routes** (Protected):
- `/admin` - Dashboard with metrics and recent orders
- `/admin/products` - Product management
- `/admin/categories` - Category management
- `/admin/orders` - Order management
- `/admin/orders/:id` - Order details

**Customer Routes** (Future):
- `/cart` - Shopping cart
- `/checkout` - Checkout wizard
- `/orders` - Order history
- `/orders/:id` - Order details

### Mock Data

The application uses Mock Service Worker (MSW) to simulate backend APIs:

**Configuration**:
```bash
# .env.local
VITE_TENANT_ID=demo-tenant
VITE_API_BASE_URL=http://localhost:5176/api
VITE_USE_MOCKS=true  # Set to false to use real API
```

**Mock Users**:
- Superadmin: "Super Admin"
- Tenant Admin: "Admin (Demo Store)" + tenant selector
- Tenant User: "Catalog Manager (Demo Store)" + tenant selector

**Mock Tenants & Markets**:
- **Tenant A** ("Demo Retail Group")
  - Market 1: "Downtown Store"
  - Market 2: "Airport Location"
- **Tenant B** ("Test Retail Chain")
  - Market 1: "Mall Store"
- **Tenant C** ("Sample Corp")
  - Market 1: "Online Store"

## Multi-Tenancy & Market Isolation

The system implements a two-level isolation strategy:

### Tenant Level
- Tenants are completely isolated business entities
- Each tenant can have multiple markets
- Superadmin can see all tenants; Tenant Admin/User see only their tenant

### Market Level
- Each market belongs to exactly one tenant
- Products and categories are market-specific (not tenant-wide)
- Orders are associated with a specific market
- API calls include both `X-Tenant-ID` and `X-Market-ID` headers

**Data Ownership**:
- **Tenant owns**: Markets, users, settings, billing
- **Market owns**: Products, categories, orders, inventory

**Access Control**:
- **Superadmin**: Access all tenants and all markets
- **Tenant Admin**: Access all markets within their tenant
- **Tenant User**: Access specific markets they're assigned to (limited edit rights)

This architecture allows a retail chain (tenant) to manage multiple stores (markets), where each store can have different product catalogs tailored to its location and customer base.

## Performance Standards

- API response time: < 200ms for 95th percentile
- UI first contentful paint: < 1.5s
- Support for 1000 concurrent users (future backend)
- Database queries optimized for multi-tenant scenarios

## Next Steps

### Immediate Priorities
1. **Tenant & Market Management**: Implement tenant/market CRUD with API key support (Feature 004)
2. **Complete Role-Based Access**: Finish tenant admin and tenant user login flows
3. **Implement Checkout UI**: Build checkout forms and pages (API ready)
4. **Cart Persistence**: Add localStorage persistence for guest carts
5. **Backend Implementation**: Start .NET backend following API contracts

### Future Enhancements
- Customer-facing order tracking
- Refund processing workflows
- Cart abandonment detection and recovery
- Payment gateway integration
- Email notifications
- Advanced inventory management
- Product images and media management
- Search and filtering improvements

## Important Notes

### Current Limitations
- **No Real Backend**: All APIs are mocked with MSW
- **Hardcoded Authentication**: Using hardcoded user profiles (not production-ready)
- **No Payment Processing**: Payment flow simulated only
- **No Email Notifications**: Email features not implemented
- **Limited Error Handling**: Basic error handling in place

### Migration Path to Real Backend
When backend is ready:
1. Set `VITE_USE_MOCKS=false` in `.env.local`
2. Update `VITE_API_BASE_URL` to backend URL
3. Ensure backend implements exact OpenAPI contracts
4. Test all flows against real API
5. Fix any contract mismatches

## Key Decisions & Architecture

### Why Mock-First?
- Allows rapid UI/UX iteration without backend dependency
- Validates user flows before backend investment
- Creates clear API contracts that backend must satisfy
- Enables parallel frontend/backend development

### Why Zustand Over Redux?
- Minimal boilerplate (simpler than Redux)
- Built-in persistence middleware
- TypeScript-first design
- Tiny bundle size (~1KB)
- Perfect for cart state and auth state

### Why TanStack Query?
- Best-in-class cache management
- Perfect for REST APIs
- Optimistic updates built-in
- Excellent DevTools
- Framework-agnostic

### Why MSW?
- Intercepts at network level (shows in browser Network tab)
- Works in both browser and tests
- TypeScript support
- Industry standard for API mocking
- Easy to disable when backend ready

## Troubleshooting

### Common Issues

**Cart not persisting**:
- Check localStorage quota
- Clear browser storage and retry
- Verify Zustand persist middleware is configured

**Mock API not intercepting**:
- Ensure MSW worker is registered in `main.tsx`
- Check browser console for MSW startup message
- Verify handlers are registered for the endpoint

**TypeScript errors**:
- Ensure types match OpenAPI contract definitions
- Run `npm run type-check`
- Check that all imports are correct

**Route protection not working**:
- Verify auth state in localStorage
- Check ProtectedRoute wrapper in router.tsx
- Ensure authStore has valid session

## Contributing

### Before Starting Work
1. Read the relevant feature specification in `/specs/`
2. Review the implementation plan (plan.md)
3. Check the tasks list (tasks.md) for what's done/pending
4. Understand the API contracts (if working on backend)

### Coding Standards
- Use TypeScript strict mode
- Follow existing component patterns
- Write tests for new features
- Update CLAUDE.md if adding significant functionality
- Document complex logic with comments

### Git Workflow
- Create feature branch: `feature/[spec-number]-[short-name]`
- Commit frequently with clear messages
- Reference spec/task numbers in commits
- Create PR when feature complete
- Ensure CI/CD passes before merging

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Mock Service Worker](https://mswjs.io)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com)

## Version History

- **v1.0** (2025-10-22): Initial project setup with constitution
- **v1.1** (2025-10-23): Product catalog feature
- **v1.2** (2025-10-24): Cart and order management feature
- **v1.3** (2025-10-24): Role-based access control feature
- **v1.4** (2025-10-29): Tenant & Market Management specification (Feature 004)

---

**Last Updated**: 2025-10-29
**Status**: Active Development - MVP Phase
