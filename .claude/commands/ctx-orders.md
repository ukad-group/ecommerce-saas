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
- **Cart = Order with "new" status**: No separate cart entity
- **Market-scoped**: Orders belong to specific markets
- **Custom order statuses**: Tenant-scoped, customizable names/colors/order
- **Default statuses**: Each tenant gets 8 defaults (new, submitted, paid, processing, shipped, completed, cancelled, on-hold, refunded)
- **Delete protection**: Cannot delete statuses in use or system defaults

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

### Not Implemented
❌ Checkout UI (forms and pages) - API ready
❌ Customer order tracking
❌ Cart persistence across sessions
❌ Refund workflows
❌ Abandoned cart recovery

### API Endpoints

**Cart (Customer-facing)**:
- `GET /api/v1/cart` - Get current cart (new order)
- `POST /api/v1/cart/items` - Add item
- `PUT /api/v1/cart/items/:id` - Update quantity
- `DELETE /api/v1/cart/items/:id` - Remove item

**Orders (Admin)**:
- `GET /api/v1/admin/orders` - List all orders
- `GET /api/v1/admin/orders/:id` - Get order details
- `PUT /api/v1/admin/orders/:id/status` - Update status

**Order Statuses (Admin)**:
- `GET /api/v1/order-statuses` - List all statuses for tenant
- `GET /api/v1/order-statuses/active` - List active statuses only
- `POST /api/v1/order-statuses` - Create custom status
- `PUT /api/v1/order-statuses/:id` - Update status
- `DELETE /api/v1/order-statuses/:id` - Delete status (if not in use)
- `POST /api/v1/order-statuses/reset-defaults` - Reset to defaults

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
**Add order field**: Update Order type → OrderDetails component → API mock
**Manage order statuses**: Go to `/admin/order-statuses` to add/edit custom statuses
**Add order filter**: Update AdminOrdersPage filters
**Implement checkout**: Create CheckoutPage → multi-step form → submit order

### Order Status Management
**Default statuses** (seeded for all tenants):
- new, submitted, paid, processing, shipped, completed, cancelled, on-hold, refunded

**Features**:
- Tenant-scoped (each tenant has own status definitions)
- Custom names, colors, and sort order
- System defaults cannot be deleted
- Statuses in use cannot be deleted (validated against orders)
- Active/inactive toggle
- Reset to defaults button

**Implementation**:
- Backend: `OrderStatus` entity, `OrderStatusController`, seeded in `DatabaseSeeder`
- Frontend: `useOrderStatuses` hook, `AdminOrderStatusesPage` component
- Dynamic: All status dropdowns and badges fetch from API
