# Feature 003: Role-Based Access Control

## Overview

**Feature Branch**: `002-cart-order-management` (single branch development)
**Status**: Partially Implemented
**Priority**: P1 (Core MVP)
**Created**: 2025-10-24

This feature implements a three-tier role-based access control system with hardcoded user profiles for development. The system provides Superadmin (full platform access), Tenant Admin (full tenant access across all markets), and Tenant User (market-specific access with limited edit rights) roles.

### Market-Based Permissions

With the new market hierarchy, permissions operate at two levels:

**Tenant Level**:
- Superadmin: Access all tenants
- Tenant Admin: Access their tenant only
- Tenant User: Access their tenant only

**Market Level**:
- Superadmin: Access all markets across all tenants
- Tenant Admin: Access all markets within their tenant
- Tenant User: Access only assigned markets within their tenant

This allows fine-grained control where a tenant user might manage products for "Downtown Store" but not "Airport Location" within the same tenant.

## Quick Reference

- **Specification**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Tasks**: [tasks.md](tasks.md)

## What's Implemented

### Core Auth Infrastructure (Phases 1-2) ✅
- ✅ Auth directory structure
- ✅ Auth types (UserProfile, Role, UserSession, Tenant)
- ✅ Hardcoded user profiles (3 roles)
- ✅ Mock tenant data for selector
- ✅ Zustand auth store with localStorage persistence
- ✅ Auth service with login/logout logic
- ✅ Protected route wrapper
- ✅ Route guards utility with permission checks
- ✅ Router configuration with protected admin routes

### Superadmin Access (Phase 3) ✅
- ✅ Login page with profile selector
- ✅ Profile selector component (dropdown)
- ✅ Tenant selector component (conditional)
- ✅ Superadmin login flow (no tenant required)
- ✅ Superadmin role checks in auth store
- ✅ Skip tenant filtering for superadmin in queries
- ✅ UserInfo component in header
- ✅ Logout flow with session clearing

### Session Management (Phase 6) ✅
- ✅ Redirect to /login for unauthenticated access
- ✅ Session persistence across page refreshes
- ✅ Logout clears session and localStorage
- ✅ Root route redirect logic (/ → /admin or /login)
- ✅ Direct URL navigation protection

## What's Missing

### Tenant Admin Access (Phase 4) ❌
- ❌ Tenant admin login flow
- ❌ Tenant validation logic
- ❌ Tenant selector for TENANT_ADMIN role
- ❌ Tenant filtering in data query hooks
- ❌ X-Tenant-ID header in API client
- ❌ MSW handler filtering by tenant
- ❌ Tenant info display in UserInfo
- ❌ Tenant switching prevention

### Tenant User Limited Editing (Phase 5) ❌
- ❌ Tenant user login flow
- ❌ Tenant selector for TENANT_USER role
- ❌ Permission helper methods (hasPermission)
- ❌ Order status update permission check
- ❌ Admin order details permission-based rendering
- ❌ Order edit button disabling for tenant users
- ❌ Permission matrix documentation

### Polish (Phase 7) ❌
- ❌ Loading states on LoginPage
- ❌ Error handling in login flow
- ❌ Form validation on LoginPage
- ❌ Styled LoginPage with Tailwind
- ❌ Styled auth components
- ❌ Transition animations
- ❌ Complete quickstart.md testing instructions
- ❌ Full manual validation
- ❌ Inline code documentation
- ❌ Code cleanup and refactoring

## User Roles

### Superadmin (Fully Implemented)
**Capabilities**:
- ✅ Full access to all tenants and markets
- ✅ View/edit products, categories, orders across all tenants and markets
- ✅ Create new tenants (future backend feature)
- ✅ Create new markets within any tenant (future backend feature)
- ✅ No tenant/market selection required at login

**Test**: Select "Super Admin" profile → Login → Access all data across all tenants and markets

### Tenant Admin (Not Implemented)
**Capabilities**:
- Select specific tenant at login
- View/edit all data within selected tenant across ALL markets
- Create new markets within their tenant
- Cannot see other tenants' data
- Cannot create new tenants

**Test**: Select "Admin (Demo Store)" → Select "Demo Store" tenant → Login → Access all markets within tenant

### Tenant User (Not Implemented)
**Capabilities**:
- Select specific tenant and market(s) at login
- View all data within assigned market(s) only
- Edit products and categories within assigned markets
- Cannot edit order status or create markets
- Cannot see other tenants' or unassigned markets' data

**Test**: Select "Catalog Manager (Demo Store)" → Select tenant + assigned market → Login → View/edit only assigned market's products/categories

## Key Components

### Auth Components
- **LoginPage** (`frontend/src/pages/LoginPage.tsx`)
  - Profile selector
  - Conditional tenant selector
  - Login button and flow

- **ProfileSelector** (`frontend/src/components/auth/ProfileSelector.tsx`)
  - Dropdown with 3 hardcoded profiles
  - Role display

- **TenantSelector** (`frontend/src/components/auth/TenantSelector.tsx`)
  - Conditional dropdown (hidden for superadmin)
  - Tenant list from mock data

- **UserInfo** (`frontend/src/components/auth/UserInfo.tsx`)
  - Current user display
  - Role badge
  - Tenant name (if applicable)
  - Logout button

- **ProtectedRoute** (`frontend/src/components/auth/ProtectedRoute.tsx`)
  - Wraps admin routes
  - Redirects unauthenticated users to /login

### Services
- **authStore** (`frontend/src/store/authStore.ts`)
  - Session state management
  - login() method
  - logout() method
  - Role check helpers
  - localStorage persistence

- **authService** (`frontend/src/services/auth/authService.ts`)
  - Login logic
  - Profile validation
  - Session creation

- **authGuards** (`frontend/src/utils/authGuards.ts`)
  - hasPermission() helper
  - Role-based checks
  - Permission utilities

### Mock Data
- **mockProfiles** (`frontend/src/mocks/data/mockProfiles.ts`)
  - Superadmin: "Super Admin"
  - Tenant Admin: "Admin (Demo Store)"
  - Tenant User: "Catalog Manager (Demo Store)"

- **mockTenants** (`frontend/src/mocks/data/mockTenants.ts`)
  - tenant-a: "Demo Store"
  - tenant-b: "Test Store"
  - tenant-c: "Sample Store"

## Data Models

### UserProfile
```typescript
{
  id: string;
  displayName: string;
  email: string;
  role: Role;
  defaultTenantId?: string;
}
```

### Role (Enum)
```typescript
enum Role {
  SUPERADMIN = 'superadmin',
  TENANT_ADMIN = 'tenant_admin',
  TENANT_USER = 'tenant_user'
}
```

### UserSession
```typescript
{
  profile: UserProfile;
  selectedTenantId?: string;
  selectedMarketIds?: string[];    // NEW: For tenant users with market assignments
  authenticatedAt: Date;
  expiresAt?: Date;
}
```

### Tenant
```typescript
{
  id: string;
  name: string;
  displayName: string;
}
```

### Market (New Entity)
```typescript
{
  id: string;
  tenantId: string;
  name: string;                // e.g., "Downtown Store"
  code: string;                // e.g., "DT-001"
  type: 'physical' | 'online' | 'hybrid';
  isActive: boolean;
}
```

## Routes

### Public Routes
- `/login` - Login page (accessible without auth)

### Protected Routes (Require Authentication)
- `/admin` - Dashboard (all roles)
- `/admin/products` - Products (all roles)
- `/admin/categories` - Categories (all roles)
- `/admin/orders` - Orders (all roles, tenant user read-only)
- `/admin/orders/:id` - Order details (all roles, tenant user read-only)

### Route Protection Logic
```typescript
// In router.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/admin" element={<Layout />}>
    <Route index element={<AdminDashboardPage />} />
    <Route path="products" element={<ProductsPage />} />
    // ... more admin routes
  </Route>
</Route>
```

## Permission System

### Permission Matrix (Updated for Markets)

| Feature | Superadmin | Tenant Admin | Tenant User |
|---------|-----------|--------------|-------------|
| View all tenants | ✅ | ❌ | ❌ |
| View all markets | ✅ | ✅ (within tenant) | ❌ |
| View assigned markets | ✅ | ✅ | ✅ (assigned only) |
| Create tenant | ✅ | ❌ | ❌ |
| Create market | ✅ | ✅ (within tenant) | ❌ |
| Edit products | ✅ (all markets) | ✅ (tenant markets) | ✅ (assigned markets) |
| Edit categories | ✅ (all markets) | ✅ (tenant markets) | ✅ (assigned markets) |
| View orders | ✅ (all markets) | ✅ (tenant markets) | ✅ (assigned markets) |
| Edit order status | ✅ | ✅ (tenant markets) | ❌ |
| Manage inventory | ✅ (all markets) | ✅ (tenant markets) | ✅ (assigned markets) |

### Implementation (Current State)
- ✅ Superadmin: All permissions active (no filtering)
- ❌ Tenant Admin: Permissions not enforced (tenant+market filtering missing)
- ❌ Tenant User: Permissions not enforced (market assignment and UI controls missing)

## Testing

### Manual Test Scenarios

**Test 1: Superadmin Login** ✅
1. Navigate to `/login`
2. Select "Super Admin" from profile dropdown
3. Verify no tenant selector appears
4. Click "Login"
5. Verify redirect to `/admin`
6. Verify can access all features
7. Click "Logout"
8. Verify redirect to `/login` and session cleared

**Test 2: Route Protection** ✅
1. Clear browser localStorage
2. Navigate directly to `/admin/products`
3. Verify redirect to `/login`
4. Login as any user
5. Verify can access `/admin/products`

**Test 3: Session Persistence** ✅
1. Login as superadmin
2. Refresh page
3. Verify still logged in
4. Verify UserInfo shows correct user

**Test 4: Tenant Admin Login** ❌ (Not Implemented)
1. Navigate to `/login`
2. Select "Admin (Demo Store)"
3. Verify tenant selector appears
4. Select "Demo Store"
5. Click "Login"
6. Verify redirect to `/admin`
7. Verify only Demo Store data visible
8. Try to access Test Store data → blocked

**Test 5: Tenant User Login** ❌ (Not Implemented)
1. Navigate to `/login`
2. Select "Catalog Manager (Demo Store)"
3. Select "Demo Store"
4. Click "Login"
5. Navigate to `/admin/orders`
6. Verify can view orders
7. Verify "Update Status" button disabled
8. Navigate to `/admin/products`
9. Verify can edit products

### Edge Cases

- ✅ Direct URL navigation while unauthenticated → redirect to /login
- ✅ Session expiration → treated as unauthenticated
- ✅ Logout clears all session data
- ❌ Tenant switching without logout (not implemented)
- ❌ Invalid tenant selection (not validated)
- ❌ User tries direct URL to edit order as tenant user (not blocked)

## Success Criteria Status

From [spec.md](spec.md) Success Criteria:

- **SC-001** ✅ Login workflow < 10s: ACHIEVED
- **SC-002** ⚠️ 100% tenant data filtering: PARTIAL (superadmin only)
- **SC-003** ❌ Tenant user edit restrictions: NOT IMPLEMENTED
- **SC-004** ✅ Logout clears session 100%: ACHIEVED
- **SC-005** ⚠️ UI reflects permissions: PARTIAL (tenant user controls missing)
- **SC-006** ✅ Swap profiles without restart: ACHIEVED (logout/login)

## Next Steps

### High Priority (Complete Phase 4)
1. **Implement Tenant Admin Login**
   - Add tenant validation in authService
   - Require tenant selection for tenant admin
   - Store selectedTenantId in session

2. **Add Tenant Filtering**
   - Update API client to send X-Tenant-ID header
   - Update data query hooks to pass tenantId
   - Update MSW handlers to filter by tenant
   - Display tenant name in UserInfo

### High Priority (Complete Phase 5)
3. **Implement Tenant User Permissions**
   - Add hasPermission() helper
   - Disable order status update for tenant users
   - Hide/disable restricted features
   - Document permission matrix

### Medium Priority (Complete Phase 7)
4. **Polish Auth UI**
   - Add loading states
   - Add error handling
   - Add form validation
   - Style with Tailwind CSS
   - Add transition animations

5. **Complete Testing**
   - Update quickstart.md with all test scenarios
   - Run full manual validation
   - Document edge cases

## Dependencies

### Internal
- ✅ Multi-tenant architecture
- ✅ Admin UI components
- ✅ Product and order management features

### External
- ⏳ Real authentication service (OAuth2/OIDC) - future phase
- ⏳ User management API - future phase
- ⏳ Audit logging service - future phase

## Known Issues

1. **Tenant & Market Filtering Not Enforced**: Users currently see all data (no tenant/market filtering in API calls)
2. **No Market Selection UI**: Tenant users need market selector to choose assigned markets
3. **No Permission Checks**: Tenant users can edit order status (UI doesn't check permissions)
4. **No Form Validation**: Login page doesn't validate required fields
5. **No Error Handling**: Login failures not displayed to user
6. **Session-Only**: Auth state doesn't survive browser restart (localStorage only)
7. **Hardcoded Profiles**: Not production-ready (replace with real auth later)

## Configuration

### Environment Variables
```bash
VITE_TENANT_ID=demo-tenant           # Default tenant (not used with auth)
VITE_USE_MOCKS=true                  # MSW mocking enabled
```

### Mock Data Configuration
Hardcoded profiles in `mockProfiles.ts`:
```typescript
[
  { id: '1', displayName: 'Super Admin', role: 'SUPERADMIN' },
  { id: '2', displayName: 'Admin (Demo Store)', role: 'TENANT_ADMIN', defaultTenantId: 'tenant-a' },
  { id: '3', displayName: 'Catalog Manager (Demo Store)', role: 'TENANT_USER', defaultTenantId: 'tenant-a' }
]
```

## Architecture Notes

### Why Hardcoded Profiles?
**Rationale**: Allows rapid development and testing without implementing full authentication system. Benefits:
- Unblocks feature development
- Easy to test different roles
- No password management complexity
- Simple to add/remove profiles

**Tradeoff**: Not production-ready, must be replaced with real auth.

### Why Zustand for Auth State?
**Rationale**: Simple, persistent, reactive state management for session:
- localStorage persistence built-in
- Minimal boilerplate
- Easy to integrate with React components
- Small bundle size

### Why Session-Based Over Token-Based?
**Rationale**: For MVP with hardcoded profiles, session storage is simpler:
- No token generation/validation needed
- localStorage persistence sufficient
- Easy migration to real auth later

**Future**: Will migrate to OAuth2/OIDC with JWT tokens when implementing real auth.

## Future Production Authentication

When replacing hardcoded auth with production system:

1. **Authentication Provider**
   - Implement OAuth2/OIDC flow
   - Support multiple identity providers
   - JWT token-based authentication
   - Refresh token handling

2. **User Management**
   - User CRUD operations
   - Role assignment
   - Tenant assignment
   - Password management
   - Email verification

3. **Authorization**
   - Fine-grained permissions
   - Role-based access control (RBAC)
   - Attribute-based access control (ABAC) if needed
   - API-level permission checks

4. **Security**
   - Multi-factor authentication (MFA)
   - Password policies
   - Session timeout
   - Audit logging
   - CSRF protection
   - XSS prevention

5. **Migration Path**
   - Keep authStore interface
   - Replace authService implementation
   - Update login flow to use real API
   - Add JWT token handling
   - Maintain backward compatibility with existing protected routes

## Resources

- Specification: [spec.md](spec.md)
- Implementation Plan: [plan.md](plan.md)
- Task List: [tasks.md](tasks.md)
- Project Overview: [../../CLAUDE.md](../../CLAUDE.md)
- Constitution: [../../memory/constitution.md](../../memory/constitution.md)

---

**Last Updated**: 2025-10-28
**Current Phase**: Phase 3 Complete, Phase 4-5 Pending
**Next Milestone**: Implement tenant admin login and tenant filtering
