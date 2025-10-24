/**
 * React Router Configuration
 *
 * Defines application routes and navigation structure.
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { CartPage } from './pages/CartPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminOrderDetailsPage } from './pages/admin/AdminOrderDetailsPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { ProductEditPage } from './pages/admin/ProductEditPage';
import { CategoriesPage } from './pages/admin/CategoriesPage';
import { CategoryEditPage } from './pages/admin/CategoryEditPage';

// Placeholder components - will be implemented in later tasks
const CheckoutPage = () => <div>Checkout Page - Coming Soon</div>;
const CheckoutConfirmationPage = () => <div>Order Confirmation - Coming Soon</div>;
const OrdersPage = () => <div>Orders Page - Coming Soon</div>;
const OrderDetailPage = () => <div>Order Detail - Coming Soon</div>;

/**
 * Application router configuration
 * Defines all routes and their associated components
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin" replace />,
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/orders',
        element: (
          <ProtectedRoute>
            <AdminOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/orders/:orderId',
        element: (
          <ProtectedRoute>
            <AdminOrderDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/products',
        element: (
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/products/new',
        element: (
          <ProtectedRoute>
            <ProductEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/products/:productId/edit',
        element: (
          <ProtectedRoute>
            <ProductEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/categories',
        element: (
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/categories/new',
        element: (
          <ProtectedRoute>
            <CategoryEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/categories/:categoryId/edit',
        element: (
          <ProtectedRoute>
            <CategoryEditPage />
          </ProtectedRoute>
        ),
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
    ],
  },
]);
