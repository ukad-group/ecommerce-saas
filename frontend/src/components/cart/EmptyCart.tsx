/**
 * EmptyCart Component
 *
 * Displays a message when the shopping cart is empty.
 * Includes a call-to-action to continue shopping.
 */

import { Link } from 'react-router-dom';
import { Button } from '../common/Button';

/**
 * Empty cart state component
 *
 * @example
 * <EmptyCart />
 */
export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Empty Cart Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-24 h-24 text-gray-400 mb-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>

      {/* Empty State Message */}
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Your cart is empty
      </h2>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        Looks like you haven't added any items to your cart yet. Start shopping to fill it up!
      </p>

      {/* Continue Shopping Button */}
      <Link to="/products">
        <Button variant="primary">
          Continue Shopping
        </Button>
      </Link>
    </div>
  );
}
