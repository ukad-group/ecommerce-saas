/**
 * MSW Handlers for Orders API
 *
 * Mock API handlers for order-related endpoints.
 */

import { http, HttpResponse } from 'msw';
import { mockOrders } from '../data/mockOrders';
import type { Order } from '../../types/order';

const baseURL = 'http://localhost:3000/api';

export const ordersHandlers = [
  // GET /api/orders - List all orders
  http.get(`${baseURL}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredOrders = [...mockOrders];

    // Filter by status if provided
    if (status) {
      filteredOrders = filteredOrders.filter((o) => o.status === status);
    }

    }

    return HttpResponse.json({
      data: filteredOrders,
      totalCount: filteredOrders.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  }),

  // GET /api/orders/:id - Get single order
  http.get(`${baseURL}/orders/:id`, ({ params }) => {
    const { id } = params;
    const order = mockOrders.find((o) => o.id === id);

    if (!order) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: order });
  }),

  // POST /api/orders - Create order (cart)
  http.post(`${baseURL}/orders`, async ({ request }) => {
    const body = (await request.json()) as Partial<Order>;

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      tenantId: 'default-tenant',
      
      orderNumber: `ORD-2025-${1000 + mockOrders.length + 1}`,
      status: 'new',
      subtotal: body.subtotal || 0,
      tax: body.tax || 0,
      shipping: body.shipping || 0,
      discount: body.discount || 0,
      total: body.total || 0,
      currency: body.currency || 'USD',
      isGuest: body.isGuest || false,
      guestEmail: body.guestEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineItems: body.lineItems || [],
    };

    mockOrders.push(newOrder);

    return HttpResponse.json({ data: newOrder }, { status: 201 });
  }),

  // PUT /api/orders/:id - Update order
  http.put(`${baseURL}/orders/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<Order>;
    const index = mockOrders.findIndex((o) => o.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const updatedOrder: Order = {
      ...mockOrders[index],
      ...body,
      id: mockOrders[index].id,
      tenantId: mockOrders[index].tenantId,
      updatedAt: new Date().toISOString(),
    };

    mockOrders[index] = updatedOrder;

    return HttpResponse.json({ data: updatedOrder });
  }),

  // POST /api/orders/:id/submit - Submit order
  http.post(`${baseURL}/orders/:id/submit`, ({ params }) => {
    const { id } = params;
    const index = mockOrders.findIndex((o) => o.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const submittedOrder: Order = {
      ...mockOrders[index],
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockOrders[index] = submittedOrder;

    return HttpResponse.json({ data: submittedOrder });
  }),

  // POST /api/orders/:id/cancel - Cancel order
  http.post(`${baseURL}/orders/:id/cancel`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { reason?: string };
    const index = mockOrders.findIndex((o) => o.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const cancelledOrder: Order = {
      ...mockOrders[index],
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: body.reason || 'Cancelled by customer',
      updatedAt: new Date().toISOString(),
    };

    mockOrders[index] = cancelledOrder;

    return HttpResponse.json({ data: cancelledOrder });
  }),

    const cart = mockOrders.find(
    );

    if (!cart) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Cart not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: cart });
  }),
];
