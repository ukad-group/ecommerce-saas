# Feature Specification: Tenant & Market Management

## Feature ID: 004
## Status: In Development
## Created: 2025-10-29

---

## Executive Summary

Enable management of tenants (business entities) and their markets (stores/channels) with API key support for external integrations. Implements role-based access where superadmins manage all tenants and markets, tenant admins manage their own markets, and tenant users have no management access.

## User Stories

### Superadmin
- Create, edit, and deactivate tenants
- Manage markets for any tenant
- View all tenants and their associated markets
- Generate and revoke API keys for any market

### Tenant Admin
- View tenant information (read-only)
- Create, edit, and deactivate markets within their tenant
- Generate and revoke API keys for their markets
- Cannot access other tenants' data

### Tenant User
- No access to tenant/market management
- Can only view assigned market information

### External Systems
- Authenticate using market-specific API keys
- API keys provide market-scoped access
- Clear authentication error messages

## Functional Requirements

### Tenant Management (Superadmin Only)

**Fields:**
- `name`: Unique identifier (lowercase, alphanumeric with hyphens)
- `displayName`: Human-readable name
- `status`: Active/Inactive
- `contactEmail`: Required
- `contactPhone`: Optional
- `address`: Optional

**Operations:**
- Create, edit, deactivate/reactivate tenants
- Soft delete only (data preserved)
- Deactivating a tenant deactivates all its markets
- List view with search, filters, and pagination

### Market Management

**Fields:**
- `name`: Human-readable name
- `code`: Unique within tenant (uppercase, alphanumeric)
- `type`: Physical/Online/Hybrid
- `status`: Active/Inactive
- `currency`: Default USD
- `timezone`: IANA timezone
- `address`: Required for physical/hybrid types

**Operations:**
- Create, edit, deactivate/reactivate markets
- Superadmin: manage any tenant's markets
- Tenant Admin: manage only their tenant's markets
- List view with search, filters, and pagination

### API Key Management

**Properties:**
- Cryptographically secure (32+ characters)
- Unique across system
- Market and tenant scoped
- Shown only once upon creation

**Fields:**
- `name`: Descriptive identifier
- `status`: Active/Revoked
- `createdAt`: Creation timestamp
- `lastUsedAt`: Last usage timestamp
- `expiresAt`: Optional expiration

**Operations:**
- Generate multiple keys per market
- Revoke keys (immediate invalidation)
- View masked keys (last 4 characters)
- Copy key on generation

## Navigation Structure

### Main Navigation Tab
- **Superadmin**: "Tenants & Markets"
- **Tenant Admin**: "Markets"
- **Tenant User**: Not visible

### Routes
```
/admin/tenants                                    (Superadmin only)
/admin/tenants/:tenantId/markets                  (Superadmin only)
/admin/markets                                    (Tenant Admin)
/admin/markets/:marketId/api-keys                 (Superadmin/Tenant Admin)
```

## API Endpoints

### Tenants
```
GET    /api/v1/tenants              List tenants (superadmin)
GET    /api/v1/tenants/:id          Get tenant details
POST   /api/v1/tenants              Create tenant
PUT    /api/v1/tenants/:id          Update tenant
DELETE /api/v1/tenants/:id          Deactivate tenant
```

### Markets
```
GET    /api/v1/markets              List markets (filtered by role)
GET    /api/v1/markets/:id          Get market details
POST   /api/v1/markets              Create market
PUT    /api/v1/markets/:id          Update market
DELETE /api/v1/markets/:id          Deactivate market
```

### API Keys
```
GET    /api/v1/markets/:id/api-keys    List keys for market
POST   /api/v1/markets/:id/api-keys    Generate new key
DELETE /api/v1/markets/:id/api-keys/:keyId    Revoke key
```

## Authentication

### Internal (Admin Users)
```
Authorization: Bearer {userToken}
X-Tenant-ID: {tenantId}
X-Market-ID: {marketId}
```

### External (API Integration)
```
X-API-Key: {apiKey}
```

## Security Requirements

- API keys hashed before storage (never plain text)
- Keys shown only once at generation
- Role-based access enforcement at API level
- Audit logging for all operations
- Soft deletes preserve data integrity

## Acceptance Criteria

### Must Have
- ✅ CRUD operations for tenants (superadmin)
- ✅ CRUD operations for markets (role-based)
- ✅ API key generation and revocation
- ✅ Role-based navigation and access control
- ✅ Search, filter, and pagination
- ✅ Form validation and error handling

### Should Have
- ✅ Confirmation dialogs for destructive actions
- ✅ Loading states and feedback
- ✅ Responsive UI design
- ✅ Keyboard accessibility

### Nice to Have (Future)
- API key expiration dates
- Usage statistics and analytics
- Bulk operations
- Export functionality

---

**Version**: 1.0
**Last Updated**: 2025-10-29