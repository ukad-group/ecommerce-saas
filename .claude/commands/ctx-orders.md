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
  status: 'new' | 'submitted' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled';
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
- **Status workflow**: new → submitted → paid → processing → shipped → completed
- **Can cancel**: At any point before completed

### Implemented Features
✅ Shopping cart (add, update, remove items)
✅ Cart totals calculation
✅ Admin order dashboard with metrics
✅ Order list with filters (status, tenant, date, search)
✅ Order details view
✅ Order status updates with notes
✅ Stock warnings in cart

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

### Components

**Admin**:
- **AdminDashboardPage**: `/admin` - Metrics + recent orders
- **AdminOrdersPage**: `/admin/orders` - Order list with filters
- **AdminOrderDetailsPage**: `/admin/orders/:id` - Full order view
- **OrderStatusUpdate**: Status change modal with notes
- **OrderFilters**: Status, tenant, date range, search

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
**Change status workflow**: Update status validation logic in OrderStatusUpdate
**Add order filter**: Update AdminOrdersPage filters
**Implement checkout**: Create CheckoutPage → multi-step form → submit order
