# Feature 002: Cart & Order Management

## Overview

**Feature Branch**: `002-cart-order-management`
**Status**: Partially Implemented
**Priority**: P1 (Core MVP)
**Created**: 2025-10-22

This feature implements a comprehensive shopping cart and order management system where carts are represented as orders with "new" status, progressing through multiple states (new → submitted → paid → completed). Includes both customer-facing cart functionality and admin order management.

## Quick Reference

- **Specification**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Tasks**: [tasks.md](tasks.md)

## What's Implemented

### Cart Management (Phases 3-4) ✅
- ✅ Shopping cart view with line items
- ✅ Add products to cart
- ✅ Update cart item quantities
- ✅ Remove items from cart
- ✅ Clear entire cart
- ✅ Cart totals calculation (subtotal, tax, shipping, total)
- ✅ Cart indicator showing item count
- ✅ Empty cart messaging
- ✅ Out-of-stock warnings

### Admin Order Management (Phase 7) ✅
- ✅ Admin dashboard with metrics and recent orders
- ✅ Order list view with filtering
  - Filter by status (all, new, submitted, paid, completed, cancelled)
  - Filter by tenant
  - Filter by date range
  - Search by order number or customer
- ✅ Order details view
  - Line items with product info
  - Order status history
  - Shipping and billing addresses
  - Payment transactions
- ✅ Order status updates with notes
- ✅ Status badges with color coding
- ✅ Quick actions (view, update status)

### API Infrastructure (Phase 5 Partial) ✅
- ✅ Checkout API endpoints (mocked)
- ✅ Checkout store (Zustand)
- ✅ Checkout hooks (TanStack Query)
- ✅ MSW handlers for checkout flow

## What's Missing

### Checkout UI (Phase 5) ❌
- ❌ Shipping address form
- ❌ Billing address form
- ❌ Payment form
- ❌ Order review page
- ❌ Checkout progress indicator
- ❌ Checkout page (wizard flow)
- ❌ Order confirmation page
- ❌ Address validation

### Customer Order Tracking (Phase 6) ❌
- ❌ Customer order history page
- ❌ Customer order details page
- ❌ Order status timeline view
- ❌ Order tracking information
- ❌ Estimated delivery dates

### Cart Persistence (Phase 8) ❌
- ❌ localStorage persistence for guest carts
- ❌ Cart expiration (30-day cleanup)
- ❌ Guest cart merge on login
- ❌ Cross-device cart sync for logged-in users

### Refunds (Phase 9) ❌
- ❌ Customer order cancellation
- ❌ Admin refund processing
- ❌ Refund status tracking
- ❌ Partial refund support

### Cart Abandonment (Phase 10) ❌
- ❌ Abandoned cart detection
- ❌ Cart recovery emails
- ❌ Abandoned cart reports

### Polish (Phase 11) ❌
- ❌ Loading states
- ❌ Error boundaries
- ❌ Toast notifications
- ❌ Accessibility improvements
- ❌ Responsive design refinements
- ❌ Bundle optimization

## Key Components

### Cart Components
- **CartPage** (`frontend/src/pages/CartPage.tsx`)
  - Main cart view
  - Line items list
  - Cart totals
  - Proceed to checkout button

- **CartItem** (`frontend/src/components/cart/CartItem.tsx`)
  - Individual line item
  - Quantity controls
  - Remove button
  - Price and totals

- **CartSummary** (`frontend/src/components/cart/CartSummary.tsx`)
  - Subtotal, tax, shipping, total
  - Promotional code input (future)

- **CartIndicator** (`frontend/src/components/cart/CartIndicator.tsx`)
  - Header indicator showing item count
  - Links to cart page

- **EmptyCart** (`frontend/src/components/cart/EmptyCart.tsx`)
  - Empty state messaging
  - Continue shopping button

### Admin Order Components
- **AdminDashboardPage** (`frontend/src/pages/admin/AdminDashboardPage.tsx`)
  - Order metrics (total, pending, completed, revenue)
  - Recent orders list
  - Quick actions

- **AdminOrdersPage** (`frontend/src/pages/admin/AdminOrdersPage.tsx`)
  - Comprehensive order list
  - Advanced filtering
  - Search functionality

- **AdminOrderDetailsPage** (`frontend/src/pages/admin/AdminOrderDetailsPage.tsx`)
  - Full order information
  - Line items with product details
  - Addresses and payment info
  - Status update controls

- **OrderStatusUpdate** (`frontend/src/components/admin/OrderStatusUpdate.tsx`)
  - Status dropdown
  - Notes field
  - Update button

- **OrderFilters** (`frontend/src/components/admin/OrderFilters.tsx`)
  - Status filter
  - Tenant filter
  - Date range filter
  - Search input

- **OrderStatusBadge** (`frontend/src/components/orders/OrderStatusBadge.tsx`)
  - Color-coded status indicators
  - Icons for each status

## API Endpoints

### Cart API (Mocked with MSW)
```typescript
GET    /api/v1/cart                    // Get current cart
POST   /api/v1/cart/items              // Add item to cart
PUT    /api/v1/cart/items/:id          // Update item quantity
DELETE /api/v1/cart/items/:id          // Remove item
DELETE /api/v1/cart                    // Clear cart
```

### Checkout API (Mocked, UI Not Implemented)
```typescript
POST   /api/v1/checkout/validate       // Validate cart before checkout
POST   /api/v1/checkout/shipping       // Set shipping address
POST   /api/v1/checkout/billing        // Set billing address
POST   /api/v1/checkout/submit         // Submit order (new → submitted)
POST   /api/v1/checkout/payment        // Process payment (submitted → paid)
```

### Orders API (Admin - Mocked)
```typescript
GET    /api/v1/admin/orders            // List all orders (filtered)
GET    /api/v1/admin/orders/:id        // Get order details
PUT    /api/v1/admin/orders/:id/status // Update order status
POST   /api/v1/admin/orders/:id/notes  // Add admin note (future)
POST   /api/v1/admin/orders/:id/refund // Process refund (future)
```

### Customer Orders API (Not Implemented)
```typescript
GET    /api/v1/orders                  // Customer order history
GET    /api/v1/orders/:id              // Customer order details
GET    /api/v1/orders/:id/status-history // Order status timeline
POST   /api/v1/orders/:id/cancel       // Request cancellation
```

## Data Models

### Order
```typescript
{
  id: string;
  tenantId: string;
  customerId: string;
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
  productName: string;
  productSKU: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

### OrderStatusHistory
```typescript
{
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  timestamp: Date;
  notes?: string;
  userId?: string;
}
```

## Order Status Workflow

```
new (cart) → submitted (order placed) → paid (payment confirmed) → completed (fulfilled)
              ↓                           ↓                           ↓
           cancelled                  cancelled                   (no cancellation)
```

**Status Definitions**:
- **new**: Shopping cart, customer still browsing
- **submitted**: Order placed, awaiting payment
- **paid**: Payment confirmed, ready for fulfillment
- **completed**: Order fulfilled and delivered
- **cancelled**: Order cancelled (before completion)

## Multi-Tenancy

All orders and carts are isolated by tenant:
- Each order has a `tenantId` field
- API calls include `X-Tenant-ID` header
- MSW handlers filter by tenant ID
- Superadmin sees all tenants; other roles see only their tenant
- Cart persistence considers tenant context

## Testing

### Manual Test Scenarios

**Test 1: Add to Cart**
1. Navigate to product list
2. Click "Add to Cart" on a product
3. Verify cart indicator updates
4. Navigate to `/cart`
5. Verify product appears in cart with correct details

**Test 2: Modify Cart**
1. Navigate to `/cart` with items
2. Change quantity of an item
3. Verify line total and order total update
4. Remove an item
5. Verify item removed and totals recalculated
6. Clear cart
7. Verify empty cart message appears

**Test 3: Stock Warnings**
1. Add product with low/no stock to cart
2. Verify warning badge appears
3. Verify checkout button disabled/warned

**Test 4: Admin Order Management**
1. Navigate to `/admin`
2. View order metrics and recent orders
3. Navigate to `/admin/orders`
4. Filter by status (e.g., "submitted")
5. Search for order by number
6. Click on an order
7. View full order details
8. Update order status with notes
9. Verify status history updated

**Test 5: Order Filtering**
1. Navigate to `/admin/orders`
2. Filter by status: "paid"
3. Filter by tenant: "Demo Store"
4. Filter by date range
5. Verify only matching orders shown
6. Clear filters
7. Verify all orders shown

### Edge Cases Covered

- ✅ Adding same product twice (quantity increments)
- ✅ Updating quantity to zero (removes item)
- ✅ Empty cart display
- ✅ Out-of-stock product in cart
- ✅ Invalid order status transitions (blocked)
- ✅ Order not found (404 handling)
- ⚠️ Concurrent cart modifications (needs testing)
- ❌ Product price changes while in cart (not handled)
- ❌ Cart expiration (not implemented)
- ❌ Guest cart merge (not implemented)

## Success Criteria Status

From [spec.md](spec.md) Success Criteria:

- **SC-001** ✅ Cart operations < 2s: ACHIEVED
- **SC-002** ⏳ Checkout < 5 minutes: NOT TESTED (UI missing)
- **SC-003** ✅ 95% status transition success: ACHIEVED
- **SC-004** ⏳ Cart persistence 100%: NOT IMPLEMENTED
- **SC-005** ❌ Cart merge on login 100%: NOT IMPLEMENTED
- **SC-006** ✅ Status history accuracy: ACHIEVED
- **SC-007** ✅ Admin find/update < 30s: ACHIEVED
- **SC-008** ✅ Out-of-stock prevention: ACHIEVED
- **SC-009** ❌ Abandonment emails < 24h: NOT IMPLEMENTED
- **SC-010** ⏳ Confirmation emails < 1min: NOT IMPLEMENTED
- **SC-011** ✅ Tenant isolation: ACHIEVED
- **SC-012** ⏳ Inventory sync 100%: NEEDS backend testing

## Next Steps

### High Priority (Complete Phase 5)
1. **Build Checkout UI**
   - ShippingForm component
   - BillingForm component
   - PaymentForm component
   - OrderReview component
   - CheckoutPage with wizard flow
   - Order confirmation page

2. **Complete Checkout Flow**
   - Connect forms to checkout API
   - Add address validation
   - Implement checkout progress indicator
   - Handle checkout errors gracefully

### Medium Priority
3. **Cart Persistence** (Phase 8)
   - localStorage for guest carts
   - Cart expiration logic
   - Guest cart merge on login
   - Cross-device sync for logged-in users

4. **Customer Order Tracking** (Phase 6)
   - Order history page
   - Order details page
   - Status timeline visualization
   - Tracking information display

### Low Priority
5. **Refund Processing** (Phase 9)
6. **Cart Abandonment** (Phase 10)
7. **Polish & Optimization** (Phase 11)

## Dependencies

### Internal
- ✅ Product catalog (products, pricing, inventory)
- ✅ Auth system (customer context, role-based access)
- ⏳ Customer management (customer accounts)
- ⏳ Payment gateway integration

### External
- ⏳ Payment processing service (Stripe/PayPal)
- ⏳ Email notification service
- ⏳ Tax calculation service
- ⏳ Shipping rate calculation service

## Known Issues

1. **No Cart Persistence**: Carts don't persist across browser sessions
2. **Checkout UI Missing**: API ready but forms not built
3. **No Customer View**: Only admin can view orders
4. **Price Changes**: Cart doesn't update if product price changes
5. **No Inventory Reservation**: Stock not reserved during checkout
6. **Hard-coded Tax/Shipping**: Currently using fixed percentages in mock

## Configuration

### Mock Data
Located in `frontend/src/mocks/data/`:
- **mockOrders.ts**: 10+ sample orders in various statuses
- **mockProducts.ts**: Products for cart testing
- **mockCustomers.ts**: Customer profiles

### Environment Variables
```bash
VITE_TENANT_ID=demo-tenant
VITE_API_BASE_URL=http://localhost:5176/api
VITE_USE_MOCKS=true
```

### MSW Handlers
Located in `frontend/src/mocks/handlers/`:
- **cartHandlers.ts**: Cart CRUD operations
- **checkoutHandlers.ts**: Checkout workflow
- **ordersHandlers.ts**: Customer order management (future)
- **adminHandlers.ts**: Admin order management

## Architecture Notes

### Cart as Order with "new" Status
**Rationale**: Simplifies data model by treating cart as first step of order lifecycle rather than separate entity. Benefits:
- Single table for both carts and orders
- Seamless transition from cart to order
- Unified history tracking
- Easier inventory management

**Tradeoff**: Slightly more complex queries to distinguish active carts from historical orders.

### Zustand for Cart State
**Why**: Cart needs client-side state management for instant UI updates and offline support. Zustand provides:
- Minimal boilerplate
- Built-in persistence middleware
- Easy integration with TanStack Query
- Small bundle size

### TanStack Query for Orders
**Why**: Orders are server-managed data with complex caching needs:
- Automatic cache invalidation
- Optimistic updates
- Background refetching
- Excellent DevTools

## Future Backend Implementation

When implementing the .NET backend:

1. **Database Schema**
   - Orders table (includes carts with status='new')
   - OrderLineItems table
   - OrderStatusHistory table
   - Addresses table (shipping/billing)
   - PaymentTransactions table

2. **Order Status State Machine**
   - Validate transitions server-side
   - Prevent invalid status changes
   - Audit all transitions in history table

3. **Inventory Management**
   - Reserve stock when status → 'submitted'
   - Deduct stock when status → 'paid'
   - Release stock when status → 'cancelled'

4. **Multi-Tenancy**
   - All queries filter by tenant_id
   - Validate tenant context in all operations

5. **Performance**
   - Index on: tenant_id, customer_id, status, created_at, order_number
   - Implement server-side pagination
   - Consider caching for frequently accessed orders

## Resources

- Specification: [spec.md](spec.md)
- Implementation Plan: [plan.md](plan.md)
- Task List: [tasks.md](tasks.md)
- Project Overview: [../../CLAUDE.md](../../CLAUDE.md)
- Constitution: [../../memory/constitution.md](../../memory/constitution.md)

---

**Last Updated**: 2025-10-28
**Current Phase**: Phase 5 (Checkout UI) - API Ready, UI Pending
**Next Milestone**: Complete checkout forms and page
