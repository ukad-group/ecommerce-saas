# Quickstart Guide: Shopping Cart and Order Management

**Date**: 2025-10-22 | **Branch**: `002-cart-order-management` | **Plan**: [plan.md](./plan.md)

## Overview

This guide helps you get started with the shopping cart and order management feature. The frontend is built with React, TypeScript, and Vite, using Mock Service Worker (MSW) to simulate API responses. All functionality is fully operational without a backend, allowing you to develop and test the complete user experience before backend implementation begins.

---

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Navigate to project root
cd c:\Work\UKAD\eComm

# Navigate to frontend directory (create if it doesn't exist yet)
cd frontend

# Install dependencies
npm install

# Install project-specific dependencies
npm install react@18 react-dom@18 react-router-dom@6 \
  @tanstack/react-query@5 zustand@4 msw@2 \
  react-hook-form@7 @hookform/resolvers zod \
  @headlessui/react tailwindcss@3

# Install dev dependencies
npm install -D vite@5 @vitejs/plugin-react typescript@5 \
  vitest@1 @testing-library/react @testing-library/jest-dom \
  @types/react @types/react-dom

# Initialize MSW
npx msw init public/ --save
```

### Project Structure Setup

If the frontend directory doesn't exist yet, create the following structure:

```bash
frontend/
├── src/
│   ├── components/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── checkout/
│   │   ├── admin/
│   │   └── common/
│   ├── pages/
│   ├── services/
│   │   ├── api/
│   │   └── hooks/
│   ├── mocks/
│   │   ├── handlers/
│   │   └── data/
│   ├── store/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx
├── tests/
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Environment Configuration

Create a `.env.local` file in the `frontend/` directory:

```bash
# .env.local

# Tenant Configuration
VITE_TENANT_ID=demo-tenant
VITE_TENANT_NAME=Demo Store

# API Configuration
VITE_API_BASE_URL=http://localhost:5173/api/v1
VITE_USE_MOCKS=true

# Feature Flags
VITE_ENABLE_GUEST_CHECKOUT=true
VITE_ENABLE_ADMIN_FEATURES=true

# Mock Configuration
VITE_MOCK_DELAY=200

# Development
VITE_DEBUG_MODE=true
```

### Environment Variables

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `VITE_TENANT_ID` | Current tenant identifier | `demo-tenant` | Any tenant ID |
| `VITE_API_BASE_URL` | API base URL | `http://localhost:5173/api/v1` | Any valid URL |
| `VITE_USE_MOCKS` | Enable MSW mocking | `true` | `true` or `false` |
| `VITE_MOCK_DELAY` | Simulated API delay (ms) | `200` | `0-2000` |
| `VITE_DEBUG_MODE` | Enable debug logging | `true` | `true` or `false` |

---

## Running the Application

### Development Server

```bash
# Start development server with hot reload
npm run dev

# Server will start at http://localhost:5173
```

The development server includes:
- Hot Module Replacement (HMR) for instant updates
- MSW enabled automatically (if `VITE_USE_MOCKS=true`)
- TypeScript type checking
- React DevTools support
- TanStack Query DevTools (automatic in dev mode)

### Build for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Running Tests

```bash
# Run unit and integration tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (future)
npm run test:e2e
```

---

## Mock Data Overview

### Pre-configured Tenants

| Tenant ID | Name | Order Prefix | Currency |
|-----------|------|--------------|----------|
| `demo-tenant` | Demo Store | `DEMO` | USD |
| `test-tenant` | Test Store | `TEST` | USD |

### Mock Customers

| Customer ID | Email | Name | Is Guest |
|-------------|-------|------|----------|
| `customer-123` | john@example.com | John Doe | No |
| `customer-456` | jane@example.com | Jane Smith | No |
| `guest-789` | guest@example.com | Guest User | Yes |

### Mock Products

Mock products are referenced from Feature 001 (Product Catalog). Sample data includes:

- **prod-001**: Wireless Mouse - $29.99
- **prod-002**: USB Keyboard - $29.99
- **prod-003**: Gaming Headset - $79.99
- **prod-004**: Webcam HD - $49.99
- **prod-005**: USB-C Hub - $39.99
- ... (15 more products)

### Mock Orders

Pre-populated mock orders for testing:

| Order Number | Status | Customer | Total | Items |
|--------------|--------|----------|-------|-------|
| DEMO-000001 | completed | john@example.com | $103.16 | 2 |
| DEMO-000002 | paid | john@example.com | $152.98 | 3 |
| DEMO-000003 | submitted | jane@example.com | $89.97 | 1 |
| DEMO-000004 | cancelled | john@example.com | $45.00 | 1 |
| TEST-000001 | completed | jane@example.com | $200.50 | 5 |

### Mock Cart Persistence

- Cart data persists in **localStorage** (key: `cart-storage`)
- Initial cart is empty
- Add items to cart to see persistence across browser sessions
- Cart syncs across tabs (same browser)

---

## Available Routes

### Customer Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page with product catalog link |
| `/cart` | CartPage | Shopping cart view with line items |
| `/checkout` | CheckoutLayout | Checkout wizard wrapper |
| `/checkout/shipping` | ShippingStep | Shipping address form |
| `/checkout/billing` | BillingStep | Billing address form |
| `/checkout/payment` | PaymentStep | Payment details form (mock) |
| `/checkout/review` | ReviewStep | Order review and submit |
| `/checkout/confirmation/:orderId` | OrderConfirmationPage | Order confirmation after payment |
| `/orders` | OrderHistoryPage | Customer order history list |
| `/orders/:orderId` | OrderDetailsPage | Single order details with status |

### Admin Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/orders` | AdminOrdersPage | Order management dashboard |
| `/admin/orders/:orderId` | AdminOrderDetailsPage | Admin order details with actions |

### Route Protection

- **Customer routes**: Require authentication (redirect to `/login` if guest)
- **Admin routes**: Require admin role (show 403 if not authorized)
- **Checkout routes**: Require non-empty cart (redirect to `/cart` if empty)

---

## Testing Scenarios

### Scenario 1: Guest Shopping and Cart Persistence

**Objective**: Verify cart persists across sessions and browser reloads.

**Steps**:
1. Open browser to `http://localhost:5173`
2. Navigate to product catalog (Feature 001, or use mock product links)
3. Click "Add to Cart" on "Wireless Mouse" (prod-001)
4. Click "Add to Cart" on "USB Keyboard" (prod-002)
5. Navigate to `/cart`
6. **Verify**: 2 items in cart, totals calculated correctly
7. Update quantity of mouse to 3
8. **Verify**: Cart subtotal updates to $119.96 (3 × $29.99 + 1 × $29.99)
9. Open browser DevTools → Application → Local Storage
10. **Verify**: `cart-storage` key contains cart data
11. Refresh page (F5)
12. **Verify**: Cart still contains 2 items with updated quantities
13. Close browser completely
14. Reopen browser to `http://localhost:5173/cart`
15. **Verify**: Cart persists across browser sessions

**Expected Results**:
- Cart persists in localStorage
- Quantity updates recalculate totals immediately
- Cart survives page refreshes and browser restarts
- Cross-tab sync works (open `/cart` in two tabs, update in one, see changes in other)

---

### Scenario 2: Complete Checkout Process

**Objective**: Walk through full checkout flow from cart to order confirmation.

**Steps**:

**2.1. Cart Review**
1. Add items to cart (see Scenario 1)
2. Navigate to `/cart`
3. Review cart contents
4. Click "Proceed to Checkout" button
5. **Verify**: Redirected to `/checkout/shipping`

**2.2. Shipping Address**
1. Fill shipping address form:
   - First Name: `John`
   - Last Name: `Doe`
   - Address Line 1: `123 Main St`
   - City: `San Francisco`
   - State: `CA`
   - Postal Code: `94102`
   - Country: `US`
   - Phone: `+14155551234`
2. Click "Continue to Billing"
3. **Verify**: Redirected to `/checkout/billing`

**2.3. Billing Address**
1. Check "Same as shipping address" checkbox
2. **Verify**: Billing form auto-fills with shipping data
3. Click "Continue to Payment"
4. **Verify**: Redirected to `/checkout/payment`

**2.4. Payment (Mock)**
1. Fill payment form:
   - Card Number: `4242 4242 4242 4242` (test card)
   - Expiry: `12/25`
   - CVV: `123`
   - Cardholder Name: `John Doe`
2. Click "Continue to Review"
3. **Verify**: Redirected to `/checkout/review`

**2.5. Order Review and Submit**
1. Review order summary
2. **Verify**: All details correct (items, addresses, totals)
3. Click "Submit Order"
4. **Verify**: Loading indicator appears
5. **Verify**: Redirected to `/checkout/confirmation/:orderId`
6. **Verify**: Order number displayed (e.g., `DEMO-000005`)
7. **Verify**: Order status is "submitted"

**2.6. Payment Processing (Automatic)**
1. Wait 3 seconds (mock payment processing)
2. **Verify**: Order status updates to "paid" (page auto-refreshes or uses polling)
3. **Verify**: Payment confirmation message displayed
4. Click "View Order Details"
5. **Verify**: Redirected to `/orders/:orderId`

**2.7. Verify Cart Cleared**
1. Navigate to `/cart`
2. **Verify**: Cart is empty (localStorage cleared after checkout)

**Expected Results**:
- Checkout wizard progresses through all steps
- Address validation works (try invalid postal code to see error)
- "Same as shipping" checkbox auto-fills billing form
- Mock payment succeeds after 3-second delay
- Order transitions from "new" → "submitted" → "paid"
- Cart cleared after successful payment
- Order confirmation email sent (mock console log)

---

### Scenario 3: Order History and Status Tracking

**Objective**: View order history and track order status changes.

**Steps**:

**3.1. View Order History**
1. Navigate to `/orders`
2. **Verify**: List of orders displayed (including mock orders)
3. **Verify**: Orders sorted by creation date (newest first)
4. **Verify**: Each order shows: order number, status, date, total
5. Filter by status: Select "Completed"
6. **Verify**: Only completed orders shown
7. Clear filter
8. **Verify**: All orders shown again

**3.2. View Order Details**
1. Click on order `DEMO-000001`
2. **Verify**: Redirected to `/orders/order-123e4567-e89b-12d3-a456-426614174000`
3. **Verify**: Order details displayed:
   - Order number and status
   - Line items with quantities and prices
   - Shipping address
   - Billing address
   - Order totals
4. Scroll to "Order Status History" section
5. **Verify**: Status timeline displayed:
   - "new" → "submitted" → "paid" → "completed"
   - Each transition shows timestamp
   - Notes for each transition (if present)

**3.3. Track Order Status**
1. Locate an order with status "paid"
2. View order details
3. **Verify**: Status badge shows "Paid"
4. **Verify**: Expected delivery date displayed (if available)
5. Wait for mock status update (or trigger manually in MSW)
6. **Verify**: Status updates to "completed" automatically (polling)

**3.4. Request Cancellation**
1. Locate an order with status "submitted"
2. View order details
3. Click "Cancel Order" button
4. Enter cancellation reason: "Changed my mind"
5. Confirm cancellation
6. **Verify**: Order status updates to "cancelled"
7. **Verify**: Cancellation reason displayed in order details
8. **Verify**: Status history shows cancellation entry

**Expected Results**:
- Order history loads quickly (< 500ms with mock data)
- Status filtering works correctly
- Order details show complete information
- Status history displays full audit trail
- Cancellation only available for "submitted" orders
- Cannot cancel "paid" or "completed" orders (button disabled with tooltip)

---

### Scenario 4: Admin Order Management

**Objective**: Test admin capabilities for order management across tenants.

**Steps**:

**4.1. Access Admin Dashboard**
1. Navigate to `/admin/orders`
2. **Verify**: Admin order list displayed
3. **Verify**: Orders from multiple tenants visible
4. **Verify**: Additional columns: Tenant Name, Customer Email

**4.2. Filter and Search**
1. Filter by tenant: Select "Demo Store"
2. **Verify**: Only demo-tenant orders shown
3. Filter by status: Select "Paid"
4. **Verify**: Only paid orders shown
5. Enter search term: `DEMO-000001`
6. **Verify**: Single order matching search term shown
7. Clear all filters
8. Set date range: From "2025-10-01" to "2025-10-31"
9. **Verify**: Only orders within date range shown

**4.3. View Admin Order Details**
1. Click on order `DEMO-000002`
2. **Verify**: Admin order details page displayed
3. **Verify**: Additional admin-only information visible:
   - Full payment transaction details
   - Admin notes section
   - Order actions (update status, add note, refund)

**4.4. Update Order Status**
1. Current status: "paid"
2. Click "Update Status" button
3. Select new status: "completed"
4. Enter notes: "Order fulfilled and shipped via UPS tracking 1Z999AA10123456784"
5. Click "Update"
6. **Verify**: Status updates to "completed"
7. **Verify**: Status history shows new entry with admin user and notes

**4.5. Add Admin Note**
1. In "Admin Notes" section, click "Add Note"
2. Enter note: "Customer called to confirm delivery address"
3. Click "Save"
4. **Verify**: Note appears in admin notes list
5. **Verify**: Note includes admin user email and timestamp
6. **Verify**: Note NOT visible to customer (open customer order view to verify)

**4.6. Process Refund**
1. Locate order with status "paid" or "completed"
2. Click "Process Refund" button
3. Enter refund amount: `103.16` (full refund)
4. Enter reason: "Customer requested cancellation"
5. Check "Refund shipping" checkbox
6. Click "Process Refund"
7. **Verify**: Confirmation modal appears
8. Confirm refund
9. **Verify**: Order status updates to "cancelled"
10. **Verify**: New transaction appears with type "refund"
11. **Verify**: Refund amount matches refund request

**4.7. Export Orders**
1. Apply filters (e.g., completed orders, date range)
2. Click "Export" button
3. Select format: "CSV"
4. Click "Download"
5. **Verify**: CSV file downloads
6. Open CSV file
7. **Verify**: All filtered orders included
8. **Verify**: Columns: Order Number, Status, Customer, Total, Date, etc.

**Expected Results**:
- Admin dashboard shows all orders across tenants
- Filtering and search work correctly
- Admin can update order status with notes
- Admin notes are internal-only (not visible to customers)
- Refund processing validates amount and creates refund transaction
- Order export generates correct CSV/Excel file

---

## MSW Configuration

### How Mock Service Worker Works

MSW intercepts network requests at the browser Service Worker level, making mocked requests appear in the Network tab just like real API calls. This provides the most realistic development experience.

### Enabling/Disabling MSW

**Option 1: Environment Variable**
```bash
# .env.local
VITE_USE_MOCKS=true   # Enable mocks
VITE_USE_MOCKS=false  # Use real API
```

**Option 2: Code Toggle**
```typescript
// src/main.tsx
const shouldUseMocks = import.meta.env.VITE_USE_MOCKS === 'true';

if (shouldUseMocks) {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'warn', // Warn about unmocked requests
  });
}
```

### Adding/Modifying Mock Responses

**Example: Add new cart handler**

```typescript
// src/mocks/handlers/cartHandlers.ts
import { http, HttpResponse } from 'msw';

export const cartHandlers = [
  // Get cart
  http.get('/api/v1/cart', ({ request }) => {
    const tenantId = request.headers.get('X-Tenant-ID');

    // Return mock cart data
    return HttpResponse.json({
      id: 'cart-123',
      tenantId,
      status: 'new',
      lineItems: [],
      subtotal: 0,
      total: 0,
    });
  }),

  // Add to cart
  http.post('/api/v1/cart/items', async ({ request }) => {
    const body = await request.json();

    // Validate request
    if (!body.productId || !body.quantity) {
      return HttpResponse.json(
        { error: 'Bad Request', message: 'Missing productId or quantity' },
        { status: 400 }
      );
    }

    // Return updated cart
    return HttpResponse.json({
      id: 'cart-123',
      lineItems: [
        {
          id: 'item-1',
          productId: body.productId,
          quantity: body.quantity,
          unitPrice: 29.99,
          lineTotal: 29.99 * body.quantity,
        },
      ],
      subtotal: 29.99 * body.quantity,
      total: 29.99 * body.quantity,
    });
  }),
];
```

**Register handlers:**
```typescript
// src/mocks/handlers/index.ts
import { cartHandlers } from './cartHandlers';
import { ordersHandlers } from './ordersHandlers';
import { checkoutHandlers } from './checkoutHandlers';
import { adminHandlers } from './adminHandlers';

export const handlers = [
  ...cartHandlers,
  ...ordersHandlers,
  ...checkoutHandlers,
  ...adminHandlers,
];
```

### Simulating Errors

**Example: Simulate out-of-stock error**

```typescript
// Temporarily override handler
http.post('/api/v1/cart/items', () => {
  return HttpResponse.json(
    {
      error: 'Conflict',
      message: 'Product is out of stock',
      statusCode: 409,
      details: {
        productId: 'prod-001',
        availableQuantity: 0,
      },
    },
    { status: 409 }
  );
});
```

**Example: Simulate network delay**

```typescript
http.get('/api/v1/orders', async () => {
  // Simulate 2-second delay
  await delay(2000);

  return HttpResponse.json({
    orders: [...],
  });
});
```

### Mock Data Management

**Centralized mock data:**

```typescript
// src/mocks/data/mockOrders.ts
export const mockOrders = [
  {
    id: 'order-123',
    orderNumber: 'DEMO-000001',
    status: 'completed',
    total: 103.16,
    // ... more fields
  },
  // ... more orders
];

// Use in handlers
http.get('/api/v1/orders', () => {
  return HttpResponse.json({
    orders: mockOrders,
    totalCount: mockOrders.length,
  });
});
```

---

## Transitioning to Real API

When the backend is ready, follow these steps to transition from mocks to real API:

### Step 1: Update Environment Variables

```bash
# .env.local
VITE_USE_MOCKS=false  # Disable MSW
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1  # Real API URL
```

### Step 2: Verify API Contracts Match

Ensure backend implements exact OpenAPI contracts:

```bash
# Validate backend against contracts
cd specs/002-cart-order-management/contracts

# Use OpenAPI validator tool (example)
openapi-validator cart-api.yaml https://api.yourdomain.com/api/v1
openapi-validator checkout-api.yaml https://api.yourdomain.com/api/v1
openapi-validator orders-api.yaml https://api.yourdomain.com/api/v1
openapi-validator admin-orders-api.yaml https://api.yourdomain.com/api/v1
```

### Step 3: Update API Client Configuration

```typescript
// src/services/api/client.ts
const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Uses real API URL
  tenantId: import.meta.env.VITE_TENANT_ID,
  getAuthToken: () => localStorage.getItem('auth_token'), // Real auth
});
```

### Step 4: Test All Flows Against Real API

Run through all testing scenarios (1-4 above) against the real backend:

1. **Cart operations**: Add, update, remove items
2. **Checkout flow**: Complete end-to-end checkout
3. **Order history**: View orders and status tracking
4. **Admin features**: Manage orders, refunds, exports

### Step 5: Fix Contract Mismatches

If API responses don't match contracts:

**Option A: Fix Backend** (preferred)
- Backend should implement exact contracts from Phase 1

**Option B: Add Adapter Layer** (temporary)
```typescript
// src/services/api/adapters.ts
export function adaptOrderResponse(backendOrder: any): Order {
  // Transform backend response to match frontend types
  return {
    id: backendOrder.orderId, // Different field name
    orderNumber: backendOrder.number,
    // ... other transformations
  };
}
```

### Step 6: Remove MSW (Optional)

Once fully transitioned, you can remove MSW:

```bash
npm uninstall msw

# Remove mock files
rm -rf src/mocks
```

Or keep MSW for testing purposes:
```typescript
// src/main.tsx
if (import.meta.env.MODE === 'test' || import.meta.env.VITE_USE_MOCKS === 'true') {
  // Keep MSW for tests
}
```

---

## Troubleshooting

### Common Issues

#### Issue: Cart not persisting

**Symptoms**: Cart clears on page refresh

**Solutions**:
1. Check browser localStorage quota:
   ```javascript
   // In browser console
   console.log(navigator.storage && navigator.storage.estimate());
   ```
2. Clear localStorage and retry:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
3. Check Zustand persist configuration:
   ```typescript
   // src/store/cartStore.ts
   persist(
     (set) => ({ /* state */ }),
     {
       name: 'cart-storage', // Verify key name
       version: 1,
     }
   )
   ```

---

#### Issue: Mock API not intercepting requests

**Symptoms**: Network errors, requests hitting real endpoints

**Solutions**:
1. Verify MSW worker is registered:
   ```typescript
   // src/main.tsx
   if (import.meta.env.VITE_USE_MOCKS === 'true') {
     const { worker } = await import('./mocks/browser');
     await worker.start();
   }
   ```
2. Check MSW worker file exists:
   ```bash
   ls public/mockServiceWorker.js
   # If missing, run: npx msw init public/ --save
   ```
3. Check browser console for MSW registration message:
   ```
   [MSW] Mocking enabled.
   ```
4. Verify handlers are registered:
   ```typescript
   // src/mocks/browser.ts
   import { handlers } from './handlers';
   export const worker = setupWorker(...handlers);
   ```

---

#### Issue: Network errors in DevTools

**Symptoms**: 404 or 500 errors in Network tab

**Solutions**:
1. Check request URL matches handler:
   ```typescript
   // Handler pattern must match exactly
   http.get('/api/v1/cart', ...)  // Handler
   fetch('/api/v1/cart')           // Request (must match)
   ```
2. Check tenant header is included:
   ```typescript
   // API client must include X-Tenant-ID header
   headers: {
     'X-Tenant-ID': import.meta.env.VITE_TENANT_ID,
   }
   ```
3. Add catch-all handler to debug:
   ```typescript
   http.all('*', ({ request }) => {
     console.log('Unhandled request:', request.method, request.url);
     return HttpResponse.json({ error: 'Not implemented' }, { status: 501 });
   });
   ```

---

#### Issue: TypeScript errors after data model changes

**Symptoms**: Type mismatches, property missing errors

**Solutions**:
1. Regenerate types from OpenAPI contracts:
   ```bash
   npm run generate-types
   # Or manually update src/types/
   ```
2. Check type definitions match contracts:
   ```typescript
   // src/types/order.ts
   export interface Order {
     // Ensure all fields match data-model.md
   }
   ```
3. Clear TypeScript cache:
   ```bash
   rm -rf node_modules/.cache
   npm run dev
   ```

---

#### Issue: TanStack Query cache not updating

**Symptoms**: Stale data after mutations, UI not refreshing

**Solutions**:
1. Check query invalidation after mutations:
   ```typescript
   const mutation = useMutation({
     mutationFn: addToCart,
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cart'] });
     },
   });
   ```
2. Verify query keys match:
   ```typescript
   // Query
   useQuery({ queryKey: ['cart'], ... });

   // Invalidation (must match exactly)
   queryClient.invalidateQueries({ queryKey: ['cart'] });
   ```
3. Check optimistic updates rollback:
   ```typescript
   onError: (err, variables, context) => {
     // Rollback to previous data on error
     queryClient.setQueryData(['cart'], context.previousCart);
   },
   ```

---

#### Issue: React Hook Form validation not working

**Symptoms**: Form submits with invalid data, errors not displayed

**Solutions**:
1. Check Zod schema is applied:
   ```typescript
   const { register, handleSubmit } = useForm({
     resolver: zodResolver(shippingSchema), // Must include resolver
   });
   ```
2. Verify error rendering:
   ```typescript
   <Input
     {...register('firstName')}
     error={errors.firstName?.message} // Display error message
   />
   ```
3. Check schema validation rules:
   ```typescript
   const schema = z.object({
     firstName: z.string().min(1, 'First name is required'), // Error message
   });
   ```

---

### Performance Issues

#### Slow page loads

**Causes**: Large mock data, unoptimized components

**Solutions**:
1. Reduce mock data size during development
2. Implement pagination for order lists
3. Use React.memo for expensive components
4. Enable React DevTools Profiler to identify bottlenecks

#### High memory usage

**Causes**: TanStack Query cache growing too large

**Solutions**:
1. Configure cache garbage collection:
   ```typescript
   new QueryClient({
     defaultOptions: {
       queries: {
         cacheTime: 1000 * 60 * 5, // 5 minutes
         staleTime: 1000 * 60 * 1, // 1 minute
       },
     },
   });
   ```
2. Clear cache on logout:
   ```typescript
   queryClient.clear();
   ```

---

## Development Tips

### Browser Extensions

**Recommended extensions for development:**

1. **React Developer Tools**: Inspect component tree and state
2. **Redux DevTools**: Works with Zustand for state debugging
3. **TanStack Query DevTools**: Built-in, automatically enabled in dev mode
4. **JSON Viewer**: Format JSON responses in Network tab

### Debugging MSW

**Enable verbose logging:**
```typescript
// src/mocks/browser.ts
export const worker = setupWorker(...handlers);

if (import.meta.env.DEV) {
  worker.start({
    onUnhandledRequest: 'warn',
    quiet: false, // Show all requests
  });
}
```

**Log handler execution:**
```typescript
http.get('/api/v1/cart', ({ request }) => {
  console.log('[MSW] GET /cart', { tenantId: request.headers.get('X-Tenant-ID') });
  return HttpResponse.json({ /* data */ });
});
```

### Testing with Different Tenants

Switch tenants by updating environment variable:

```bash
# .env.local
VITE_TENANT_ID=demo-tenant  # or test-tenant
```

Or dynamically in code:
```typescript
// Change tenant at runtime (for testing)
const tenantId = 'test-tenant';
apiClient.setTenantId(tenantId);
```

### Simulating Edge Cases

**Out of stock:**
```typescript
// Temporarily override handler
http.post('/api/v1/cart/items', () => {
  return HttpResponse.json(
    { error: 'Conflict', message: 'Product out of stock' },
    { status: 409 }
  );
});
```

**Price changes:**
```typescript
// Return different price than cart expects
{ unitPrice: 24.99 } // Cart expects 29.99
```

**Payment failures:**
```typescript
http.post('/api/v1/checkout/payment', () => {
  return HttpResponse.json(
    { error: 'Payment Required', message: 'Card declined' },
    { status: 402 }
  );
});
```

---

## Next Steps

1. **Implement Phase 2 tasks**: Run `/speckit.tasks` to generate task breakdown
2. **Set up CI/CD**: Configure GitHub Actions for automated testing
3. **Design UI mockups**: Create visual designs for all pages (optional)
4. **Begin implementation**: Start with core components (cart, checkout)
5. **Write tests**: Follow TDD workflow (tests before implementation)

---

## Additional Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [MSW Documentation](https://mswjs.io/docs/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Related Feature Specs
- [Feature 001: Product Catalog](../001-product-catalog/spec.md)
- [Project Constitution](../../.claude/constitution.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)

### API Contracts
- [Cart API](./contracts/cart-api.yaml)
- [Checkout API](./contracts/checkout-api.yaml)
- [Orders API](./contracts/orders-api.yaml)
- [Admin Orders API](./contracts/admin-orders-api.yaml)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Status**: Complete - Ready for Development
