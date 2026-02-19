# Frontend - Admin Backoffice Guide

## Overview

React + TypeScript admin backoffice for multi-tenant eCommerce SaaS. Manages markets, products, categories, orders, and tenants.

**Port**: http://localhost:5173

## Context Modules

Claude Code supports `/ctx-*` commands; Codex should open the matching `.claude/commands/*.md` file.

- **`/ctx-products`** - Product catalog implementation details (`.claude/commands/ctx-products.md`)
- **`/ctx-orders`** - Orders and cart implementation details (`.claude/commands/ctx-orders.md`)
- **`/ctx-rbac`** - Role-based access control details (`.claude/commands/ctx-rbac.md`)
- **`/ctx-tenants`** - Tenant and market management details (`.claude/commands/ctx-tenants.md`)

## Tech Stack

- React 18 + TypeScript 5 + Vite 5
- React Router 6 (routing)
- Zustand 4 (state, localStorage persistence)
- TanStack Query v5 (data fetching/caching)
- Tailwind CSS + Headless UI (styling)
- React Hook Form (forms)
- Vitest + React Testing Library (testing)

## Design System

**UKAD Brand Colors** (Consistently applied throughout):
- Primary: `#4a6ba8` - All buttons, links, and interactive elements
- Hover: `#3d5789` - Hover states for interactive elements
- Dark Navy: `#304477` - Text on light backgrounds, dark accents
- Light variants: `#4a6ba8/10`, `#4a6ba8/20` for backgrounds

**Responsive Design**:
- Mobile-first approach with Tailwind breakpoints
- Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
- Navigation: Hamburger menu on mobile/tablet (< 1024px), full nav on desktop (≥ 1024px)
- Tables: Progressive column hiding on smaller screens
- Cards: Mobile card views switch to tables on desktop for products and orders
- Custom hooks: `useMediaQuery()` and `useResponsive()` for breakpoint detection

**Image Optimization**:
- `getThumbnailUrl()` - 100x100px for small thumbnails
- `getMediumImageUrl()` - 600x600px for product cards
- `getLargeImageUrl()` - 1200x1200px for detail views
- Automatic server-side resizing via `/api/v1/files/resize/:tenantId/:marketId/:fileName`

## Quick Start

```bash
npm install      # First time only
npm run dev      # Start dev server
npm run build    # Production build
npm run test     # Run tests
npm run type-check  # TypeScript check
```

**Config** (.env.local):
```bash
VITE_TENANT_ID=tenant-a
VITE_API_BASE_URL=http://localhost:5180/api/v1
VITE_USE_MOCKS=false
```

## Project Structure

```
/src/
  /components/
    /admin/      # ProductList, OrderList, etc.
    /auth/       # LoginPage, ProfileSelector, TenantSelector
    /cart/       # CartItem, CartSummary
    /orders/     # OrderStatusBadge
    /common/     # Button, Input, Select, LoadingSpinner
    /layout/     # Navigation, Layout, MobileMenu
    /tenants/    # TenantList, MarketList

  /pages/        # Route handlers
    /admin/      # AdminDashboardPage, ProductsPage, etc.
    LoginPage.tsx
    CartPage.tsx

  /services/
    /api/        # API client methods
      client.ts           # Base fetch wrapper
      cartApi.ts          # Cart endpoints
      ordersApi.ts        # Orders endpoints
      productsApi.ts      # Products endpoints
      categoriesApi.ts    # Categories endpoints
      tenantsApi.ts       # Tenants endpoints
    /hooks/      # TanStack Query hooks
      useCart.ts, useOrders.ts, useProducts.ts, etc.

  /store/        # Zustand state
    authStore.ts          # Auth session (persisted)
    cartStore.ts          # Cart state (syncs with API)

  /data/         # Minimal hardcoded data
    tenants.ts            # Tenant/market references
    profiles.ts           # Hardcoded user profiles

  /types/        # TypeScript interfaces
    auth.ts, product.ts, order.ts, address.ts, market.ts

  /utils/        # Helper functions
    authGuards.ts, currency.ts, validation.ts
    useMediaQuery.ts      # Responsive breakpoint hooks
    imageHelper.ts        # Image URL optimization

  App.tsx
  main.tsx       # Entry point
  router.tsx     # React Router config
```

## Key Patterns

### API Client
```typescript
// services/api/client.ts - Base client with headers
const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'X-Market-ID': marketId
  }
});
```

### TanStack Query Hooks
```typescript
// services/hooks/useProducts.ts
export function useProducts() {
  return useQuery({
    queryKey: ['products', marketId],
    queryFn: () => productsApi.getProducts(marketId)
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}
```

### Zustand Store
```typescript
// store/authStore.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenantId: null,
      marketId: null,
      login: (user, tenantId, marketId) => set({ user, tenantId, marketId }),
      logout: () => set({ user: null, tenantId: null, marketId: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### Protected Routes
```typescript
// router.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/admin" element={<AdminDashboardPage />} />
  <Route path="/admin/products" element={<ProductsPage />} />
</Route>
```

## Common Tasks

### Add New Product Field
1. Update `types/product.ts` interface
2. Update `components/admin/ProductForm.tsx` form
3. Update API backend (api/EComm.Api/Models/Product.cs)
4. Backend implementation (future)

### Add New Page
1. Create `pages/NewPage.tsx`
2. Add route in `router.tsx`
3. Add navigation link in `components/layout/Navigation.tsx`

### Add New API Endpoint
1. Create method in `services/api/someApi.ts`
2. Create hook in `services/hooks/useSome.ts`
3. Use hook in component
4. Update API

### Add Permission Check
```typescript
const { user } = useAuthStore();
const canEdit = user?.role !== 'tenant_user' ||
                (path === '/admin/products' || path === '/admin/categories');
```

## State Management

**Auth State** (Zustand + localStorage):
- User profile, tenant, market
- Persists across sessions
- Check before API calls

**API Data** (TanStack Query):
- Auto-caching, refetching
- Optimistic updates
- Error handling

**Cart State** (Zustand + API sync):
- Syncs with backend
- Updates on every cart operation

## Styling

**Tailwind CSS**:
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>
```

**Headless UI** (accessible components):
```tsx
import { Dialog, Menu, Listbox } from '@headlessui/react';
```

## Testing

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run type-check     # TypeScript validation
```

**Test Pattern**:
```typescript
import { render, screen } from '@testing-library/react';
import { ProductList } from './ProductList';

test('renders product list', () => {
  render(<ProductList products={mockProducts} />);
  expect(screen.getByText('Product 1')).toBeInTheDocument();
});
```

## Multi-Tenancy

**Headers on every request**:
```typescript
{
  'X-Tenant-ID': 'tenant-a',
  'X-Market-ID': 'market-1'
}
```

**Filtering by role**:
- Superadmin sees all data
- Tenant Admin sees their tenant only
- Tenant User sees their tenant only (limited edit)

## Important Notes

- **Market-scoped**: Products, categories, orders belong to markets (not tenants)
- **Auth headers**: Always send X-Tenant-ID and X-Market-ID
- **No real auth**: Hardcoded profiles for now
- **SQLite Database**: Data persists across restarts (delete ecomm.db to reset)
- **Optimistic updates**: Use TanStack Query mutations

## Troubleshooting

**API calls failing**: Check API backend is running on port 5180

**Auth not working**: Clear localStorage and re-login

**Types mismatch**: Run `npm run type-check`

**Components not updating**: Check TanStack Query cache invalidation

## Next Steps

- Complete tenant admin/user login flows
- Add permission-based UI hiding
- Implement checkout UI
- Add cart persistence

---

**For detailed feature context, use slash commands**: `/ctx-products`, `/ctx-orders`, `/ctx-rbac`, `/ctx-tenants`
