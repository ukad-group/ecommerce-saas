Review order and cart management implementation before proceeding.

## Orders & Cart Context

**Status**: Partially implemented (admin complete, checkout UI pending)

### Data Model
```typescript
interface Order {
  id: string;
  orderNumber: string;
  marketId: string;
  tenantId: string;
  customerId?: string;
  status: string; // Dynamic - defined by OrderStatus entities
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress?: Address;
  billingAddress?: Address;
  statusHistory: OrderStatusChange[];
  createdAt: Date;
  updatedAt: Date;
}

interface OrderStatusDefinition {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  color: string;
  sortOrder: number;
  isSystemDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OrderStatusChange {
  from: string;
  to: string;
  changedAt: Date;
  changedBy?: string;
  notes?: string;
}
```

### Key Concepts
- **Cart is its own entity**, persisted in the `Carts` table and keyed by `SessionId` (the storefront's
  only handle on it — a cart carries no customer details until checkout creates the order). Carts are
  market-scoped and deleted on `ClearCart`, so only abandoned ones accumulate. They are **not** orders
  in a "new" status: cart→order mirroring was removed (it polluted the Orders list with `CART-*` junk),
  and `GetAllOrders()` still filters out legacy `cart-*` rows.
- **Market-scoped**: Orders belong to specific markets
- **Custom order statuses**: Market-scoped — each store owns its own set (names/colors/order). They
  used to be tenant-wide, so deleting one in a store deleted it in every sibling store
- **Default statuses**: Each tenant gets 8 defaults (new, submitted, paid, processing, shipped, completed, cancelled, on-hold, refunded)
- **Delete protection**: Any status can be deleted, system defaults included — what blocks it is a
  reference to the code (an order, or a market's `OrderStatusAfterPayment`/`CartOrderStatus`).
  `isSystemDefault` is only the marker `reset-defaults` restores from

### Implemented Features
✅ Shopping cart (add, update, remove items)
✅ Cart totals calculation
✅ Admin order dashboard with metrics
✅ Order list with filters (status, tenant, date, search)
✅ Order details view
✅ Order status updates with notes
✅ Stock warnings in cart
✅ Custom order status management (create/edit/delete, custom colors)
✅ Dynamic status filters and badges using custom statuses
✅ Cart persistence across restarts (SQLite `Carts` table)
✅ Backoffice cart list + detail view (Umbraco Commerce section → Carts), paged server-side

### Not Implemented
❌ Checkout UI (forms and pages) - API ready
❌ Customer order tracking
❌ Refund workflows
❌ Abandoned cart recovery (carts persist and are listable, but nothing emails or re-targets them;
   there is also no TTL/eviction, so the table grows until carts are checked out or cleared)

### API Endpoints

**Cart (Customer-facing, anonymous, `X-Session-ID` identifies the cart)**:
- `GET /api/v1/cart` - Get (or implicitly create) the session's cart
- `POST /api/v1/cart/items` - Add item
- `PUT /api/v1/cart/items/:id` - Update quantity
- `DELETE /api/v1/cart/items/:id` - Remove item
- `DELETE /api/v1/cart` - Clear the whole cart (e.g. after a paid order)

**Carts (Admin)**:
- `GET /api/v1/carts?search&page&pageSize` - Paged cart list for the market, `UpdatedAt DESC`.
  Requires auth (JWT **or** API key, so the Umbraco plugin reaches it); `search` matches session id
  and product names, since a cart has no customer or order number.

**Orders (Storefront)**:
- `POST /api/v1/orders` - Create an order from the session's cart
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id` - **Update in place**: rebuild an existing unpaid order from the session's
  current cart + the supplied customer/address/custom properties, keeping `Id`, `OrderNumber` and
  `CreatedAt`. Same `CreateOrderRequest` body as POST. Requires auth (JWT **or** API key).
  `409` once the order is settled (status is `paid`/the market's `OrderStatusAfterPayment`, or
  `PaymentStatus` reached `Authorized`/`Captured`) — rewriting a paid order's totals would corrupt a
  real sale, so the caller falls back to creating a new order. `404` unknown id, `400` empty cart.
  Exists so a storefront whose checkout creates the order before the payment step (it needs the id and
  total) updates that order when the customer backs out and re-submits, instead of minting a second one.
  Moves **no stock** — it deliberately bypasses `OrderStatusService.ApplyStatus`, and leaves `Status`,
  `PaymentStatus`, `PaymentReference` and `TrackingNumber` untouched.
- `PUT /api/v1/orders/:id/status` - Update status (routed through `OrderStatusService`)

Both POST and PUT share `OrdersController.ApplyCartAndPricing`, so a re-submitted checkout re-prices
identically to a first submit: lines re-projected from the cart, goods tax re-resolved from the
shipping country, shipping cost, payment surcharge + its own tax, then the total.

**Orders (Admin)**:
- `GET /api/v1/admin/orders` - List all orders
- `GET /api/v1/admin/orders/:id` - Get order details
- `PUT /api/v1/admin/orders/:id/status` - Update status
- `POST /api/v1/admin/orders` / `PUT /api/v1/admin/orders/:id` - Import/upsert a historical order
  verbatim (migration) — no cart, no re-pricing, no stock side-effects

**Order Statuses (Admin)**:
- `GET /api/v1/order-statuses` - List the market's statuses (every endpoint below requires
  `X-Market-ID` as well as `X-Tenant-ID`, and answers 400 without it)
- `GET /api/v1/order-statuses/active` - List active statuses only
- `POST /api/v1/order-statuses` - Create custom status
- `PUT /api/v1/order-statuses/:id` - Update status (`code` is fixed — orders reference it)
- `DELETE /api/v1/order-statuses/:id` - Delete status (refused while an order, or a market's
  `OrderStatusAfterPayment`/`CartOrderStatus`, still names its code — system defaults *are* deletable)
- `POST /api/v1/order-statuses/reset-defaults` - Reset to defaults, re-adding any default that was
  deleted (the way back from deleting one; the seeder only backfills tenants with no statuses at all)

The three write endpoints use the `AdminOrApiKey` policy (not `AdminOnly`, which is JWT-only) so the
Umbraco plugin can manage statuses with its API key; `reset-defaults` stays JWT-only. Like every other
`AdminOrApiKey` endpoint they scope by the `X-Tenant-ID` header, not the key's tenant claim.

### Components

**Admin**:
- **AdminDashboardPage**: `/admin` - Metrics + recent orders
- **AdminOrdersPage**: `/admin/orders` - Order list with filters
- **AdminOrderDetailsPage**: `/admin/orders/:id` - Full order view
- **AdminOrderStatusesPage**: `/admin/order-statuses` - Manage custom statuses
- **OrderStatusUpdate**: Status change modal with notes (uses dynamic statuses)
- **OrderFilters**: Status, tenant, date range, search (uses dynamic statuses)
- **OrderStatusBadge**: Displays status with custom colors

**Customer (Showcase)**:
- **CartPage**: Shopping cart view
- **CartItem**: Line item display
- **CartSummary**: Totals breakdown
- **CartIndicator**: Item count badge in nav

### State Management
- **Admin**: TanStack Query for order data
- **Customer**: CartStore (Zustand) synced with API

### Permissions
- **Superadmin**: All orders, all markets
- **Tenant Admin**: Orders in their markets only
- **Tenant User**: View only (no status updates)

### Important Notes
- Orders are **market-specific** (single market per order)
- All items in cart must be from same market
- Status transitions are validated (can't go backward)
- API requires `X-Market-ID` header

### Common Tasks
**Add order field**: Update Order type → OrderDetails component → API
**Manage order statuses**: Go to `/admin/order-statuses` to add/edit/delete statuses
**Add order filter**: Update AdminOrdersPage filters
**Implement checkout**: Create CheckoutPage → multi-step form → submit order

### Order Status Management
**Default statuses** (seeded for all tenants):
- new, submitted, paid, processing, shipped, completed, cancelled, on-hold, refunded

**Features**:
- Market-scoped (each store has its own status definitions; `OrderStatus.MarketId`, unique on
  `(TenantId, MarketId, Code)`)
- Custom names, colors, and sort order
- System defaults are deletable; "Reset to defaults" restores any that were deleted
- A status referenced by an order or a market's checkout settings cannot be deleted
- Active/inactive toggle
- Reset to defaults button

**Implementation**:
- Backend: `OrderStatus` entity, `OrderStatusController`, seeded in `DatabaseSeeder`
- Frontend: `useOrderStatuses` hook, `AdminOrderStatusesPage` component
- Dynamic: All status dropdowns and badges fetch from API
