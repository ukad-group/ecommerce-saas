/**
 * Mock API Handlers for Market Management
 *
 * These handlers simulate market CRUD operations for the MVP.
 * In production, these would be replaced by real API endpoints.
 */

import { http, HttpResponse } from 'msw';
import { mockMarkets } from '../data/mockMarkets';
import { Market, CreateMarketInput, UpdateMarketInput } from '../../types/market';

// In-memory storage for markets (starts with mock data)
let markets = [...mockMarkets];

export const marketHandlers = [
  // GET /api/v1/markets - List markets (filtered by role/tenant)
  http.get('/api/v1/markets', ({ request }) => {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const type = url.searchParams.get('type') as 'physical' | 'online' | 'hybrid' | null;
    const status = url.searchParams.get('status') as 'active' | 'inactive' | null;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Filter markets
    let filteredMarkets = markets;

    if (tenantId) {
      filteredMarkets = filteredMarkets.filter(m => m.tenantId === tenantId);
    }

    if (search) {
      filteredMarkets = filteredMarkets.filter(
        m => m.name.toLowerCase().includes(search) ||
             m.code.toLowerCase().includes(search)
      );
    }

    if (type) {
      filteredMarkets = filteredMarkets.filter(m => m.type === type);
    }

    if (status) {
      filteredMarkets = filteredMarkets.filter(m => m.status === status);
    }

    // Pagination
    const total = filteredMarkets.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMarkets = filteredMarkets.slice(startIndex, endIndex);

    return HttpResponse.json({
      data: paginatedMarkets,
      total,
      page,
      limit,
    }, { status: 200 });
  }),

  // GET /api/v1/markets/:id - Get market details
  http.get('/api/v1/markets/:id', ({ params }) => {
    const { id } = params;
    const market = markets.find(m => m.id === id);

    if (!market) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(market, { status: 200 });
  }),

  // POST /api/v1/markets - Create market
  http.post('/api/v1/markets', async ({ request }) => {
    const body = await request.json() as CreateMarketInput;

    // Validate required fields
    if (!body.tenantId || !body.name || !body.code || !body.type || !body.currency || !body.timezone) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate code uniqueness within tenant
    const existingCode = markets.some(
      m => m.tenantId === body.tenantId && m.code === body.code
    );

    if (existingCode) {
      return HttpResponse.json(
        { error: 'Market code already exists within this tenant' },
        { status: 409 }
      );
    }

    // Validate address for physical/hybrid types
    if ((body.type === 'physical' || body.type === 'hybrid') && !body.address) {
      return HttpResponse.json(
        { error: 'Address is required for physical and hybrid markets' },
        { status: 400 }
      );
    }

    // Create new market
    const newMarket: Market = {
      id: `market-${Date.now()}`,
      tenantId: body.tenantId,
      name: body.name,
      code: body.code.toUpperCase(),
      type: body.type,
      status: 'active',
      currency: body.currency,
      timezone: body.timezone,
      address: body.address,
      settings: body.settings || {},
      apiKeyCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user', // In production, get from auth
    };

    markets.push(newMarket);
    return HttpResponse.json(newMarket, { status: 201 });
  }),

  // PUT /api/v1/markets/:id - Update market
  http.put('/api/v1/markets/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as UpdateMarketInput;

    const marketIndex = markets.findIndex(m => m.id === id);

    if (marketIndex === -1) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // If updating code, check uniqueness within tenant
    if (body.code) {
      const tenantId = markets[marketIndex].tenantId;
      const existingCode = markets.some(
        m => m.tenantId === tenantId && m.code === body.code && m.id !== id
      );

      if (existingCode) {
        return HttpResponse.json(
          { error: 'Market code already exists within this tenant' },
          { status: 409 }
        );
      }
    }

    // Validate address for physical/hybrid types
    const updatedType = body.type || markets[marketIndex].type;
    if ((updatedType === 'physical' || updatedType === 'hybrid') &&
        body.type && !body.address && !markets[marketIndex].address) {
      return HttpResponse.json(
        { error: 'Address is required for physical and hybrid markets' },
        { status: 400 }
      );
    }

    // Update market
    markets[marketIndex] = {
      ...markets[marketIndex],
      ...body,
      code: body.code ? body.code.toUpperCase() : markets[marketIndex].code,
      updatedAt: new Date(),
      updatedBy: 'current-user', // In production, get from auth
    };

    return HttpResponse.json(markets[marketIndex], { status: 200 });
  }),

  // DELETE /api/v1/markets/:id - Deactivate market
  http.delete('/api/v1/markets/:id', ({ params }) => {
    const { id } = params;
    const marketIndex = markets.findIndex(m => m.id === id);

    if (marketIndex === -1) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Soft delete - just mark as inactive
    markets[marketIndex] = {
      ...markets[marketIndex],
      status: 'inactive',
      updatedAt: new Date(),
      updatedBy: 'current-user',
    };

    return HttpResponse.json(
      { message: 'Market deactivated successfully' },
      { status: 200 }
    );
  }),

  // POST /api/v1/markets/:id/reactivate - Reactivate market
  http.post('/api/v1/markets/:id/reactivate', ({ params }) => {
    const { id } = params;
    const marketIndex = markets.findIndex(m => m.id === id);

    if (marketIndex === -1) {
      return HttpResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Reactivate market
    markets[marketIndex] = {
      ...markets[marketIndex],
      status: 'active',
      updatedAt: new Date(),
      updatedBy: 'current-user',
    };

    return HttpResponse.json(markets[marketIndex], { status: 200 });
  }),
];