# Research: Role-Based Access Control

**Date**: 2025-10-24
**Feature**: Role-based access control with hardcoded profiles
**Purpose**: Resolve technical decisions for MVP authentication implementation

---

## Decision 1: Auth State Storage

**Question**: Where should authentication state be stored for the MVP?

**Options Evaluated**:
1. **localStorage** - Persists across browser restarts
2. **sessionStorage** - Persists only for current tab session
3. **Memory only (Zustand without persistence)** - Lost on page refresh

**Decision**: **localStorage with Zustand persist middleware**

**Rationale**:
- Development convenience: Developers don't have to re-login after every hot reload
- Consistent with existing implementation pattern (cart already uses localStorage via Zustand persist)
- Easy to migrate to real auth tokens when backend is implemented
- Can be cleared on logout for security

**Alternatives Considered**:
- sessionStorage: More secure but creates friction during development (lost on page refresh)
- Memory only: Too fragile for MVP, would require re-login on every hot module replacement

**Implementation Notes**:
- Use Zustand's `persist` middleware with key `ecommerce-auth`
- Store: `{ profile, selectedTenantId, authenticatedAt }`
- Clear on explicit logout only (not on session expiry for MVP)

---

## Decision 2: Route Protection Strategy

**Question**: How should routes be protected and unauthorized access handled?

**Options Evaluated**:
1. **Redirect to login** - Standard pattern, user redirected if not authenticated
2. **Show error page** - User stays on current route, sees "unauthorized" message
3. **Hide features** - Allow page load, but hide/disable restricted features

**Decision**: **Hybrid approach**
- **Redirect to `/login`** if not authenticated at all
- **Hide/disable features** based on role (tenant user can't edit orders)
- **Data filtering** at query level (tenant users only see their tenant's data)

**Rationale**:
- Redirect for auth provides clear user feedback and security boundary
- Feature hiding for roles provides better UX than error pages
- Data filtering ensures multi-tenancy isolation at the source

**Alternatives Considered**:
- Full redirect for every permission: Too disruptive, would kick users out of pages unexpectedly
- No redirects: Allows unauthorized users to see protected UI structure

**Implementation Notes**:
- Create `ProtectedRoute` wrapper component for React Router
- Check `authStore.isAuthenticated()` before rendering admin routes
- Use `authStore.hasPermission(action)` helper for feature flags
- Filter TanStack Query requests by `authStore.getTenantId()`

---

## Decision 3: Tenant Selection UX

**Question**: Should users be able to switch tenants without logging out?

**Options Evaluated**:
1. **Single-tenant session** - Logout required to switch tenants
2. **Multi-tenant switching** - Dropdown in header to switch active tenant
3. **Hybrid** - Allow switching for superadmin only

**Decision**: **Single-tenant session (must logout to switch)**

**Rationale**:
- Simpler implementation for MVP (no tenant switching logic)
- Clearer security boundary (each session = one tenant context)
- Matches typical SaaS multi-tenant patterns
- Superadmin doesn't need tenant selection (sees all tenants always)

**Alternatives Considered**:
- Multi-tenant switching: More flexible but adds complexity (invalidating queries, resetting UI state)
- Hybrid (superadmin can switch): Creates inconsistent UX between roles

**Implementation Notes**:
- Tenant selection happens at login only
- Store `selectedTenantId` in auth session
- Logout clears tenant selection
- Future enhancement: Add tenant switcher for tenant admin/user roles

---

## Decision 4: Backward Compatibility with Existing Routes

**Question**: How to migrate existing admin routes to require authentication?

**Options Evaluated**:
1. **Wrap all routes** - Every route requires authentication
2. **Public/protected split** - Some routes public (login), others protected (admin)
3. **Gradual migration** - Add auth guards incrementally

**Decision**: **Public/protected split**
- `/login` is public (no auth required)
- All `/admin/*` routes are protected (require authentication)
- Root `/` redirects to `/admin` if authenticated, `/login` if not

**Rationale**:
- Clear separation of concerns
- Standard web app authentication pattern
- Easy to extend with public pages in future (customer-facing storefront)

**Alternatives Considered**:
- Wrap all routes: Unnecessarily restricts non-admin pages (if added later)
- Gradual migration: Creates inconsistent security posture during development

**Implementation Notes**:
- Update `router.tsx` to wrap `/admin` routes in `ProtectedRoute`
- Add `/login` route (public)
- Update root `/` index route to check auth and redirect accordingly
- Add `ProtectedRoute` component that checks `authStore.isAuthenticated()`

---

## Decision 5: Hardcoded Profiles Structure

**Question**: How should the three hardcoded profiles be defined?

**Decision**: **Static TypeScript object with profile definitions**

**Profiles**:
```typescript
export const HARDCODED_PROFILES: UserProfile[] = [
  {
    id: 'superadmin-1',
    displayName: 'Super Admin',
    email: 'superadmin@system.local',
    role: 'SUPERADMIN',
    defaultTenantId: null, // Has access to all tenants
  },
  {
    id: 'tenant-admin-1',
    displayName: 'Tenant Admin (Demo Store)',
    email: 'admin@tenant-a.local',
    role: 'TENANT_ADMIN',
    defaultTenantId: 'tenant-a', // Default, but can select others
  },
  {
    id: 'tenant-user-1',
    displayName: 'Catalog Manager (Demo Store)',
    email: 'manager@tenant-a.local',
    role: 'TENANT_USER',
    defaultTenantId: 'tenant-a', // Default, but can select others
  },
];
```

**Rationale**:
- Type-safe with TypeScript interfaces
- Easy to modify during development
- Self-documenting code
- No external files to manage

**Implementation Notes**:
- Define in `frontend/src/mocks/data/mockProfiles.ts`
- Import in `authService.ts` for login logic
- Use in `ProfileSelector.tsx` for dropdown options

---

## Best Practices Applied

### Authentication State Management (Zustand)
- Single source of truth for auth state
- Persist middleware for localStorage sync
- Computed properties for role checks (`isSuper admin()`, `hasTenantAccess(tenantId)`)

### React Router 6 Protection
- Higher-order component pattern for route guards
- Navigate hook for programmatic redirects
- Location state for post-login redirects

### Multi-Tenancy Filtering
- X-Tenant-ID header on all API requests (existing pattern)
- Query filter by `authStore.getTenantId()` for tenant-scoped roles
- Superadmin bypasses tenant filter (sees all data)

### Role-Based UI Rendering
- Conditional rendering with `authStore.hasPermission(feature)`
- Feature flags per role (e.g., `canEditOrders`, `canCreateTenants`)
- Graceful degradation (disable buttons vs hide entirely)

---

## Migration Path to Production Auth

**MVP (Current)**:
- Hardcoded profiles in TypeScript
- No password validation
- localStorage session

**Future Production**:
1. Replace `HARDCODED_PROFILES` with API call to `/api/v1/auth/login`
2. Add password input to LoginPage
3. Store JWT token instead of full profile in localStorage
4. Add token refresh logic
5. Implement real user management backend
6. Add OAuth2/OIDC integration for SSO

**No breaking changes required** - authStore interface remains the same, only implementation changes.

---

## Security Considerations (MVP Scope)

**Accepted Limitations**:
- No password protection (hardcoded profiles are publicly known)
- No session expiry (valid until explicit logout)
- No CSRF protection (no sensitive actions in MVP)
- No rate limiting (development environment only)

**Mitigations**:
- Clear documentation that this is development-only auth
- Session stored in localStorage (not exposed via cookies)
- All tenant data filtered by selected tenant (even for hardcoded profiles)

**Future Production Requirements**:
- HTTPS only
- Secure HTTP-only cookies for tokens
- CSRF tokens for state-changing operations
- Session timeout (15-30 minutes)
- Rate limiting on login endpoint
- Audit logging for all auth events
