# Frontend Application Guide

## Overview

React + TypeScript admin backoffice for the eCommerce SaaS MVP. Manages markets, products, categories, orders, and role-based access across multiple tenants.

### Market-Based Architecture

```
Tenant (Business Entity)
└── Markets (Stores/Locations)
    └── Categories (Product Organization)
        └── Products (Catalog Items)
```

- Products and categories are market-specific (not tenant-wide)
- Orders belong to specific markets
- Users have tenant-level access with optional market restrictions
- API calls include `X-Tenant-ID` and `X-Market-ID` headers

## Technology Stack

- **React**: 18.x with TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Routing**: React Router 6.x
- **State Management**: Zustand 4.x (localStorage persistence)
- **Data Fetching**: TanStack Query v5
- **Styling**: Tailwind CSS + Headless UI
- **Forms**: React Hook Form
- **Testing**: Vitest + React Testing Library
- **Backend**: .NET Mock API (http://localhost:5180)

## Project Structure

```
/src/
  /components/          # Reusable UI components
    /admin/            # AdminOrderList, ProductList, ProductForm, etc.
    /auth/             # LoginPage, ProfileSelector, TenantSelector, UserInfo
    /cart/             # CartItem, CartSummary, CartIndicator
    /orders/           # OrderStatusBadge
    /common/           # Button, Input, Select, LoadingSpinner
    /layout/           # Navigation, Layout
    /tenants/          # TenantList, TenantForm, MarketList

  /pages/              # Route handlers
    /admin/            # AdminDashboardPage, AdminOrdersPage, ProductsPage, etc.
    LoginPage.tsx
    CartPage.tsx

  /services/           # API and data services
    /api/
      client.ts        # Base API client (fetch wrapper)
      cartApi.ts       # Cart endpoints
      ordersApi.ts     # Orders endpoints
      adminApi.ts      # Admin endpoints
      productsApi.ts   # Products endpoints
      categoriesApi.ts # Categories endpoints
    /hooks/            # TanStack Query hooks
      useCart.ts, useOrders.ts, useProducts.ts, etc.

  /store/              # Zustand state management
    authStore.ts       # Auth session state (persisted)
    cartStore.ts       # Cart state (syncs with API)

  /data/               # Minimal hardcoded data
    tenants.ts         # Tenant/market references for auth selectors
    profiles.ts        # Hardcoded profiles for login

  /types/              # TypeScript interfaces
    auth.ts, product.ts, order.ts, address.ts, market.ts, api.ts

  /utils/              # Helper functions
    authGuards.ts, currency.ts, validation.ts, orderHelpers.ts

  /App.tsx
  /main.tsx            # Entry point
  /router.tsx          # React Router configuration

/tests/                # Tests
  setup.ts

/index.html
/vite.config.ts
/tsconfig.json
/tailwind.config.js
```

## Getting Started

### Prerequisites
Start the .NET Mock API first (required):
```bash
# In separate terminal
cd mock-api/MockApi
dotnet run
# Runs on http://localhost:5180
```

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
# Opens at http://localhost:5173
```

### Build for Production
```bash
npm run build
npm run preview
```

### Testing
```bash
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Type Checking & Linting
```bash
npm run type-check
npm run lint
npm run lint:fix
```

## Environment Configuration

Create `.env.local`:

```bash
# Tenant Configuration
VITE_TENANT_ID=tenant-a

# API Configuration
VITE_API_BASE_URL=http://localhost:5180/api/v1
VITE_USE_MOCKS=false
```

## Available Routes

### Public
- `/login` - Login with profile selection

### Protected Admin (Require Authentication)
- `/admin` - Dashboard with metrics
- `/admin/products` - Product management
- `/admin/products/new` - Create product
- `/admin/products/:id` - Edit product
- `/admin/categories` - Category management
- `/admin/orders` - Order list with filtering
- `/admin/orders/:id` - Order details
- `/admin/tenants` - Tenant management (superadmin)

### Shopping (Partial)
- `/cart` - Shopping cart
- `/checkout` - Not implemented (API ready)
- `/orders` - Not implemented
- `/orders/:id` - Not implemented

## .NET Mock API Integration

The frontend communicates with a .NET Mock API server instead of browser-based mocks.

### API Base URL
- Development: `http://localhost:5180/api/v1`
- Configured in `.env.local` as `VITE_API_BASE_URL`

### Headers
```
Content-Type: application/json
X-Tenant-ID: {tenantId}    # For tenant-scoped data
X-Market-ID: {marketId}    # For market-scoped data
```

### Response Format
```typescript
// Success (varies by endpoint)
Product[]                   // Products, Categories
{ data: Tenant[], total, page, limit }  // Paginated (Tenants)

// Error
{ error: string, details?: any }
```

### Hardcoded Data
Minimal hardcoded data exists only for authentication UI:
- `src/data/tenants.ts` - Tenant/market references for selectors
- `src/data/profiles.ts` - User profiles for login

All other data comes from .NET Mock API seed data.

## State Management

### Zustand Stores

**authStore** (localStorage):
- `login(profileId, tenantId?)` - Authenticate
- `logout()` - Clear session
- `setTenant(tenantId)` - Switch tenant
- `setMarket(marketId)` - Switch market
- `isAuthenticated()` - Check auth
- `hasPermission(permission)` - Check permissions

**cartStore** (future localStorage):
- `addItem(product, quantity)`
- `updateQuantity(lineItemId, quantity)`
- `removeItem(lineItemId)`
- `clearCart()`

### TanStack Query

Server state management with caching.

**Key Hooks**:
- `useCart()` - Current cart
- `useAddToCart()` - Add mutation
- `useProducts()` - Product list
- `useProduct(id)` - Single product
- `useAdminOrders()` - Orders with filters
- `useUpdateOrderStatus()` - Status mutation
- `useTenants()` - Tenant list
- `useMarkets(tenantId)` - Market list

**Query Keys**:
```typescript
['cart']
['products']
['products', productId]
['admin', 'orders', filters]
['tenants', filters]
['markets', tenantId]
```

## API Client

### Base Client
Located in `src/services/api/client.ts`:
- Fetch wrapper with error handling
- Automatic tenant/market context headers
- Error normalization
- Base URL from environment

### API Services
Each feature has dedicated API file:
- `cartApi.ts` - Cart operations
- `ordersApi.ts` - Order operations
- `adminApi.ts` - Admin order management
- `productsApi.ts` - Product CRUD
- `categoriesApi.ts` - Category CRUD

Example:
```typescript
// src/services/api/productsApi.ts
import { apiClient } from './client';

export async function getProducts(): Promise<Product[]> {
  return apiClient.get<Product[]>('/products');
}
```

## Component Patterns

### Page Components
Located in `/pages/` - handle routing and data fetching:
```typescript
export function ProductsPage() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Products</h1>
      <ProductList products={products} />
    </div>
  );
}
```

### Feature Components
Located in `/components/{feature}/` - reusable with props:
```typescript
interface ProductListProps {
  products: Product[];
  onEdit?: (id: string) => void;
}

export function ProductList({ products, onEdit }: ProductListProps) {
  return (
    <ul>
      {products.map(product => (
        <ProductListItem key={product.id} product={product} onEdit={onEdit} />
      ))}
    </ul>
  );
}
```

### Common Components
Located in `/components/common/` - generic UI, no business logic.

## Styling

### Tailwind CSS
Utility-first framework configured in `tailwind.config.js`.

### Headless UI
Unstyled, accessible components (Dropdown, Dialog, Tabs) styled with Tailwind.

### Conditional Classes
```typescript
import { cn } from '@/utils/cn';

<span className={cn(
  'px-2 py-1 rounded-full text-xs',
  status === 'paid' && 'bg-green-100 text-green-800',
  status === 'pending' && 'bg-yellow-100 text-yellow-800',
)}>
  {status}
</span>
```

## Authentication Flow

### Login
1. Navigate to `/login`
2. Select profile
3. If not superadmin, select tenant
4. Click "Login"
5. `authStore.login()` creates session
6. Redirect to `/admin`

### Protected Routes
1. Access `/admin/*`
2. `ProtectedRoute` checks `authStore.isAuthenticated()`
3. Authenticated: render route
4. Not authenticated: redirect to `/login`

### Logout
1. Click "Logout" in header
2. `authStore.logout()` clears session
3. Redirect to `/login`

## Multi-Tenancy & Market Isolation

### Context
- Stored in authStore: `selectedTenantId`, `selectedMarketIds`
- **Superadmin**: See all tenants/markets
- **Tenant Admin**: Selected tenant, all markets
- **Tenant User**: Selected tenant, assigned markets

### Data Filtering
```typescript
// API calls include context headers
const headers = {
  'X-Tenant-ID': session?.selectedTenantId,
  'X-Market-ID': session?.selectedMarketIds?.[0],
};

// Backend filters data accordingly
```

### Auto-Selection
When no tenant/market is selected, first available is auto-selected (see [HeaderTenantSelector.tsx](src/components/auth/HeaderTenantSelector.tsx) and [HeaderMarketSelector.tsx](src/components/auth/HeaderMarketSelector.tsx)).

## Testing

### Unit Tests
```typescript
import { render, screen } from '@testing-library/react';

test('renders product list', () => {
  const products = [{ id: '1', name: 'Test', price: 100 }];
  render(<ProductList products={products} />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Integration Tests
Tests run against .NET Mock API (requires it to be running):
```typescript
test('add product to cart', async () => {
  const { user } = renderWithProviders(<CartPage />);
  await user.click(screen.getByText('Add to Cart'));
  expect(await screen.findByText('1 item')).toBeInTheDocument();
});
```

## Performance

### Code Splitting
- Route-based code splitting via `React.lazy()`
- Component lazy loading for heavy features

### Caching
- TanStack Query caches API responses
- Stale-while-revalidate strategy
- Background refetching

### Bundle Optimization
- Vite tree-shaking
- Dynamic imports for large dependencies

## Common Tasks

### Add New Page
1. Create in `/pages/`
2. Add route in `router.tsx`
3. Add navigation link in `Navigation.tsx`

### Add New API Endpoint
1. Add method in service file (e.g., `productsApi.ts`)
2. Create TanStack Query hook in `/services/hooks/`
3. Use hook in component
4. Backend must implement endpoint in .NET Mock API

### Add New Feature
1. Create directory in `/components/{feature}/`
2. Create page in `/pages/`
3. Add API service in `/services/api/`
4. Add route and navigation
5. Add backend endpoints in mock-api

## Troubleshooting

### API Not Responding
- Ensure .NET Mock API is running on http://localhost:5180
- Check `VITE_API_BASE_URL` in `.env.local`
- Verify backend endpoint exists

### TypeScript Errors
- Run `npm run type-check`
- Ensure types match API contracts
- Check import paths

### Build Errors
- Clear `node_modules` and reinstall
- Delete `.vite` cache
- Check for circular dependencies

### State Not Persisting
- Check localStorage in DevTools
- Verify Zustand persist middleware configured
- Check for quota exceeded

### Route Not Working
- Verify route defined in `router.tsx`
- Check if route needs `ProtectedRoute`
- Ensure authenticated

## Best Practices

### Component Design
- Small, focused components
- Extract reusable logic into hooks
- TypeScript for type safety
- Explicit props interfaces

### State Management
- Server state → TanStack Query
- Client state → Zustand or React state
- Form state → React Hook Form
- Don't duplicate server state in Zustand

### API Calls
- Always use TanStack Query hooks
- Never call API directly in components
- Handle loading and error states
- Use optimistic updates for mutations

### Styling
- Use Tailwind utilities first
- Extract repeated patterns into components
- Responsive design
- Accessibility best practices

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)

## Project Links

- [Main Project Guide](../CLAUDE.md)
- [Feature Specifications](../specs/CLAUDE.md)
- [Constitution](../memory/constitution.md)
- [Mock API Guide](../mock-api/CLAUDE.md)
- [Showcase Guide](../showcase-dotnet/CLAUDE.md)

---

**Last Updated**: 2025-11-04
**Current Version**: MVP Phase - .NET Mock API
**Next Major Update**: Checkout UI Implementation
