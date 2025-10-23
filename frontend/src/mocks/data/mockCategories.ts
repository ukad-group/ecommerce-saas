/**
 * Mock Categories Data
 *
 * Sample category data for development and testing.
 */

import type { Category } from '../../types/product';

export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    tenantId: 'default-tenant',
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'cat-2',
    tenantId: 'default-tenant',
    name: 'Computers',
    description: 'Laptops, desktops, and computer accessories',
    parentId: 'cat-1',
    createdAt: '2024-01-15T10:05:00Z',
    updatedAt: '2024-01-15T10:05:00Z',
  },
  {
    id: 'cat-3',
    tenantId: 'default-tenant',
    name: 'Mobile Phones',
    description: 'Smartphones and mobile accessories',
    parentId: 'cat-1',
    createdAt: '2024-01-15T10:10:00Z',
    updatedAt: '2024-01-15T10:10:00Z',
  },
  {
    id: 'cat-4',
    tenantId: 'default-tenant',
    name: 'Clothing',
    description: 'Apparel and fashion items',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'cat-5',
    tenantId: 'default-tenant',
    name: "Men's Clothing",
    description: "Men's apparel and accessories",
    parentId: 'cat-4',
    createdAt: '2024-01-20T10:05:00Z',
    updatedAt: '2024-01-20T10:05:00Z',
  },
  {
    id: 'cat-6',
    tenantId: 'default-tenant',
    name: "Women's Clothing",
    description: "Women's apparel and accessories",
    parentId: 'cat-4',
    createdAt: '2024-01-20T10:10:00Z',
    updatedAt: '2024-01-20T10:10:00Z',
  },
  {
    id: 'cat-7',
    tenantId: 'default-tenant',
    name: 'Home & Garden',
    description: 'Home decor, furniture, and garden supplies',
    createdAt: '2024-01-25T10:00:00Z',
    updatedAt: '2024-01-25T10:00:00Z',
  },
  {
    id: 'cat-8',
    tenantId: 'default-tenant',
    name: 'Books',
    description: 'Physical and digital books',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
];
