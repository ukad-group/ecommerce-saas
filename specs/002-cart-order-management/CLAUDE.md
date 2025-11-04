# Feature 002: Cart & Order Management

## Overview

**Feature Branch**: `002-cart-order-management`
**Status**: Partially Implemented
**Priority**: P1 (Core MVP)
**Created**: 2025-10-22

Shopping cart and order management system where carts are orders with "new" status, progressing through states (new → submitted → paid → completed). Includes customer cart functionality and admin order management.

### Market-Based Orders

Orders are **market-specific**:
- Associated with specific market
- Products from market's catalog
- Market-level fulfillment and inventory
- Location-specific pricing and shipping

## Quick Reference

- **Specification**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Tasks**: [tasks.md](tasks.md)

## Implementation Status

### ✅ Completed

**Cart Management (Phases 3-4)**:
- Shopping cart view with line items
- Add/update/remove items, clear cart
- Cart totals (subtotal, tax, shipping, total)
- Cart indicator with item count
- Empty cart messaging, out-of-stock warnings

**Admin Order Management (Phase 7)**:
- Dashboard with metrics and recent orders
- Order list with filters (status, tenant, date, search)
- Order details (line items, addresses, payment, history)
- Status updates with notes
- Status badges and quick actions

**API Infrastructure (Phase 5 Partial)**:
- Checkout API endpoints implemented in .NET Mock API
- Checkout store (Zustand)
- Checkout hooks (TanStack Query)

### ❌ Missing

**Checkout UI (Phase 5)**:
- Shipping/billing address forms
- Payment form
- Order review page
- Checkout progress indicator
- Order confirmation page

**Customer Order Tracking (Phase 6)**:
- Order history page
- Order details page
- Status timeline view

**Cart Persistence (Phase 8)**:
- localStorage for guest carts
- 30-day expiration cleanup
- Guest cart merge on login
- Cross-device sync

**Refunds (Phase 9)**:
- Customer cancellation
- Admin refund processing

**Cart Abandonment (Phase 10)**:
- Detection and recovery emails

**Polish (Phase 11)**:
- Loading states, error boundaries, notifications
- Accessibility and responsive refinements

## Key Components

### Cart Components
- **CartPage** ([CartPage.tsx](../../frontend/src/pages/CartPage.tsx)) - Main cart view
- **CartItem** ([CartItem.tsx](../../frontend/src/components/cart/CartItem.tsx)) - Line item with quantity controls
- **CartSummary** ([CartSummary.tsx](../../frontend/src/components/cart/CartSummary.tsx)) - Order totals
- **CartIndicator** ([CartIndicator.tsx](../../frontend/src/components/cart/CartIndicator.tsx)) - Header indicator
- **EmptyCart** ([EmptyCart.tsx](../../frontend/src/components/cart/EmptyCart.tsx)) - Empty state

### Admin Order Components
- **AdminDashboardPage** ([AdminDashboardPage.tsx](../../frontend/src/pages/admin/AdminDashboardPage.tsx)) - Metrics and recent orders
- **AdminOrdersPage** ([AdminOrdersPage.tsx](../../frontend/src/pages/admin/AdminOrdersPage.tsx)) - Order list with filters
- **AdminOrderDetailsPage** ([AdminOrderDetailsPage.tsx](../../frontend/src/pages/admin/AdminOrderDetailsPage.tsx)) - Full order details
- **OrderStatusUpdate** ([OrderStatusUpdate.tsx](../../frontend/src/components/admin/OrderStatusUpdate.tsx)) - Status update controls
- **OrderFilters** ([OrderFilters.tsx](../../frontend/src/components/admin/OrderFilters.tsx)) - Filter controls
- **OrderStatusBadge** ([OrderStatusBadge.tsx](../../frontend/src/components/orders/OrderStatusBadge.tsx)) - Color-coded badges

## API Endpoints

All endpoints implemented in .NET Mock API (http://localhost:5180).

### Cart API
```
GET    /api/v1/cart                    # Get current cart
POST   /api/v1/cart/items              # Add item
PUT    /api/v1/cart/items/:id          # Update quantity
DELETE /api/v1/cart/items/:id          # Remove item
DELETE /api/v1/cart                    # Clear cart
```

### Checkout API (API Ready, UI Missing)
```
POST   /api/v1/checkout/validate       # Validate cart
POST   /api/v1/checkout/shipping       # Set shipping address
POST   /api/v1/checkout/billing        # Set billing address
POST   /api/v1/checkout/submit         # Submit order (new → submitted)
POST   /api/v1/checkout/payment        # Process payment (submitted → paid)
```

### Admin Orders API
```
GET    /api/v1/admin/orders            # List all orders (filtered)
GET    /api/v1/admin/orders/:id        # Order details
PUT    /api/v1/admin/orders/:id/status # Update status
POST   /api/v1/admin/orders/:id/notes  # Add note (future)
POST   /api/v1/admin/orders/:id/refund # Process refund (future)
```

### Customer Orders API (Not Implemented)
```
GET    /api/v1/orders                  # Order history
GET    /api/v1/orders/:id              # Order details
GET    /api/v1/orders/:id/status-history # Status timeline
POST   /api/v1/orders/:id/cancel       # Request cancellation
```

## Data Models

### Order
```typescript
{
  id: string;
  tenantId: string;
  marketId: string;            // Market-specific
  orderNumber: string;
  status: 'new' | 'submitted' | 'paid' | 'completed' | 'cancelled';
  lineItems: OrderLineItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  statusHistory: OrderStatusHistory[];
  paymentTransactions: PaymentTransaction[];
  createdAt: Date;
  updatedAt: Date;
}
```

### OrderLineItem
```typescript
{
  id: string;
  orderId: string;
  productId: string;
  marketId: string;            // Product's market
  productName: string;
  productSKU: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

## Order Status Workflow

```
new (cart) → submitted → paid → completed
    ↓            ↓         ↓
cancelled    cancelled  (no cancel)
```

**Status Definitions**:
- **new**: Shopping cart
- **submitted**: Order placed, awaiting payment
- **paid**: Payment confirmed, ready for fulfillment
- **completed**: Fulfilled and delivered
- **cancelled**: Cancelled before completion

## Multi-Tenancy & Market Isolation

### Context
- **Tenant Level**: Orders belong to tenant, tenant has multiple markets
- **Market Level**: Each order tied to specific market, products from market catalog
- API calls include `X-Tenant-ID` and `X-Market-ID` headers

### Access Control
- **Superadmin**: All tenants and markets
- **Tenant Admin**: All markets within tenant
- **Tenant User**: Assigned markets only

### Cart/Order Context
- Cart persistence includes market context
- Orders scoped to specific market
- Checkout validates products belong to same market

## Testing

### Manual Test Scenarios

**Add to Cart**:
1. Browse products, click "Add to Cart"
2. Verify cart indicator updates
3. Navigate to `/cart`, verify product appears

**Modify Cart**:
1. Update quantity, verify totals recalculate
2. Remove item, verify removal
3. Clear cart, verify empty message

**Stock Warnings**:
1. Add low/no stock product
2. Verify warning appears

**Admin Order Management**:
1. Navigate to `/admin`, view metrics
2. Navigate to `/admin/orders`, filter by status
3. Click order, view details
4. Update status with notes
5. Verify history updated

**Order Filtering**:
1. Filter by status, tenant, date range
2. Search by order number
3. Verify results match criteria

### Edge Cases
- ✅ Same product twice (quantity increments)
- ✅ Quantity to zero (removes item)
- ✅ Empty cart display
- ✅ Out-of-stock warnings
- ✅ Invalid status transitions (blocked)
- ✅ Order not found (404 handling)
- ⚠️ Concurrent modifications (needs testing)
- ❌ Price changes while in cart (not handled)
- ❌ Cart expiration (not implemented)

## Success Criteria Status

- **SC-001** ✅ Cart operations < 2s
- **SC-002** ⏳ Checkout < 5min (UI missing)
- **SC-003** ✅ 95% status transition success
- **SC-004** ❌ Cart persistence (not implemented)
- **SC-005** ❌ Cart merge on login (not implemented)
- **SC-006** ✅ Status history accuracy
- **SC-007** ✅ Admin find/update < 30s
- **SC-008** ✅ Out-of-stock prevention
- **SC-009** ❌ Abandonment emails (not implemented)
- **SC-010** ⏳ Confirmation emails (not implemented)
- **SC-011** ✅ Tenant isolation
- **SC-012** ⏳ Inventory sync (needs backend testing)

## Next Steps

### High Priority
1. **Build Checkout UI** - Forms, wizard flow, confirmation page
2. **Cart Persistence** - localStorage for guests, merge on login
3. **Customer Order Tracking** - History and details pages

### Medium Priority
4. **Refund Processing**
5. **Cart Abandonment**

### Low Priority
6. **Polish & Optimization**

## Dependencies

### Internal
- ✅ Product catalog (products, pricing, inventory)
- ✅ Auth system (authentication, RBAC)
- ✅ Market management
- ⏳ Payment gateway integration

### External
- ⏳ Payment service (Stripe/PayPal)
- ⏳ Email notification service
- ⏳ Tax calculation service
- ⏳ Shipping rate service

## Known Issues

1. **No Cart Persistence**: Doesn't persist across sessions
2. **Checkout UI Missing**: API ready, forms not built
3. **No Customer View**: Admin-only order viewing
4. **Price Changes**: Cart doesn't update if price changes
5. **No Inventory Reservation**: Stock not reserved during checkout
6. **Hard-coded Tax/Shipping**: Fixed percentages in mock

## Configuration

### Seed Data
Located in `mock-api/MockApi/Data/MockDataStore.cs`:
- 10+ sample orders in various statuses
- Market-specific products and orders

### Environment Variables
```bash
# Frontend .env.local
VITE_TENANT_ID=tenant-a
VITE_API_BASE_URL=http://localhost:5180/api/v1
VITE_USE_MOCKS=false
```

## Architecture Notes

### Cart as Order with "new" Status
**Rationale**: Simplifies data model, seamless transition, unified history tracking.
**Tradeoff**: Slightly more complex queries to distinguish carts from orders.

### Zustand for Cart State
**Why**: Instant UI updates, persistence middleware, easy TanStack Query integration, tiny bundle.

### TanStack Query for Orders
**Why**: Automatic cache invalidation, optimistic updates, background refetching, excellent DevTools.

## Backend Implementation Notes

When implementing .NET backend:

1. **Database Schema**: Orders, OrderLineItems, OrderStatusHistory, Addresses, PaymentTransactions tables
2. **State Machine**: Validate transitions server-side, prevent invalid changes, audit all transitions
3. **Inventory**: Reserve on 'submitted', deduct on 'paid', release on 'cancelled'
4. **Multi-Tenancy**: Filter by tenant_id AND market_id, validate context in all operations
5. **Performance**: Index on (tenant_id, market_id, status, created_at), order_number (unique), pagination

## Resources

- [Specification](spec.md)
- [Implementation Plan](plan.md)
- [Task List](tasks.md)
- [Project Overview](../../CLAUDE.md)
- [Constitution](../../memory/constitution.md)

---

**Last Updated**: 2025-11-04
**Current Phase**: Phase 5 (Checkout UI) - API Ready, UI Pending
**Next Milestone**: Complete checkout forms and page
