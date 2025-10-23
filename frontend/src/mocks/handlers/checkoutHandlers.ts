/**
 * Checkout MSW Handlers
 *
 * Mock Service Worker handlers for checkout API endpoints.
 * Simulates checkout flow: shipping, billing, submit, payment.
 */

import { http, HttpResponse } from 'msw';
import type { Order } from '../../types/order';
import type { ShippingAddress, BillingAddress } from '../../types/address';
import type { PaymentTransaction } from '../../types/payment';

// Import cart store from cartHandlers (we need to access the cart)
// This is a simplified approach - in real implementation, this would be backend state
let currentCart: Order | null = null;

export const checkoutHandlers = [
  // POST /api/v1/checkout/validate - Validate cart before checkout
  http.post('http://localhost:3000/api/v1/checkout/validate', () => {
    // Simple validation - check if cart has items
    if (!currentCart || !currentCart.lineItems || currentCart.lineItems.length === 0) {
      return HttpResponse.json(
        { valid: false, errors: ['Cart is empty'] },
        { status: 400 }
      );
    }

    // In real implementation, would check stock availability, prices, etc.
    return HttpResponse.json({ valid: true });
  }),

  // POST /api/v1/checkout/shipping - Set shipping address
  http.post('http://localhost:3000/api/v1/checkout/shipping', async ({ request }) => {
    const address = (await request.json()) as ShippingAddress;

    // Get cart from localStorage (MSW can't share state with cartHandlers easily)
    // In real backend, this would fetch from database
    const storedCart = localStorage.getItem('ecommerce-cart');
    if (!storedCart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const cart: Order = JSON.parse(storedCart).state.cart;
    if (!cart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Update cart with shipping address
    const updatedCart: Order = {
      ...cart,
      shippingAddress: address,
      updatedAt: new Date().toISOString(),
    };

    // Update localStorage
    const storage = JSON.parse(storedCart);
    storage.state.cart = updatedCart;
    localStorage.setItem('ecommerce-cart', JSON.stringify(storage));

    return HttpResponse.json(updatedCart);
  }),

  // POST /api/v1/checkout/billing - Set billing address
  http.post('http://localhost:3000/api/v1/checkout/billing', async ({ request }) => {
    const body = (await request.json()) as BillingAddress & {
      sameAsShipping?: boolean;
    };
    const { sameAsShipping, ...address } = body;

    // Get cart from localStorage
    const storedCart = localStorage.getItem('ecommerce-cart');
    if (!storedCart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const cart: Order = JSON.parse(storedCart).state.cart;
    if (!cart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // If same as shipping, use shipping address
    const billingAddress = sameAsShipping ? cart.shippingAddress : address;

    // Update cart with billing address
    const updatedCart: Order = {
      ...cart,
      billingAddress,
      updatedAt: new Date().toISOString(),
    };

    // Update localStorage
    const storage = JSON.parse(storedCart);
    storage.state.cart = updatedCart;
    localStorage.setItem('ecommerce-cart', JSON.stringify(storage));

    return HttpResponse.json(updatedCart);
  }),

  // POST /api/v1/checkout/submit - Submit order
  http.post('http://localhost:3000/api/v1/checkout/submit', () => {
    // Get cart from localStorage
    const storedCart = localStorage.getItem('ecommerce-cart');
    if (!storedCart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const cart: Order = JSON.parse(storedCart).state.cart;
    if (!cart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Validate addresses are set
    if (!cart.shippingAddress || !cart.billingAddress) {
      return HttpResponse.json(
        { error: 'Shipping and billing addresses required', statusCode: 400 },
        { status: 400 }
      );
    }

    // Transition order status from 'new' to 'submitted'
    const updatedCart: Order = {
      ...cart,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update localStorage
    const storage = JSON.parse(storedCart);
    storage.state.cart = updatedCart;
    localStorage.setItem('ecommerce-cart', JSON.stringify(storage));

    return HttpResponse.json(updatedCart);
  }),

  // POST /api/v1/checkout/payment - Process payment
  http.post('http://localhost:3000/api/v1/checkout/payment', async ({ request }) => {
    const paymentData = (await request.json()) as {
      cardNumber: string;
      cardholderName: string;
      expiryMonth: string;
      expiryYear: string;
      cvv: string;
    };

    // Get cart from localStorage
    const storedCart = localStorage.getItem('ecommerce-cart');
    if (!storedCart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const cart: Order = JSON.parse(storedCart).state.cart;
    if (!cart) {
      return HttpResponse.json(
        { error: 'Cart not found', statusCode: 404 },
        { status: 404 }
      );
    }

    // Validate order is submitted
    if (cart.status !== 'submitted') {
      return HttpResponse.json(
        { error: 'Order must be submitted before payment', statusCode: 400 },
        { status: 400 }
      );
    }

    // Create payment transaction
    const transaction: PaymentTransaction = {
      id: `txn-${Date.now()}`,
      orderId: cart.id,
      amount: cart.total,
      currency: cart.currency,
      paymentMethod: 'card',
      status: 'completed',
      cardLast4: paymentData.cardNumber.slice(-4),
      cardBrand: 'Visa', // Simplified - would detect from card number
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };

    // Transition order status from 'submitted' to 'paid'
    const updatedCart: Order = {
      ...cart,
      status: 'paid',
      updatedAt: new Date().toISOString(),
      transactions: [transaction],
    };

    // Update localStorage
    const storage = JSON.parse(storedCart);
    storage.state.cart = updatedCart;
    localStorage.setItem('ecommerce-cart', JSON.stringify(storage));

    return HttpResponse.json({ transaction, order: updatedCart });
  }),
];
