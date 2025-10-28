# Research: Shopping Cart and Order Management Frontend

**Date**: 2025-10-22 | **Branch**: `002-cart-order-management` | **Plan**: [plan.md](./plan.md)

## State Management

**Decision**: Zustand 4.x

**Rationale**:
- Minimal boilerplate compared to Redux Toolkit (10x less code for same functionality)
- TypeScript-first design with excellent type inference
- Built-in persistence middleware (`persist`) integrates seamlessly with localStorage
- Tiny bundle size (~1KB gzipped) aligns with Constitution Principle VII (Simplicity)
- Simple API: `create()` for stores, hooks-based consumption
- DevTools support via Redux DevTools extension
- No provider wrapping needed (unlike Context API)
- Excellent performance with automatic selector optimization

**Alternatives Considered**:
- **Context API**: Rejected due to re-render issues at scale and lack of built-in persistence
- **Redux Toolkit**: Rejected as over-engineered for our needs; significantly more boilerplate
- **Jotai**: Rejected due to team unfamiliarity; atomic model unnecessary for our state structure

**Implementation Notes**:
```typescript
// Cart store with persistence
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  cart: Order | null;
  addItem: (product: Product, quantity: number) => void;
  updateQuantity: (lineItemId: string, quantity: number) => void;
  removeItem: (lineItemId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      addItem: (product, quantity) => { /* ... */ },
      // ... actions
    }),
    {
      name: 'cart-storage', // localStorage key
      version: 1,
    }
  )
);
```

**Stores to Create**:
1. `cartStore.ts` - Cart state with localStorage persistence
2. `checkoutStore.ts` - Checkout flow state (shipping, billing, payment) with sessionStorage
3. `authStore.ts` - Current user context (tenantId, marketId, role, profile)

---

## Mock API Approach

**Decision**: Mock Service Worker (MSW) 2.x

**Rationale**:
- Intercepts requests at the network level (Service Worker API in browser, Node.js http/https in tests)
- Shows requests in browser DevTools Network tab (realistic debugging experience)
- Works identically in browser and test environment (single mock definition)
- TypeScript support with request/response type safety
- OpenAPI-compatible (can validate mocks against contracts)
- Industry standard (used by major companies and open-source projects)
- Easy to disable: single environment variable to switch to real API
- No changes to application code when transitioning from mocks to real API

**Alternatives Considered**:
- **Manual fetch mocks**: Rejected due to test/browser duplication and no network tab visibility
- **JSON Server**: Rejected as it requires running separate process; not suitable for browser mocking
- **MirageJS**: Rejected due to larger bundle size and less active maintenance than MSW

**Implementation Notes**:
```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// src/main.tsx
if (import.meta.env.VITE_USE_MOCKS === 'true') {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'warn',
  });
}
```

**Handler Organization**:
- `handlers/cartHandlers.ts` - Cart API endpoints
- `handlers/ordersHandlers.ts` - Orders API endpoints
- `handlers/checkoutHandlers.ts` - Checkout API endpoints
- `handlers/adminHandlers.ts` - Admin API endpoints
- `data/mockOrders.ts` - Mock order data
- `data/mockProducts.ts` - Mock product data (references Feature 001)
- `data/mockMarkets.ts` - Mock market data

**Edge Cases to Mock**:
1. Out of stock products (409 Conflict)
2. Price changes between cart view and checkout (validation error)
3. Invalid address format (400 Bad Request)
4. Payment failures (402 Payment Required)
5. Concurrent cart modifications (optimistic update conflicts)
6. Session expiry during checkout

---

## Cart Persistence Strategy

**Decision**: localStorage with Zustand persist middleware

**Rationale**:
- 5MB storage limit is sufficient for carts with 50+ items (estimate: 10KB per item = 500KB max)
- Cross-tab synchronization available via `storage` event listener
- Zustand persist middleware provides clean API for sync, versioning, and migrations
- Easy transition to API sync: middleware supports custom storage backends
- No IndexedDB complexity unless proven necessary
- Supports guest and authenticated user flows equally
- Constitution requirement: "session persistence using localStorage"

**Alternatives Considered**:
- **sessionStorage only**: Rejected due to data loss on tab close (poor UX)
- **IndexedDB**: Rejected as over-engineered; localStorage sufficient for MVP
- **Hybrid (localStorage + API sync)**: Deferred to Phase 3+ when backend is available

**Implementation Notes**:
```typescript
// Zustand persist configuration
persist(
  (set, get) => ({
    // ... state and actions
  }),
  {
    name: 'cart-storage',
    version: 1,
    migrate: (persistedState: any, version: number) => {
      // Handle version migrations if data structure changes
      if (version === 0) {
        // Migrate from v0 to v1
      }
      return persistedState as CartState;
    },
    partialize: (state) => ({
      // Only persist cart data, not derived state
      cart: state.cart,
    }),
  }
)
```

**Persistence Strategy by Order Status**:
- **status = 'new'** (cart): localStorage only
- **status = 'submitted'**: API + localStorage backup
- **status = 'paid' or later**: API only (remove from localStorage)

**Storage Cleanup**:
- Clear cart from localStorage after successful order submission
- Implement 30-day expiry for abandoned carts (check timestamp on load)
- Provide manual "Clear all data" button in settings

**Cross-Tab Sync**:
```typescript
// Listen for storage changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'cart-storage') {
    // Re-hydrate cart store from localStorage
    useCartStore.persist.rehydrate();
  }
});
```

---

## Routing Strategy

**Decision**: React Router v6

**Rationale**:
- Industry standard with massive ecosystem and community support
- Excellent TypeScript support with typed route parameters
- Nested routes perfect for checkout wizard (parent layout with step children)
- Loader pattern supports future SSR/SSG needs
- Data fetching integration with TanStack Query via loaders
- Protected route patterns well-documented
- Programmatic navigation straightforward
- Bundle size reasonable (~10KB gzipped)

**Alternatives Considered**:
- **TanStack Router**: Rejected due to team unfamiliarity despite superior type safety
- **Wouter**: Rejected as too minimal; lacks nested route support

**Implementation Notes**:
```typescript
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutLayout />,
        children: [
          { index: true, element: <Navigate to="shipping" /> },
          { path: 'shipping', element: <ShippingStep /> },
          { path: 'billing', element: <BillingStep /> },
          { path: 'payment', element: <PaymentStep /> },
          { path: 'review', element: <ReviewStep /> },
        ],
      },
      {
        path: 'checkout/confirmation/:orderId',
        element: <OrderConfirmationPage />,
      },
      {
        path: 'orders',
        element: <OrderHistoryPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailsPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'orders',
        element: <AdminOrdersPage />,
      },
      {
        path: 'orders/:orderId',
        element: <AdminOrderDetailsPage />,
      },
    ],
  },
]);
```

**Protected Routes**:
- Customer routes: Require authentication (redirect to login if guest)
- Admin routes: Require admin role (403 if not authorized)
- Checkout routes: Require non-empty cart (redirect to cart if empty)

---

## UI Component Approach

**Decision**: Headless UI + Tailwind CSS

**Rationale**:
- Headless UI provides unstyled, accessible primitives (dropdowns, modals, tabs, etc.)
- Full design control for multi-tenant branding requirements
- Tailwind CSS enables rapid prototyping with utility-first classes
- Accessible by default (WCAG 2.1 AA compliant out of box)
- Minimal bundle size (tree-shakeable, unused utilities purged)
- Easy to customize per tenant (CSS variables, theme files)
- Excellent TypeScript support
- No design lock-in (can replace with CMS components later)

**Alternatives Considered**:
- **shadcn/ui**: Rejected due to copy-paste approach (harder to update/maintain)
- **Material-UI**: Rejected due to large bundle size and strong design opinions
- **Custom components from scratch**: Rejected due to accessibility and time concerns

**Implementation Notes**:
```typescript
// Example: Cart item with Headless UI Menu for actions
import { Menu } from '@headlessui/react';

function CartItem({ item }: { item: OrderLineItem }) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <img src={item.productImage} alt={item.productName} className="w-20 h-20 object-cover" />
      <div className="flex-1">
        <h3 className="font-semibold">{item.productName}</h3>
        <p className="text-sm text-gray-600">{item.productSKU}</p>
      </div>
      <QuantitySelector value={item.quantity} onChange={(q) => updateQuantity(item.id, q)} />
      <p className="font-semibold">${item.lineTotal.toFixed(2)}</p>
      <Menu as="div" className="relative">
        <Menu.Button>⋮</Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg">
          <Menu.Item>
            {({ active }) => (
              <button className={`${active ? 'bg-gray-100' : ''} w-full text-left px-4 py-2`}>
                Remove
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Menu>
    </div>
  );
}
```

**Component Library Structure**:
- `components/common/` - Shared primitives (Button, Input, Select, Modal, Badge)
- `components/cart/` - Cart-specific components
- `components/checkout/` - Checkout flow components
- `components/orders/` - Order management components
- `components/admin/` - Admin-specific components

**Theming for Multi-Tenancy**:
```typescript
// Tailwind config with CSS variables for tenant themes
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        // ...
      },
    },
  },
};

// Load tenant theme from context
const tenantTheme = {
  '--color-primary': tenant.brandColors.primary,
  '--color-secondary': tenant.brandColors.secondary,
};
```

---

## Form Handling

**Decision**: React Hook Form with Zod validation

**Rationale**:
- Minimal re-renders (uncontrolled inputs by default, controlled on demand)
- Built-in validation with `zodResolver` for TypeScript schema validation
- Small bundle size (~8KB gzipped)
- Excellent TypeScript support with type inference from Zod schemas
- Complex validation rules supported (async validation, cross-field validation)
- Error handling with field-level and form-level errors
- Integration with Headless UI components straightforward

**Alternatives Considered**:
- **Formik**: Rejected due to more re-renders and larger bundle size
- **Native React state**: Rejected due to complexity of checkout validation logic
- **TanStack Form**: Rejected due to team unfamiliarity; React Hook Form more established

**Implementation Notes**:
```typescript
// Shipping address form with Zod validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const shippingSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  addressLine1: z.string().min(1, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City required'),
  state: z.string().length(2, 'State code must be 2 characters'),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().length(2, 'Country code required'),
  phone: z.string().regex(/^\+?1?\d{10,15}$/, 'Invalid phone number'),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

function ShippingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
  });

  const onSubmit = (data: ShippingFormData) => {
    // Submit to API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('firstName')} error={errors.firstName?.message} />
      {/* ... more fields */}
    </form>
  );
}
```

**Forms to Implement**:
1. Shipping address form (9 fields with complex validation)
2. Billing address form (same as shipping + "same as shipping" checkbox)
3. Payment form (card number, expiry, CVV, name - mock only)
4. Order filters form (admin: date range, status, tenant, search)
5. Refund form (admin: amount, reason, shipping refund checkbox)

**Validation Strategy**:
- **Client-side**: Zod schemas for immediate feedback
- **Server-side**: API validation as source of truth (MSW returns validation errors)
- **Cross-field**: Use Zod `.refine()` for "billing same as shipping" logic
- **Async validation**: Address verification (simulated in MSW, real in Phase 3+)

---

## API Client Architecture

**Decision**: Custom fetch wrapper + TanStack Query

**Rationale**:
- Fetch API is native, modern, and well-supported (no dependencies)
- Custom wrapper allows request/response interceptors for:
  - Tenant context injection (tenantId header)
  - Authentication token handling
  - Error normalization
  - Logging and monitoring
- Works perfectly with MSW (both use native fetch)
- TanStack Query handles caching, deduplication, retries (no need for Axios features)
- Can add OpenAPI code generation later without major refactor
- Aligns with Constitution Principle VII (Simplicity)

**Alternatives Considered**:
- **Axios**: Rejected as unnecessary; adds 13KB for features we don't need
- **TanStack Query built-in fetcher**: Rejected due to lack of interceptor pattern
- **OpenAPI code generation (immediate)**: Deferred to Phase 3+; too early for codegen

**Implementation Notes**:
```typescript
// src/services/api/client.ts
interface ApiClientConfig {
  baseURL: string;
  tenantId: string;
  getAuthToken: () => string | null;
}

class ApiClient {
  constructor(private config: ApiClientConfig) {}

  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.config.tenantId,
      ...options?.headers,
    };

    const token = this.config.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.message, error);
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.fetch<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ... put, delete, patch
}

export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tenantId: import.meta.env.VITE_TENANT_ID,
  getAuthToken: () => localStorage.getItem('auth_token'),
});
```

**API Service Layer**:
```typescript
// src/services/api/cartApi.ts
export const cartApi = {
  getCart: () => apiClient.get<Order>('/api/v1/cart'),
  addItem: (productId: string, quantity: number) =>
    apiClient.post<Order>('/api/v1/cart/items', { productId, quantity }),
  updateItem: (lineItemId: string, quantity: number) =>
    apiClient.put<Order>(`/api/v1/cart/items/${lineItemId}`, { quantity }),
  removeItem: (lineItemId: string) =>
    apiClient.delete<Order>(`/api/v1/cart/items/${lineItemId}`),
  clearCart: () => apiClient.delete<Order>('/api/v1/cart'),
};
```

**Error Handling**:
- Custom `ApiError` class with status code, message, and full error object
- Centralized error handling in TanStack Query `onError` callbacks
- User-friendly error messages mapped from API error codes
- Retry logic for network errors (not business logic errors)

---

## Data Fetching & Caching

**Decision**: TanStack Query v5

**Rationale**:
- Best-in-class cache management for REST APIs
- Automatic request deduplication (multiple components requesting same data)
- Optimistic updates for instant UI feedback (cart quantity changes)
- Built-in retry logic with exponential backoff
- Stale-while-revalidate pattern for perceived performance
- Query invalidation for cache coherence (cart update invalidates order queries)
- DevTools for debugging cache state and request lifecycle
- TypeScript support with full type inference
- Framework-agnostic (easy to reuse logic in other platforms later)
- Polling support for order status updates

**Alternatives Considered**:
- **SWR**: Rejected due to less powerful cache invalidation strategies
- **RTK Query**: Rejected as tightly coupled to Redux (we're using Zustand)
- **Apollo Client**: Rejected as designed for GraphQL, overkill for REST

**Implementation Notes**:
```typescript
// src/services/hooks/useCart.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cartApi';

export function useCart() {
  const queryClient = useQueryClient();

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.addItem(productId, quantity),
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Order>(['cart']);

      queryClient.setQueryData<Order>(['cart'], (old) => {
        // Optimistically add item to cart
        return { ...old, /* updated cart */ };
      });

      return { previousCart };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['cart'], context.previousCart);
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    cart,
    isLoading,
    error,
    addItem: addItemMutation.mutate,
    isAddingItem: addItemMutation.isPending,
  };
}
```

**Query Keys Strategy**:
- `['cart']` - Current cart
- `['orders']` - Order list
- `['orders', orderId]` - Specific order details
- `['orders', orderId, 'status-history']` - Order status history
- `['admin', 'orders', filters]` - Admin order list with filters

**Cache Invalidation Rules**:
- Cart mutation → invalidate `['cart']`, `['orders']`
- Order status change → invalidate `['orders', orderId]`, `['orders']`
- Checkout submit → invalidate `['cart']`, `['orders']`
- Admin refund → invalidate `['orders', orderId]`, `['admin', 'orders']`

**Optimistic Updates**:
- Cart quantity changes (instant feedback)
- Remove cart item (instant removal)
- Add to cart (show immediately, rollback on error)

**Polling for Status Updates**:
```typescript
// Poll order status during payment processing
const { data: order } = useQuery({
  queryKey: ['orders', orderId],
  queryFn: () => ordersApi.getOrder(orderId),
  refetchInterval: order?.status === 'submitted' ? 3000 : false, // Poll every 3s if submitted
});
```

---

## Risk Assessment

### High-Priority Risks

**Risk**: Cart data structure changes during backend implementation
- **Impact**: High - requires frontend refactor
- **Likelihood**: Medium - API contracts minimize this
- **Mitigation**:
  - Well-defined OpenAPI contracts reviewed by backend team before Phase 1 completion
  - Versioning strategy for API endpoints (`/api/v1/`, `/api/v2/`)
  - Frontend API client abstraction isolates changes to service layer only
  - MSW handlers can simulate both v1 and v2 for migration testing

**Risk**: Multi-tenant context gets lost in API calls
- **Impact**: High - cross-tenant data leaks (security vulnerability)
- **Likelihood**: Low - architecture prevents this
- **Mitigation**:
  - Enforce tenant context at API client level (automatic header injection)
  - Runtime checks in MSW handlers (reject requests without tenantId)
  - Integration tests specifically for multi-tenant scenarios
  - Code review checklist item: "All API calls include tenant context"

**Risk**: Payment gateway integration complexity
- **Impact**: High - checkout flow blocked
- **Likelihood**: Medium - external dependency
- **Mitigation**:
  - Payment handling fully abstracted in Phase 1 contracts
  - Mock payment flow validated in frontend before backend integration
  - Stripe/PayPal integration is Phase 3+ (after frontend validation)
  - Fallback to manual payment processing if gateway issues

### Medium-Priority Risks

**Risk**: Cart merging logic (guest → logged in) has edge cases
- **Impact**: Medium - poor UX or data loss
- **Likelihood**: High - complex business logic
- **Mitigation**:
  - Document all merge scenarios in data-model.md (guest cart + existing user cart)
  - Write explicit test cases for all scenarios
  - Validate merge logic with stakeholders before implementation
  - Provide user choice: "Keep guest cart", "Merge carts", "Replace with saved cart"

**Risk**: Status transition logic becomes complex
- **Impact**: Medium - bugs in order status flow
- **Likelihood**: Medium - business rules evolve
- **Mitigation**:
  - Centralize status transition logic in utility module (`orderHelpers.ts`)
  - State machine diagram in documentation
  - Comprehensive unit tests for all valid and invalid transitions
  - Admin override capability with audit trail

**Risk**: Team unfamiliarity with TanStack Query
- **Impact**: Medium - slower development, suboptimal usage
- **Likelihood**: Medium - team experience varies
- **Mitigation**:
  - Provide learning resources (official docs, video tutorials)
  - Pair programming sessions for first few hooks
  - Clear examples in quickstart guide
  - Code review focus on query patterns

**Risk**: LocalStorage quota exceeded (large carts)
- **Impact**: Medium - cart persistence fails
- **Likelihood**: Low - 5MB limit is generous
- **Mitigation**:
  - Monitor storage usage in development (console warnings)
  - Implement cleanup for old carts (30-day expiry)
  - Plan IndexedDB migration if needed (can swap Zustand storage backend)
  - Limit cart to 50 items (business rule)

### Low-Priority Risks

**Risk**: MSW performance degradation with complex queries
- **Impact**: Low - slower development experience
- **Likelihood**: Low - MSW is extremely fast
- **Mitigation**:
  - MSW responses are near-instant (in-memory)
  - If issues arise, simplify mock data or use JSON fixture files
  - Profile with React DevTools Profiler

---

## Open Questions

1. **Cart Merging Strategy**: When user has items in cart and changes market context, what is the desired behavior?
   - Clear cart (products from different market)?
   - Merge if products exist in new market?
   - Ask user to choose?
   - **Action**: Clarify with product owner before implementation

2. **Order Number Format**: What format should order numbers use?
   - Sequential: `ORD-00001`, `ORD-00002`
   - UUID-based: `ORD-a1b2c3d4`
   - Tenant-prefixed: `DEMO-00001`, `TEST-00001`
   - Date-based: `20251022-00001`
   - **Action**: Define in data-model.md based on product requirements

3. **Tax Calculation Logic**: How should tax be calculated?
   - Fixed rate per tenant?
   - Address-based (integrate with tax service)?
   - Manual entry (admin sets rate)?
   - **Action**: Document in contracts; mock can use simple fixed rate

4. **Shipping Cost Calculation**: How are shipping costs determined?
   - Fixed rate?
   - Weight-based?
   - Integrate with shipping provider API (FedEx, UPS)?
   - Free shipping thresholds?
   - **Action**: Define in checkout-api.yaml; mock can return simple options

5. **Guest Checkout**: Do we support guest checkout (no account creation)?
   - Yes: Guest orders tracked by email only
   - No: Force account creation before checkout
   - **Action**: Clarify business requirement; impacts order authentication flow

6. **Order Cancellation Window**: What rules govern when customers can cancel orders?
   - Can cancel until status = 'completed'?
   - Time-based window (e.g., 1 hour after submission)?
   - Admin approval required?
   - **Action**: Document in orders-api.yaml; implement in status transition logic

7. **Currency Support**: Do we need multi-currency support?
   - Single currency (USD) for MVP?
   - Multi-currency with tenant-specific defaults?
   - Real-time conversion?
   - **Action**: Define in data-model.md; impacts all price fields

8. **Inventory Reservation**: Should adding to cart reserve inventory?
   - No reservation (check at checkout only)?
   - Temporary hold (e.g., 30 minutes)?
   - **Action**: Impacts Product catalog feature; define integration contract

---

## Next Steps

1. Review research decisions with team
2. Address open questions with product owner
3. Proceed to Phase 1: Create design artifacts
   - `data-model.md`
   - `contracts/*.yaml` (4 files)
   - `quickstart.md`
4. Re-check constitution compliance after Phase 1
5. Execute Phase 2: Generate task breakdown (task generation)

---

**Research Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Complete - Ready for Phase 1
