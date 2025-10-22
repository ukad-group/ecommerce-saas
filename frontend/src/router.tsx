/**
 * React Router Configuration
 *
 * Defines application routes and navigation structure.
 */

import { createBrowserRouter } from 'react-router-dom';

// Placeholder components - will be implemented in later tasks
const HomePage = () => <div>Home Page - Coming Soon</div>;
const CartPage = () => <div>Cart Page - Coming Soon</div>;
const CheckoutPage = () => <div>Checkout Page - Coming Soon</div>;
const CheckoutConfirmationPage = () => <div>Order Confirmation - Coming Soon</div>;
const OrdersPage = () => <div>Orders Page - Coming Soon</div>;
const OrderDetailPage = () => <div>Order Detail - Coming Soon</div>;
const AdminOrdersPage = () => <div>Admin Orders - Coming Soon</div>;
const AdminOrderDetailPage = () => <div>Admin Order Detail - Coming Soon</div>;

/**
 * Application router configuration
 * Defines all routes and their associated components
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/cart',
    element: <CartPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/checkout/confirmation/:orderId',
    element: <CheckoutConfirmationPage />,
  },
  {
    path: '/orders',
    element: <OrdersPage />,
  },
  {
    path: '/orders/:orderId',
    element: <OrderDetailPage />,
  },
  {
    path: '/admin/orders',
    element: <AdminOrdersPage />,
  },
  {
    path: '/admin/orders/:orderId',
    element: <AdminOrderDetailPage />,
  },
]);
