/**
 * CartPage Component
 *
 * Full shopping cart page with cart items, summary, and checkout button.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../services/hooks/useCart';
import { useUpdateCartItem } from '../services/hooks/useUpdateCartItem';
import { useRemoveCartItem } from '../services/hooks/useRemoveCartItem';
import { useClearCart } from '../services/hooks/useClearCart';
import { CartItem } from '../components/cart/CartItem';
import { CartSummary } from '../components/cart/CartSummary';
import { EmptyCart } from '../components/cart/EmptyCart';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

/**
 * Shopping cart page component
 *
 * Displays cart contents, allows quantity updates, item removal,
 * and provides checkout navigation.
 */
export function CartPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading, error } = useCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const handleUpdateQuantity = (lineItemId: string, quantity: number) => {
    updateCartItem.mutate({ lineItemId, quantity });
  };

  const handleRemove = (lineItemId: string) => {
    removeCartItem.mutate(lineItemId);
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart.mutate();
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error loading cart
          </h2>
          <p className="text-red-700">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cart || !cart.lineItems || cart.lineItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Cart Items ({cart.lineItems.length})
              </h2>
              <Button
                variant="danger"
                onClick={handleClearCart}
                className="text-sm px-3 py-1"
              >
                Clear Cart
              </Button>
            </div>

            <div className="space-y-4">
              {cart.lineItems.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CartSummary order={cart} />

            <Button
              variant="primary"
              onClick={handleCheckout}
              className="w-full mt-4"
            >
              Proceed to Checkout
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate('/products')}
              className="w-full mt-2"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
