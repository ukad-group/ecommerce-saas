# Frontend Application Guide

## Overview

This is the React + TypeScript frontend for the eCommerce SaaS MVP backoffice. The application provides admin interfaces for managing products, categories, orders, and implementing role-based access control across multiple tenants.

## Technology Stack

- **React**: 18.x with TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Routing**: React Router 6.x
- **State Management**: Zustand 4.x (with localStorage persistence)
- **Data Fetching**: TanStack Query v5 (React Query)
- **API Mocking**: Mock Service Worker (MSW) 2.x
- **Styling**: Tailwind CSS + Headless UI
- **Forms**: React Hook Form
- **Testing**: Vitest + React Testing Library

## Project Structure

```
/src/
  /components/          # Reusable UI components
    /admin/            # Admin-specific components
      AdminOrderList.tsx
      OrderFilters.tsx
      OrderStatusBadge.tsx
      OrderStatusUpdate.tsx
      ProductList.tsx
      ProductForm.tsx
      QuickStockUpdate.tsx
      CategoryList.tsx
      CategoryForm.tsx
    /auth/             # Authentication components
      LoginPage.tsx (moved from pages)
      ProfileSelector.tsx
      TenantSelector.tsx
      UserInfo.tsx
      ProtectedRoute.tsx
    /cart/             # Shopping cart components
      CartItem.tsx
      CartSummary.tsx
      CartIndicator.tsx
      EmptyCart.tsx
    /orders/           # Order components
      OrderStatusBadge.tsx
    /common/           # Shared UI components
      Button.tsx
      Input.tsx
      Select.tsx
      LoadingSpinner.tsx
    /layout/           # Layout components
      Navigation.tsx
      Layout.tsx

  /pages/              # Page-level components (route handlers)
    /admin/
      AdminDashboardPage.tsx
      AdminOrdersPage.tsx
      AdminOrderDetailsPage.tsx
      ProductsPage.tsx
      ProductEditPage.tsx
      CategoriesPage.tsx
    LoginPage.tsx
    CartPage.tsx
    OrderHistoryPage.tsx (future)
    OrderDetailsPage.tsx (future)
    CheckoutPage.tsx (future)

  /services/           # API and data services
    /api/
      client.ts        # Base API client (fetch wrapper)
      cartApi.ts       # Cart API methods
      ordersApi.ts     # Orders API methods
      checkoutApi.ts   # Checkout API methods
      adminApi.ts      # Admin API methods
      productsApi.ts   # Products API methods
      categoriesApi.ts # Categories API methods
    /hooks/            # TanStack Query hooks
      useCart.ts
      useOrders.ts
      useCheckout.ts
      useAdminOrders.ts
      useProducts.ts
      useCategories.ts
    /auth/
      authService.ts   # Authentication logic

  /store/              # Zustand state management
    authStore.ts       # Auth session state
    cartStore.ts       # Cart state (syncs with API)
    checkoutStore.ts   # Checkout flow state

  /mocks/              # Mock Service Worker setup
    /handlers/
      cartHandlers.ts
      ordersHandlers.ts
      checkoutHandlers.ts
      adminHandlers.ts
      productsHandlers.ts
      categoriesHandlers.ts
    /data/
      mockProfiles.ts
      mockTenants.ts
      mockProducts.ts
      mockCategories.ts
      mockOrders.ts
      mockCustomers.ts
    browser.ts         # MSW browser setup
    server.ts          # MSW server setup (for tests)

  /types/              # TypeScript interfaces and types
    auth.ts            # UserProfile, Role, UserSession
    product.ts         # Product, Category, Variant
    order.ts           # Order, OrderLineItem, OrderStatus
    address.ts         # ShippingAddress, BillingAddress
    payment.ts         # PaymentTransaction
    customer.ts        # Customer
    api.ts             # API request/response types

  /utils/              # Helper functions
    authGuards.ts      # Permission checks
    currency.ts        # Currency formatting
    validation.ts      # Form validation
    storage.ts         # localStorage helpers
    orderHelpers.ts    # Order status logic

  /App.tsx             # Main app component
  /main.tsx            # Entry point (enables MSW)
  /router.tsx          # React Router configuration

/tests/                # Component and integration tests
  /components/
  /integration/
  setup.ts             # Test configuration

/public/               # Static assets

/index.html
/vite.config.ts        # Vite configuration
/tsconfig.json         # TypeScript configuration
/tailwind.config.js    # Tailwind CSS configuration
/package.json
```

## Getting Started

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
# Opens at http://localhost:5176
```

### Build for Production
```bash
npm run build
npm run preview  # Preview production build
```

### Testing
```bash
npm run test              # Run unit tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Environment Configuration

Create a `.env.local` file in the frontend directory:

```bash
# Tenant Configuration
VITE_TENANT_ID=demo-tenant

# API Configuration
VITE_API_BASE_URL=http://localhost:5176/api

# Mock Service Worker
VITE_USE_MOCKS=true                  # Set to false to use real backend API

# Feature Flags (optional)
VITE_ENABLE_CHECKOUT=true
VITE_ENABLE_CART_PERSISTENCE=false
```

## Available Routes

### Public Routes
- `/login` - Login page with profile selection

### Protected Admin Routes (Require Authentication)
- `/admin` - Dashboard with metrics and recent orders
- `/admin/products` - Product list and management
- `/admin/products/new` - Create new product
- `/admin/products/:id` - Edit product
- `/admin/categories` - Category management
- `/admin/orders` - Order list with filtering
- `/admin/orders/:id` - Order details

### Customer Routes (Some Not Yet Implemented)
- `/cart` - Shopping cart (implemented)
- `/checkout` - Checkout wizard (not implemented - API ready)
- `/orders` - Order history (not implemented)
- `/orders/:id` - Order details (not implemented)

## Mock Service Worker (MSW)

The application uses MSW to mock backend API responses during development.

### How It Works
1. MSW intercepts network requests at the service worker level
2. Requests appear in browser Network tab as real requests
3. Handlers return mock data based on request parameters
4. Works in both browser and test environments

### Mock Data Location
All mock data is in `src/mocks/data/`:
- **mockProfiles.ts**: 3 hardcoded user profiles
- **mockTenants.ts**: 3 sample tenants
- **mockProducts.ts**: 20+ products with variants
- **mockCategories.ts**: Hierarchical category tree
- **mockOrders.ts**: 10+ orders in various statuses
- **mockCustomers.ts**: Customer profiles

### Disabling Mocks
To use a real backend API:
1. Set `VITE_USE_MOCKS=false` in `.env.local`
2. Update `VITE_API_BASE_URL` to backend URL
3. Ensure backend implements the same API contracts

### Adding New Mock Endpoints
1. Create handler in `src/mocks/handlers/`:
```typescript
// src/mocks/handlers/myHandlers.ts
import { http, HttpResponse } from 'msw';

export const myHandlers = [
  http.get('/api/v1/my-endpoint', () => {
    return HttpResponse.json({ data: 'mock data' });
  }),
];
```

2. Register in `src/mocks/browser.ts`:
```typescript
import { myHandlers } from './handlers/myHandlers';

export const worker = setupWorker(
  ...cartHandlers,
  ...myHandlers,
);
```

## State Management

### Zustand Stores

#### authStore
**Purpose**: Manage authentication session
**Persistence**: localStorage
**Key Methods**:
- `login(profileId, tenantId?)` - Authenticate user
- `logout()` - Clear session
- `isAuthenticated()` - Check auth status
- `hasPermission(permission)` - Check permissions

#### cartStore
**Purpose**: Manage shopping cart state
**Persistence**: localStorage (future)
**Key Methods**:
- `addItem(product, quantity)` - Add to cart
- `updateQuantity(lineItemId, quantity)` - Update quantity
- `removeItem(lineItemId)` - Remove from cart
- `clearCart()` - Clear all items

#### checkoutStore
**Purpose**: Manage checkout flow state
**Persistence**: sessionStorage
**Key Methods**:
- `setShippingAddress(address)` - Save shipping
- `setBillingAddress(address)` - Save billing
- `setPaymentMethod(method)` - Save payment method
- `reset()` - Clear checkout state

### TanStack Query

Used for server state management (data fetching, caching, mutations).

**Key Hooks**:
- `useCart()` - Get current cart
- `useAddToCart()` - Mutation to add item
- `useUpdateCartItem()` - Mutation to update quantity
- `useProducts()` - Get product list
- `useProduct(id)` - Get single product
- `useAdminOrders()` - Get orders with filters
- `useUpdateOrderStatus()` - Mutation to update status

**Query Keys Convention**:
```typescript
// Query keys for cache management
['cart']
['products']
['products', productId]
['admin', 'orders', filters]
['admin', 'orders', orderId]
```

## API Client

### Base Client
Located in `src/services/api/client.ts`, provides:
- Fetch wrapper with error handling
- Request/response interceptors
- Auth header injection
- Tenant context header (X-Tenant-ID)
- Error normalization

### API Services
Each feature has its own API service file:
- **cartApi.ts**: Cart operations
- **ordersApi.ts**: Customer order operations
- **checkoutApi.ts**: Checkout flow
- **adminApi.ts**: Admin order management
- **productsApi.ts**: Product CRUD
- **categoriesApi.ts**: Category CRUD

### API Contract
All APIs follow OpenAPI 3.0 specifications (see `/specs/*/contracts/`).

**Base URL**: `/api/v1/`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {token} (future)
X-Tenant-ID: {tenantId} (for scoped roles)
```

**Response Format**:
```typescript
// Success
{ data: T, meta?: { total, page, limit } }

// Error
{ error: string, details?: any }
```

## Component Patterns

### Page Components
- Located in `/pages/`
- Handle routing and data fetching
- Compose smaller components
- Minimal business logic

Example:
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
- Located in `/components/{feature}/`
- Reusable across pages
- Self-contained with props
- Use hooks for data/state

Example:
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
- Located in `/components/common/`
- Generic UI components
- No business logic
- Highly reusable

Example:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <button className={cn('btn', `btn-${variant}`)} {...props} />;
}
```

## Styling

### Tailwind CSS
- Utility-first CSS framework
- Configured in `tailwind.config.js`
- Custom theme colors and spacing

### Headless UI
- Unstyled, accessible UI components
- Used for: Dropdown, Dialog, Tabs, etc.
- Styled with Tailwind classes

### Component Styling Pattern
```typescript
// Use cn() utility for conditional classes
import { cn } from '@/utils/cn';

export function Badge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn(
      'px-2 py-1 rounded-full text-xs font-medium',
      status === 'paid' && 'bg-green-100 text-green-800',
      status === 'pending' && 'bg-yellow-100 text-yellow-800',
    )}>
      {status}
    </span>
  );
}
```

## Authentication Flow

### Login
1. User navigates to `/login`
2. Selects profile from dropdown
3. If not superadmin, selects tenant
4. Clicks "Login"
5. authStore.login() creates session
6. Redirects to `/admin`

### Protected Routes
1. User tries to access `/admin/*`
2. ProtectedRoute checks authStore.isAuthenticated()
3. If authenticated: render route
4. If not: redirect to `/login`

### Logout
1. User clicks "Logout" in header
2. authStore.logout() clears session
3. Redirects to `/login`

## Multi-Tenancy

### Tenant Context
- Stored in authStore: `selectedTenantId`
- Superadmin: tenantId = null (see all)
- Tenant Admin/User: tenantId = selected tenant

### Data Filtering
```typescript
// In API calls
const headers = {
  'X-Tenant-ID': authStore.getState().session?.selectedTenantId,
};

// In MSW handlers
http.get('/api/v1/products', ({ request }) => {
  const tenantId = request.headers.get('X-Tenant-ID');
  const products = mockProducts.filter(p =>
    !tenantId || p.tenantId === tenantId
  );
  return HttpResponse.json({ data: products });
});
```

## Testing

### Unit Tests
Test individual components and functions:
```typescript
import { render, screen } from '@testing-library/react';
import { ProductList } from './ProductList';

test('renders product list', () => {
  const products = [{ id: '1', name: 'Test Product', price: 100 }];
  render(<ProductList products={products} />);
  expect(screen.getByText('Test Product')).toBeInTheDocument();
});
```

### Integration Tests
Test feature workflows with MSW:
```typescript
import { renderWithProviders } from '@/tests/setup';
import { CartPage } from './CartPage';

test('add product to cart', async () => {
  const { user } = renderWithProviders(<CartPage />);

  await user.click(screen.getByText('Add to Cart'));

  expect(await screen.findByText('1 item in cart')).toBeInTheDocument();
});
```

### Test Setup
- MSW server configured in `tests/setup.ts`
- Custom render with providers (Router, Query, etc.)
- Mock data automatically loaded

## Performance Optimization

### Code Splitting
- Route-based code splitting via React.lazy()
- Component lazy loading for heavy features

### Caching
- TanStack Query caches API responses
- Stale-while-revalidate strategy
- Background refetching

### Bundle Optimization
- Vite tree-shaking
- Dynamic imports for large dependencies
- Analyze bundle with `npm run build -- --analyze`

## Common Tasks

### Add New Page
1. Create component in `/pages/`
2. Add route in `router.tsx`
3. Add navigation link in `Navigation.tsx`

### Add New API Endpoint
1. Add method in appropriate service file (e.g., `productsApi.ts`)
2. Create TanStack Query hook in `/services/hooks/`
3. Add MSW handler in `/mocks/handlers/`
4. Use hook in component

### Add New Feature
1. Create feature directory in `/components/{feature}/`
2. Create page in `/pages/`
3. Add API service in `/services/api/`
4. Create mock handlers
5. Add route and navigation

### Update Mock Data
1. Edit files in `/mocks/data/`
2. Data persists only in memory (resets on refresh)
3. For persistent testing, use localStorage in handlers

## Troubleshooting

### MSW Not Intercepting
- Check browser console for MSW registration message
- Verify handler is registered in `browser.ts`
- Check handler path matches request URL

### TypeScript Errors
- Run `npm run type-check` to see all errors
- Ensure types match API contracts
- Check import paths are correct

### Build Errors
- Clear node_modules and reinstall
- Delete `.vite` cache directory
- Check for circular dependencies

### State Not Persisting
- Check localStorage in DevTools
- Verify Zustand persist middleware is configured
- Check for localStorage quota exceeded

### Route Not Working
- Verify route is defined in `router.tsx`
- Check if route is wrapped in ProtectedRoute
- Ensure user is authenticated

## Best Practices

### Component Design
- Keep components small and focused
- Extract reusable logic into hooks
- Use TypeScript for type safety
- Write props interfaces explicitly

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
- Keep responsive design in mind
- Follow accessibility best practices

## Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TanStack Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)
- [MSW Documentation](https://mswjs.io)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)

## Project Links

- Main Project Guide: [../CLAUDE.md](../CLAUDE.md)
- Feature Specifications: [../specs/CLAUDE.md](../specs/CLAUDE.md)
- Constitution: [../memory/constitution.md](../memory/constitution.md)

---

**Last Updated**: 2025-10-28
**Current Version**: MVP Phase
**Next Major Update**: Checkout UI Implementation
