# Data Model: Role-Based Access Control

**Feature**: Role-based access control
**Date**: 2025-10-24
**Purpose**: Define authentication entities and their relationships

---

## Entity Definitions

### 1. UserProfile (Hardcoded)

Represents a hardcoded authentication profile for development/testing.

**Fields**:
- `id` (string, required): Unique identifier (e.g., "superadmin-1")
- `displayName` (string, required): Human-readable name shown in UI (e.g., "Super Admin")
- `email` (string, required): Email address (for display only, not validated)
- `role` (Role enum, required): User's role determining permissions
- `defaultTenantId` (string, optional): Default tenant for scoped roles (null for superadmin)

**Validation Rules**:
- `id` must be unique across all profiles
- `displayName` must be non-empty
- `email` must match basic email format (no server validation)
- `role` must be valid Role enum value
- `defaultTenantId` must reference existing tenant (or be null for superadmin)

**Example**:
```typescript
{
  id: "tenant-admin-1",
  displayName: "Tenant Admin (Demo Store)",
  email: "admin@tenant-a.local",
  role: "TENANT_ADMIN",
  defaultTenantId: "tenant-a"
}
```

**Relationships**:
- Has one Role (enum reference)
- Has zero or one Tenant (via defaultTenantId)

**State Transitions**: N/A (hardcoded, not mutable in MVP)

---

### 2. Role (Enum)

Defines permission levels within the system.

**Values**:
- `SUPERADMIN`: Full platform access, manages all tenants
- `TENANT_ADMIN`: Full access within a specific tenant
- `TENANT_USER`: View-all, edit products/categories only within a specific tenant

**Permissions Matrix**:

| Action | SUPERADMIN | TENANT_ADMIN | TENANT_USER |
|--------|------------|--------------|-------------|
| View all tenants' data | ✅ | ❌ | ❌ |
| View own tenant's data | ✅ | ✅ | ✅ |
| Create/edit products | ✅ | ✅ | ✅ |
| Create/edit categories | ✅ | ✅ | ✅ |
| View orders | ✅ | ✅ | ✅ |
| Edit order status | ✅ | ✅ | ❌ |
| Create tenants | ✅ | ❌ | ❌ |
| Create markets | ✅ | ✅ | ❌ |

**Implementation Notes**:
- Stored as TypeScript enum
- Permission checks via helper functions (e.g., `canEditOrders(role)`)
- No custom roles in MVP (fixed three roles only)

---

### 3. UserSession (Runtime State)

Represents the current authenticated session (stored in Zustand + localStorage).

**Fields**:
- `profile` (UserProfile, required): The authenticated user's profile
- `selectedTenantId` (string, optional): Currently active tenant (required for non-superadmin)
- `authenticatedAt` (timestamp, required): When the session was created (ISO 8601)
- `expiresAt` (timestamp, optional): When the session expires (null = never expires in MVP)

**Validation Rules**:
- `profile` must be a valid UserProfile
- `selectedTenantId` required if profile.role is TENANT_ADMIN or TENANT_USER
- `selectedTenantId` must be null if profile.role is SUPERADMIN
- `authenticatedAt` must be valid ISO 8601 timestamp

**Example**:
```typescript
{
  profile: {
    id: "tenant-admin-1",
    displayName: "Tenant Admin (Demo Store)",
    email: "admin@tenant-a.local",
    role: "TENANT_ADMIN",
    defaultTenantId: "tenant-a"
  },
  selectedTenantId: "tenant-a",
  authenticatedAt: "2025-10-24T10:30:00Z",
  expiresAt: null // Never expires in MVP
}
```

**Relationships**:
- Has one UserProfile
- Has zero or one Tenant (via selectedTenantId)

**State Transitions**:
1. **Not Authenticated** → **Authenticated**: User selects profile and (if applicable) tenant, clicks Login
2. **Authenticated** → **Not Authenticated**: User clicks Logout or session expires (future)

**Storage**:
- Zustand store: In-memory state for reactive UI updates
- localStorage: Persisted copy for reload persistence
- Key: `ecommerce-auth`
- Partialize: Store entire session object

---

### 4. Tenant (Reference Entity)

Represents a business entity with isolated data. *Note: This entity already exists in the system; we're just referencing it for auth purposes.*

**Fields** (used by auth):
- `id` (string, required): Unique identifier (e.g., "tenant-a")
- `name` (string, required): Internal name (e.g., "tenant-a")
- `displayName` (string, required): Human-readable name for selector (e.g., "Demo Store")

**Usage in Auth**:
- Tenant selector dropdown shows `displayName`
- Selected tenant's `id` stored in `UserSession.selectedTenantId`
- All data queries filtered by `selectedTenantId` (except for superadmin)

---

## Entity Relationships Diagram

```text
┌─────────────────┐
│  UserProfile    │
│  (hardcoded)    │
│─────────────────│
│ + id            │
│ + displayName   │
│ + email         │
│ + role ─────────┼──────┐
│ + defaultTenant │      │
└─────────┬───────┘      │
          │              │
          │              ▼
          │        ┌──────────┐
          │        │   Role   │
          │        │  (enum)  │
          │        │──────────│
          │        │ SUPERADMIN
          │        │ TENANT_ADMIN
          │        │ TENANT_USER
          │        └──────────┘
          │
          │
          ▼
┌─────────────────┐         ┌─────────────┐
│  UserSession    │         │   Tenant    │
│  (runtime)      │         │ (existing)  │
│─────────────────│         │─────────────│
│ + profile       │◄────────│ + id        │
│ + selectedTenant◄─────────┤ + name      │
│ + authenticatedAt         │ + displayName
│ + expiresAt      │         └─────────────┘
└─────────────────┘
```

---

## Data Flows

### Login Flow

```text
1. User selects profile from dropdown
   ↓
2. If role ≠ SUPERADMIN: User selects tenant from dropdown
   ↓
3. User clicks "Login" button
   ↓
4. authService.login(profileId, tenantId?)
   ↓
5. Validate: profile exists, tenant valid for role
   ↓
6. Create UserSession object
   ↓
7. authStore.setSession(session)
   ↓
8. Zustand persist → localStorage sync
   ↓
9. Navigate to /admin
```

### Logout Flow

```text
1. User clicks "Logout" in header
   ↓
2. authStore.logout()
   ↓
3. Clear session from Zustand
   ↓
4. Zustand persist → localStorage cleared
   ↓
5. Navigate to /login
```

### Data Query Filtering

```text
1. Component fetches data (e.g., useProducts())
   ↓
2. TanStack Query calls productsApi.getProducts()
   ↓
3. API client checks authStore.getTenantId()
   ↓
4. If SUPERADMIN: No tenant filter (show all)
   If TENANT_ADMIN/USER: Add tenantId filter
   ↓
5. Query executes with tenant filter
   ↓
6. Results returned to component
```

---

## Mock Data

### Hardcoded Profiles (mockProfiles.ts)

```typescript
export const MOCK_PROFILES: UserProfile[] = [
  {
    id: 'superadmin-1',
    displayName: 'Super Admin',
    email: 'superadmin@system.local',
    role: 'SUPERADMIN',
    defaultTenantId: null,
  },
  {
    id: 'tenant-admin-1',
    displayName: 'Tenant Admin (Demo Store)',
    email: 'admin@tenant-a.local',
    role: 'TENANT_ADMIN',
    defaultTenantId: 'tenant-a',
  },
  {
    id: 'tenant-user-1',
    displayName: 'Catalog Manager (Demo Store)',
    email: 'manager@tenant-a.local',
    role: 'TENANT_USER',
    defaultTenantId: 'tenant-a',
  },
];
```

### Tenant List for Selector (mockTenants.ts)

```typescript
export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'tenant-a',
    name: 'tenant-a',
    displayName: 'Demo Store',
  },
  {
    id: 'tenant-b',
    name: 'tenant-b',
    displayName: 'Test Shop',
  },
  {
    id: 'tenant-c',
    name: 'tenant-c',
    displayName: 'Sample Retail',
  },
];
```

---

## Future Enhancements (Out of Scope for MVP)

### UserProfile (Production)
- Add `hashedPassword` field for password auth
- Add `mfaEnabled` and `mfaSecret` for 2FA
- Add `lastLoginAt` timestamp
- Add `isActive` flag for account suspension
- Add `permissions` array for granular access control

### UserSession (Production)
- Add `token` field for JWT
- Add `refreshToken` for token renewal
- Implement `expiresAt` logic with auto-logout
- Add `ipAddress` and `userAgent` for security tracking

### Tenant (Production)
- Add tenant-specific feature flags
- Add tenant subscription/billing info
- Add tenant customization settings (branding, limits)

### New Entities (Production)
- **Permission**: Granular permission definitions beyond roles
- **AuditLog**: Track all auth events (login, logout, role changes)
- **ApiKey**: Alternative authentication for programmatic access
