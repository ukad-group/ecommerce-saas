/**
 * React Router Configuration
 *
 * Defines application routes and navigation structure.
 */

import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CartPage } from './pages/CartPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { ProductEditPage } from './pages/admin/ProductEditPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { CategoryEditPage } from './pages/admin/CategoryEditPage';

// Placeholder components - will be implemented in later tasks
const HomePage = () => <div>Home Page - Coming Soon</div>;
const CheckoutPage = () => <div>Checkout Page - Coming Soon</div>;
const CheckoutConfirmationPage = () => <div>Order Confirmation - Coming Soon</div>;
const OrdersPage = () => <div>Orders Page - Coming Soon</div>;
const OrderDetailPage = () => <div>Order Detail - Coming Soon</div>;
const AdminOrderDetailPage = () => <div>Admin Order Detail - Coming Soon</div>;

/**
 * Application router configuration
 * Defines all routes and their associated components
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'checkout/confirmation/:orderId',
        element: <CheckoutConfirmationPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailPage />,
      },
      {
        path: 'admin/orders',
        element: <AdminOrdersPage />,
      },
      {
        path: 'admin/orders/:orderId',
        element: <AdminOrderDetailPage />,
      },
      {
        path: 'admin/products',
        element: <ProductsPage />,
      },
      {
        path: 'admin/products/new',
        element: <ProductEditPage />,
      },
      {
        path: 'admin/products/:productId/edit',
        element: <ProductEditPage />,
      },
      {
        path: 'admin/categories',
        element: <CategoriesPage />,
      },
      {
        path: 'admin/categories/new',
        element: <CategoryEditPage />,
      },
      {
        path: 'admin/categories/:categoryId/edit',
        element: <CategoryEditPage />,
      },
    ],
  },
]);
