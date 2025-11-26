Review tenant and market management implementation before proceeding.

## Tenants & Markets Context

**Status**: Fully implemented

### Data Hierarchy
```
Tenant (Business Entity)
└── Markets (Stores/Locations)
    └── Categories + Products
    └── Orders
    └── API Keys
```

### Data Model
```typescript
interface Tenant {
  id: string;
  name: string;              // Unique slug (e.g., "tenant-a")
  displayName: string;       // Human-readable (e.g., "Demo Retail Group")
  status: 'active' | 'inactive';
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  settings?: {
    maxMarkets?: number;
    maxUsers?: number;
    features?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Market {
  id: string;
  tenantId: string;
  name: string;              // Display name
  code: string;              // Unique within tenant
  type: 'physical' | 'online' | 'hybrid';
  status: 'active' | 'inactive';
  currency: string;
  timezone: string;
  address?: Address;
  apiKeyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiKey {
  id: string;
  tenantId: string;
  marketId: string;
  name: string;              // Descriptive name
  keyHash: string;           // Never store plain text
  lastFourChars: string;     // For display
  status: 'active' | 'revoked';
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}
```

### Key Concepts
- **Tenant isolation**: Complete data separation between tenants
- **Market scope**: Products, categories, orders belong to specific markets
- **API keys**: Market-scoped for external integrations
- **Multi-location**: One tenant can have multiple markets (stores)

### Features
✅ Tenant CRUD
✅ Market CRUD (within tenant)
✅ API key generation (per market)
✅ Search and filtering
✅ Pagination
✅ Status management (active/inactive)

### API Endpoints

**Tenants** (Superadmin only):
- `GET /api/v1/tenants` - List all tenants
- `POST /api/v1/tenants` - Create tenant
- `GET /api/v1/tenants/:id` - Get tenant details
- `PUT /api/v1/tenants/:id` - Update tenant
- `DELETE /api/v1/tenants/:id` - Delete tenant

**Markets** (Superadmin + Tenant Admin):
- `GET /api/v1/markets?tenantId=:id` - List markets for tenant
- `POST /api/v1/markets` - Create market
- `GET /api/v1/markets/:id` - Get market details
- `PUT /api/v1/markets/:id` - Update market
- `DELETE /api/v1/markets/:id` - Delete market

**API Keys**:
- `GET /api/v1/api-keys?marketId=:id` - List keys for market
- `POST /api/v1/api-keys` - Generate new key (returns full key once!)
- `PUT /api/v1/api-keys/:id/revoke` - Revoke key
- `DELETE /api/v1/api-keys/:id` - Delete key

### Components

**Tenants** (Superadmin only):
- **TenantsPage**: `/admin/tenants` - Tenant list with search
- **TenantList**: Table with pagination
- **TenantForm**: Create/edit modal
- **TenantDetailsPage**: Full tenant view with markets

**Markets** (Superadmin + Tenant Admin):
- **MarketsPage**: Market list within tenant
- **MarketList**: Table with filters
- **MarketForm**: Create/edit modal
- **MarketDetailsPage**: Full market view with API keys

**API Keys**:
- **ApiKeyList**: List of keys for market
- **ApiKeyGenerator**: Create new key modal
- **ApiKeyDisplay**: One-time display of generated key

### Permissions
- **Superadmin**: Full access to all tenants and markets
- **Tenant Admin**: Access to their tenant's markets only
- **Tenant User**: Read-only view of their tenant's markets

### Mock Data
```
Tenant A (Demo Retail Group) - tenant-a
  ├── Market 1 (Downtown Store) - market-1
  ├── Market 2 (Airport Location) - market-2
  └── Market 3 (Online Store) - market-3

Tenant B (Test Retail Chain) - tenant-b
  ├── Market 4 (Mall Store) - market-4
  └── Market 5 (Web Store) - market-5

Tenant C (Sample Corp) - tenant-c
  ├── Market 6 (Flagship) - market-6
  └── Market 7 (Outlet) - market-7
```

### Important Notes
- **Data ownership**: Products/categories/orders belong to markets (not tenants)
- **API keys**: Generated with prefix `sk_live_` + random hex
- **One-time display**: API key shown in full only on creation
- **Security**: Keys hashed in DB, only last 4 chars stored for display

### Common Tasks
**Add tenant field**: Update Tenant type → TenantForm → API
**Change market display**: Edit MarketList component
**Modify API key generation**: Check ApiKeysController in api
**Add tenant filter**: Update TenantsPage filters
