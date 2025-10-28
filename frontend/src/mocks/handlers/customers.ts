/**
 * MSW Handlers for Customers API
 *
 * Mock API handlers for customer-related endpoints.
 */

import { http, HttpResponse } from 'msw';
import { mockCustomers } from '../data/mockCustomers';

const baseURL = 'http://localhost:3000/api';

export const customersHandlers = [
  // GET /api/customers - List all customers
  http.get(`${baseURL}/customers`, () => {
    return HttpResponse.json({
      data: mockCustomers,
      totalCount: mockCustomers.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  }),

  // GET /api/customers/:id - Get single customer
  http.get(`${baseURL}/customers/:id`, ({ params }) => {
    const { id } = params;
    const customer = mockCustomers.find((c) => c.id === id);

    if (!customer) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Customer not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: customer });
  }),
];
