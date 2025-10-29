/**
 * Mock API Handlers for Tenant Management
 *
 * These handlers simulate tenant CRUD operations for the MVP.
 * In production, these would be replaced by real API endpoints.
 */

import { http, HttpResponse } from 'msw';
import { MOCK_TENANTS } from '../data/mockTenants';
import type { Tenant, CreateTenantInput, UpdateTenantInput, TenantsResponse } from '../../types/tenant';

// In-memory storage for tenants (starts with mock data)
let tenants = [...MOCK_TENANTS];

export const tenantHandlers = [
  // GET /api/v1/tenants - List all tenants (superadmin only)
  http.get('/api/v1/tenants', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const status = url.searchParams.get('status') as 'active' | 'inactive' | null;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Filter tenants
    let filteredTenants = tenants;

    if (search) {
      filteredTenants = filteredTenants.filter(
        t => t.name.toLowerCase().includes(search) ||
             t.displayName.toLowerCase().includes(search)
      );
    }

    if (status) {
      filteredTenants = filteredTenants.filter(t => t.status === status);
    }

    // Pagination
    const total = filteredTenants.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

    const response: TenantsResponse = {
      data: paginatedTenants,
      total,
      page,
      limit,
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  // GET /api/v1/tenants/:id - Get tenant details
  http.get('/api/v1/tenants/:id', ({ params }) => {
    const { id } = params;
    const tenant = tenants.find(t => t.id === id);

    if (!tenant) {
      return HttpResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(tenant, { status: 200 });
  }),

  // POST /api/v1/tenants - Create tenant (superadmin only)
  http.post('/api/v1/tenants', async ({ request }) => {
    const body = await request.json() as CreateTenantInput;

    // Validate required fields
    if (!body.name || !body.displayName || !body.contactEmail) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    if (tenants.some(t => t.name === body.name)) {
      return HttpResponse.json(
        { error: 'Tenant name already exists' },
        { status: 409 }
      );
    }

    // Create new tenant
    const newTenant: Tenant = {
      id: `tenant-${Date.now()}`,
      name: body.name.toLowerCase().replace(/\s+/g, '-'),
      displayName: body.displayName,
      status: 'active',
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      address: body.address,
      settings: body.settings || {},
      marketCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user', // In production, get from auth
    };

    tenants.push(newTenant);
    return HttpResponse.json(newTenant, { status: 201 });
  }),

  // PUT /api/v1/tenants/:id - Update tenant (superadmin only)
  http.put('/api/v1/tenants/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as UpdateTenantInput;

    const tenantIndex = tenants.findIndex(t => t.id === id);

    if (tenantIndex === -1) {
      return HttpResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Update tenant
    tenants[tenantIndex] = {
      ...tenants[tenantIndex],
      ...body,
      updatedAt: new Date(),
      updatedBy: 'current-user', // In production, get from auth
    };

    return HttpResponse.json(tenants[tenantIndex], { status: 200 });
  }),

  // DELETE /api/v1/tenants/:id - Deactivate tenant (superadmin only)
  http.delete('/api/v1/tenants/:id', ({ params }) => {
    const { id } = params;
    const tenantIndex = tenants.findIndex(t => t.id === id);

    if (tenantIndex === -1) {
      return HttpResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Soft delete - just mark as inactive
    tenants[tenantIndex] = {
      ...tenants[tenantIndex],
      status: 'inactive',
      updatedAt: new Date(),
      updatedBy: 'current-user',
    };

    return HttpResponse.json(
      { message: 'Tenant deactivated successfully' },
      { status: 200 }
    );
  }),

  // POST /api/v1/tenants/:id/reactivate - Reactivate tenant (superadmin only)
  http.post('/api/v1/tenants/:id/reactivate', ({ params }) => {
    const { id } = params;
    const tenantIndex = tenants.findIndex(t => t.id === id);

    if (tenantIndex === -1) {
      return HttpResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Reactivate tenant
    tenants[tenantIndex] = {
      ...tenants[tenantIndex],
      status: 'active',
      updatedAt: new Date(),
      updatedBy: 'current-user',
    };

    return HttpResponse.json(tenants[tenantIndex], { status: 200 });
  }),
];