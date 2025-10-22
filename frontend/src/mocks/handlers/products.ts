/**
 * MSW Handlers for Products API
 *
 * Mock API handlers for product-related endpoints.
 */

import { http, HttpResponse } from 'msw';
import { mockProducts } from '../data/mockProducts';
import type { Product } from '../../types/product';

const baseURL = 'http://localhost:3000/api';

export const productsHandlers = [
  // GET /api/products - List all products
  http.get(`${baseURL}/products`, () => {
    return HttpResponse.json({
      data: mockProducts,
      totalCount: mockProducts.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  }),

  // GET /api/products/:id - Get single product
  http.get(`${baseURL}/products/:id`, ({ params }) => {
    const { id } = params;
    const product = mockProducts.find((p) => p.id === id);

    if (!product) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Product not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: product });
  }),

  // POST /api/products - Create product
  http.post(`${baseURL}/products`, async ({ request }) => {
    const body = (await request.json()) as Partial<Product>;

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      tenantId: 'default-tenant',
      name: body.name || '',
      sku: body.sku || '',
      description: body.description || '',
      price: body.price || 0,
      salePrice: body.salePrice,
      status: body.status || 'draft',
      stockQuantity: body.stockQuantity || 0,
      lowStockThreshold: body.lowStockThreshold || 10,
      currency: body.currency || 'USD',
      images: body.images || [],
      categoryIds: body.categoryIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockProducts.push(newProduct);

    return HttpResponse.json({ data: newProduct }, { status: 201 });
  }),

  // PUT /api/products/:id - Update product
  http.put(`${baseURL}/products/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<Product>;
    const index = mockProducts.findIndex((p) => p.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Product not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const updatedProduct: Product = {
      ...mockProducts[index],
      ...body,
      id: mockProducts[index].id,
      tenantId: mockProducts[index].tenantId,
      updatedAt: new Date().toISOString(),
    };

    mockProducts[index] = updatedProduct;

    return HttpResponse.json({ data: updatedProduct });
  }),

  // DELETE /api/products/:id - Delete product
  http.delete(`${baseURL}/products/:id`, ({ params }) => {
    const { id } = params;
    const index = mockProducts.findIndex((p) => p.id === id);

    if (index === -1) {
      return HttpResponse.json(
        {
          error: 'Not Found',
          message: 'Product not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    mockProducts.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
