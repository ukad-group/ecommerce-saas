/**
 * MSW Handlers for Categories API
 *
 * Mock API handlers for category-related endpoints.
 */

import { http, HttpResponse } from 'msw';
import { mockCategories } from '../data/mockCategories';
import type { Category } from '../../types/product';

const baseURL = 'http://localhost:3000/api/v1';

export const categoriesHandlers = [
  // GET /api/v1/categories - List all categories
  http.get(`${baseURL}/categories`, ({ request }) => {
    const tenantId = request.headers.get('X-Tenant-ID');
    const marketId = request.headers.get('X-Market-ID');

    let filteredCategories = [...mockCategories];

    // Filter by tenant (if specified)
    if (tenantId) {
      filteredCategories = filteredCategories.filter((c) => c.tenantId === tenantId);
    }

    // Filter by market (if specified)
    if (marketId) {
      filteredCategories = filteredCategories.filter((c) => c.marketId === marketId);
    }

    return HttpResponse.json(filteredCategories);
  }),

  // GET /api/v1/categories/:id - Get single category
  http.get(`${baseURL}/categories/:id`, ({ params }) => {
    const { id } = params;
    const category = mockCategories.find((c) => c.id === id);

    if (!category) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(category);
  }),

  // POST /api/v1/categories - Create category
  http.post(`${baseURL}/categories`, async ({ request }) => {
    const body = (await request.json()) as Partial<Category>;
    const tenantId = request.headers.get('X-Tenant-ID') || 'tenant-a';
    const marketId = request.headers.get('X-Market-ID') || 'market-1';

    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      tenantId,
      marketId,
      name: body.name || '',
      description: body.description,
      parentId: body.parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCategories.push(newCategory);

    return HttpResponse.json(newCategory, { status: 201 });
  }),

  // PUT /api/v1/categories/:id - Update category
  http.put(`${baseURL}/categories/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<Category>;
    const index = mockCategories.findIndex((c) => c.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const updatedCategory: Category = {
      ...mockCategories[index],
      ...body,
      id: mockCategories[index].id,
      tenantId: mockCategories[index].tenantId,
      marketId: mockCategories[index].marketId,
      updatedAt: new Date().toISOString(),
    };

    mockCategories[index] = updatedCategory;

    return HttpResponse.json(updatedCategory);
  }),

  // DELETE /api/v1/categories/:id - Delete category
  http.delete(`${baseURL}/categories/:id`, ({ params }) => {
    const { id } = params;
    const index = mockCategories.findIndex((c) => c.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if category has children
    const hasChildren = mockCategories.some((c) => c.parentId === id);
    if (hasChildren) {
      return HttpResponse.json(
        {
          error: 'Bad Request',
          message: 'Cannot delete category with subcategories',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    mockCategories.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
