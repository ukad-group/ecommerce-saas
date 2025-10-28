/**
 * Admin MSW Handlers
 *
 * Mock Service Worker handlers for admin API endpoints.
 * Handles order management operations for administrators.
 */

import { http, HttpResponse } from 'msw';
import { mockOrders } from '../data/mockOrders';
import type { Order, OrderStatus } from '../../types/order';

// Helper to filter orders based on query parameters
function filterOrders(
  orders: Order[],
  params: {
    status?: string;
    tenantId?: string;
    marketId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Order[] {
  let filtered = [...orders];

  // Filter by status
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((order) => order.status === params.status);
  }

  // Filter by tenant
  if (params.tenantId && params.tenantId !== 'all') {
    filtered = filtered.filter((order) => order.tenantId === params.tenantId);
  }

  // Filter by market
  if (params.marketId && params.marketId !== 'all') {
    filtered = filtered.filter((order) => order.marketId === params.marketId);
  }

  // Filter by search query (order number, customer ID)
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customerId.toLowerCase().includes(searchLower)
    );
  }

  // Filter by date range
  if (params.dateFrom) {
    const fromDate = new Date(params.dateFrom);
    filtered = filtered.filter(
      (order) => new Date(order.createdAt) >= fromDate
    );
  }

  if (params.dateTo) {
    const toDate = new Date(params.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter((order) => new Date(order.createdAt) <= toDate);
  }

  // Sort by creation date (most recent first)
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return filtered;
}

export const adminHandlers = [
  // GET /admin/orders - Get all orders with filtering
  http.get('http://localhost:3000/api/v1/admin/orders', ({ request }) => {
    const url = new URL(request.url);
    const params = {
      status: url.searchParams.get('status') || undefined,
      tenantId: url.searchParams.get('tenantId') || undefined,
      marketId: url.searchParams.get('marketId') || undefined,
      search: url.searchParams.get('search') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
    };

    const filteredOrders = filterOrders(mockOrders, params);

    return HttpResponse.json(filteredOrders);
  }),

  // GET /admin/orders/:orderId - Get specific order
  http.get(
    'http://localhost:3000/api/v1/admin/orders/:orderId',
    ({ params }) => {
      const { orderId } = params;
      const order = mockOrders.find((o) => o.id === orderId);

      if (!order) {
        return HttpResponse.json(
          {
            error: 'Order not found',
            message: `Order with ID ${orderId} does not exist`,
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      return HttpResponse.json(order);
    }
  ),

  // PUT /admin/orders/:orderId/status - Update order status
  http.put(
    'http://localhost:3000/api/v1/admin/orders/:orderId/status',
    async ({ params, request }) => {
      const { orderId } = params;
      const body = (await request.json()) as {
        status: OrderStatus;
        note?: string;
      };

      const order = mockOrders.find((o) => o.id === orderId);

      if (!order) {
        return HttpResponse.json(
          {
            error: 'Order not found',
            message: `Order with ID ${orderId} does not exist`,
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      // Update order status
      const updatedOrder: Order = {
        ...order,
        status: body.status,
        updatedAt: new Date().toISOString(),
      };

      // In a real implementation, this would update the database
      // and add to status history
      console.log(
        `[MSW] Updated order ${orderId} status to ${body.status}`,
        body.note ? `with note: ${body.note}` : ''
      );

      return HttpResponse.json(updatedOrder);
    }
  ),

  // POST /admin/orders/:orderId/notes - Add note to order
  http.post(
    'http://localhost:3000/api/v1/admin/orders/:orderId/notes',
    async ({ params, request }) => {
      const { orderId } = params;
      const body = (await request.json()) as { note: string };

      const order = mockOrders.find((o) => o.id === orderId);

      if (!order) {
        return HttpResponse.json(
          {
            error: 'Order not found',
            message: `Order with ID ${orderId} does not exist`,
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      console.log(`[MSW] Added note to order ${orderId}: ${body.note}`);

      return HttpResponse.json(order);
    }
  ),

  // POST /admin/orders/:orderId/refund - Process refund
  http.post(
    'http://localhost:3000/api/v1/admin/orders/:orderId/refund',
    async ({ params, request }) => {
      const { orderId } = params;
      const body = (await request.json()) as {
        amount: number;
        reason: string;
      };

      const order = mockOrders.find((o) => o.id === orderId);

      if (!order) {
        return HttpResponse.json(
          {
            error: 'Order not found',
            message: `Order with ID ${orderId} does not exist`,
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      // Update order status to refunded
      const updatedOrder: Order = {
        ...order,
        status: 'refunded',
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `[MSW] Processed refund for order ${orderId}: $${body.amount} - ${body.reason}`
      );

      return HttpResponse.json(updatedOrder);
    }
  ),

  // GET /admin/orders/export - Export orders
  http.get('http://localhost:3000/api/v1/admin/orders/export', ({ request }) => {
    const url = new URL(request.url);
    const params = {
      status: url.searchParams.get('status') || undefined,
      tenantId: url.searchParams.get('tenantId') || undefined,
      marketId: url.searchParams.get('marketId') || undefined,
      search: url.searchParams.get('search') || undefined,
      dateFrom: url.searchParams.get('dateFrom') || undefined,
      dateTo: url.searchParams.get('dateTo') || undefined,
    };

    const filteredOrders = filterOrders(mockOrders, params);

    // Generate CSV content
    const csvHeader =
      'Order Number,Customer ID,Status,Items,Total,Currency,Tenant,Market,Created At\n';
    const csvRows = filteredOrders
      .map((order) =>
        [
          order.orderNumber,
          order.customerId,
          order.status,
          order.lineItems?.length || 0,
          order.total,
          order.currency,
          order.tenantId,
          order.marketId,
          order.createdAt,
        ].join(',')
      )
      .join('\n');

    const csvContent = csvHeader + csvRows;

    return HttpResponse.text(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="orders.csv"',
      },
    });
  }),
];
