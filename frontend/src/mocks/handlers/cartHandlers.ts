/**
 * Cart MSW Handlers
 *
 * Mock Service Worker handlers for cart API endpoints.
 * Manages in-memory cart state during development.
 */

import { http, HttpResponse } from 'msw';
import type { Order, OrderLineItem } from '../../types/order';
import { mockProducts } from '../data/mockProducts';
import { mockOrders } from '../data/mockOrders';

// In-memory cart storage (simulates database)
let cartStore: Order | null = null;

// Initialize with existing cart from mockOrders (status 'new')
const initializeCart = () => {
  if (!cartStore) {
    const existingCart = mockOrders.find((order) => order.status === 'new');
    if (existingCart) {
      cartStore = JSON.parse(JSON.stringify(existingCart)); // Deep clone
    }
  }
  return cartStore;
};

// Helper to calculate order totals
const calculateTotals = (lineItems: OrderLineItem[]): {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
} => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.09; // 9% tax rate
  const shipping = subtotal > 100 ? 0 : subtotal > 0 ? 9.99 : 0; // Free shipping over $100
  const total = subtotal + tax + shipping;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

// Helper to create or update cart
const createOrUpdateCart = (lineItems: OrderLineItem[]): Order => {
  const totals = calculateTotals(lineItems);

  if (!cartStore) {
    // Create new cart
    cartStore = {
      id: `order-${Date.now()}`,
      tenantId: 'default-tenant',
      customerId: 'cust-1', // Default customer for dev
      orderNumber: `ORD-${Date.now()}`,
      status: 'new',
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      discount: 0,
      total: totals.total,
      currency: 'USD',
      isGuest: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineItems,
    };
  } else {
    // Update existing cart
    cartStore = {
      ...cartStore,
      lineItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total,
      updatedAt: new Date().toISOString(),
    };
  }

  return cartStore;
};

export const cartHandlers = [
  // GET /api/v1/cart - Get current cart
  http.get('/api/v1/cart', () => {
    const cart = initializeCart();

    if (!cart) {
      // Return empty cart
      const emptyCart: Order = {
        id: `order-${Date.now()}`,
        tenantId: 'default-tenant',
        customerId: 'cust-1',
        orderNumber: `ORD-${Date.now()}`,
        status: 'new',
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: 'USD',
        isGuest: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lineItems: [],
      };
      cartStore = emptyCart;
      return HttpResponse.json(emptyCart);
    }

    return HttpResponse.json(cart);
  }),

  // POST /api/v1/cart/items - Add item to cart
  http.post('/api/v1/cart/items', async ({ request }) => {
    const body = (await request.json()) as {
      productId: string;
      quantity: number;
    };

    const { productId, quantity } = body;

    // Find product
    const product = mockProducts.find((p) => p.id === productId);
    if (!product) {
      return HttpResponse.json(
        { error: 'Product not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Check stock
    if (product.stockQuantity < quantity) {
      return HttpResponse.json(
        { error: 'Insufficient stock', statusCode: 400 },
        { status: 400 }
      );
    }

    // Initialize cart if needed
    initializeCart();
    const lineItems = cartStore?.lineItems || [];

    // Check if product already in cart
    const existingItemIndex = lineItems.findIndex(
      (item) => item.productId === productId
    );

    if (existingItemIndex >= 0) {
      // Update quantity
      const existingItem = lineItems[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      const price = product.salePrice || product.price;

      lineItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        lineTotal: parseFloat((price * newQuantity).toFixed(2)),
      };
    } else {
      // Add new line item
      const price = product.salePrice || product.price;
      const newLineItem: OrderLineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderId: cartStore?.id || '',
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        productImage: product.images[0],
        quantity,
        unitPrice: price,
        lineTotal: parseFloat((price * quantity).toFixed(2)),
        currency: product.currency,
      };
      lineItems.push(newLineItem);
    }

    const updatedCart = createOrUpdateCart(lineItems);
    return HttpResponse.json(updatedCart);
  }),

  // PUT /api/v1/cart/items/:id - Update cart item quantity
  http.put('/api/v1/cart/items/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { quantity: number };
    const { quantity } = body;

    if (!cartStore || !cartStore.lineItems) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const lineItems = [...cartStore.lineItems];
    const itemIndex = lineItems.findIndex((item) => item.id === id);

    if (itemIndex === -1) {
      return HttpResponse.json(
        { error: 'Line item not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Update quantity
    const item = lineItems[itemIndex];
    lineItems[itemIndex] = {
      ...item,
      quantity,
      lineTotal: parseFloat((item.unitPrice * quantity).toFixed(2)),
    };

    const updatedCart = createOrUpdateCart(lineItems);
    return HttpResponse.json(updatedCart);
  }),

  // DELETE /api/v1/cart/items/:id - Remove item from cart
  http.delete('/api/v1/cart/items/:id', ({ params }) => {
    const { id } = params;

    if (!cartStore || !cartStore.lineItems) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const lineItems = cartStore.lineItems.filter((item) => item.id !== id);
    const updatedCart = createOrUpdateCart(lineItems);

    return HttpResponse.json(updatedCart);
  }),

  // DELETE /api/v1/cart - Clear cart
  http.delete('/api/v1/cart', () => {
    cartStore = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
