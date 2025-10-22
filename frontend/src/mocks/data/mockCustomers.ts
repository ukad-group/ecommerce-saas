/**
 * Mock Customer Data
 *
 * Sample customers for development and testing.
 */

import type { Customer } from '../../types/customer';

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    tenantId: 'default-tenant',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-0101',
    isGuest: false,
    createdAt: '2025-08-15T09:30:00Z',
  },
  {
    id: 'cust-2',
    tenantId: 'default-tenant',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1-555-0102',
    isGuest: false,
    createdAt: '2025-09-01T14:20:00Z',
  },
  {
    id: 'cust-3',
    tenantId: 'default-tenant',
    email: 'michael.johnson@example.com',
    firstName: 'Michael',
    lastName: 'Johnson',
    phone: '+1-555-0103',
    isGuest: false,
    createdAt: '2025-09-10T11:45:00Z',
  },
  {
    id: 'cust-4',
    tenantId: 'default-tenant',
    email: 'guest@example.com',
    firstName: 'Guest',
    lastName: 'User',
    isGuest: true,
    createdAt: '2025-10-20T16:10:00Z',
  },
  {
    id: 'cust-5',
    tenantId: 'default-tenant',
    email: 'sarah.williams@example.com',
    firstName: 'Sarah',
    lastName: 'Williams',
    phone: '+1-555-0105',
    isGuest: false,
    createdAt: '2025-07-25T10:00:00Z',
  },
];
