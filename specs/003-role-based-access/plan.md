# Implementation Plan: Role-Based Access Control

**Branch**: `002-cart-order-management` (single branch development) | **Date**: 2025-10-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-role-based-access/spec.md`

## Summary

Implement a three-tier role-based access control system for the eCommerce SaaS backoffice with hardcoded user profiles for development/testing. The system will provide:
- **Superadmin**: Full platform access, can manage all tenants
- **Tenant Admin**: Full access within a selected tenant
- **Tenant User**: View-all, edit products/categories only within a selected tenant

This MVP uses a simulated login screen with profile selection (and tenant selection for scoped roles) to unblock development while deferring production authentication to a future phase.

## Technical Context

**Language/Version**: TypeScript 5 with React 18
**Primary Dependencies**: React Router 6, Zustand 4, TanStack Query v5
**Storage**: Zustand store for auth state + localStorage persistence
**Testing**: Manual testing with hardcoded profiles (automated tests future phase)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend only, MSW mocks for backend)
**Performance Goals**: Login workflow <10 seconds, instant role-based UI updates
**Constraints**: Session-only authentication (no persistence across browser restarts for MVP)
**Scale/Scope**: 3 hardcoded user profiles, support for multiple tenants in selector

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Compliance

- **I. API-First Development**: ✅ Auth state managed through store interface, easily replaceable with real API
- **II. Mock-First UI Development**: ✅ Hardcoded profiles serve as mocks for login flow
- **III. Multi-Platform Integration Ready**: ✅ Role/permission system designed for future OAuth2/OIDC integration
- **IV. MVP Focus**: ✅ Minimal hardcoded auth, defers complex features (password auth, user management, audit logging)
- **V. SaaS-First Architecture**: ✅ Multi-tenancy built in via tenant selector and data filtering
- **VI. Test-Driven Development**: ⚠️ Automated tests deferred to future phase (manual validation only for MVP)
- **VII. Simplicity and Clarity**: ✅ Hardcoded profiles with simple role enum, no complex permission matrices

### ⚠️ Deviations

| Deviation | Justification | Mitigation |
|-----------|---------------|------------|
| No automated tests | MVP focuses on UI/UX validation with hardcoded profiles | Document expected behavior in quickstart.md for manual testing |
| Session-only persistence | Simplifies MVP, no user accounts yet | Clearly marked in assumptions, future OAuth2 integration will handle persistence |

## Project Structure

### Documentation (this feature)

```text
specs/003-role-based-access/
├── plan.md              # This file
├── research.md          # Phase 0: Auth patterns, session management best practices
├── data-model.md        # Phase 1: User profile, role, session entities
├── quickstart.md        # Phase 1: How to test login/logout with hardcoded profiles
├── contracts/           # Phase 1: Auth API contracts (for future backend)
└── checklists/
    └── requirements.md  # Quality validation (already complete)
```

### Source Code (repository root)

```text
frontend/src/
├── pages/
│   ├── LoginPage.tsx                    # NEW: Profile selector, tenant selector, login flow
│   └── admin/                           # EXISTING: Admin pages (now protected by auth)
├── components/
│   ├── auth/                            # NEW: Auth-specific components
│   │   ├── ProfileSelector.tsx         # Profile dropdown (superadmin, tenant_admin, tenant_user)
│   │   ├── TenantSelector.tsx          # Tenant dropdown (conditional on role)
│   │   └── UserInfo.tsx                # Header component showing current user + logout
│   ├── layout/
│   │   └── Navigation.tsx               # MODIFY: Add UserInfo component
│   └── common/                          # EXISTING: Reuse Button, Select components
├── store/
│   └── authStore.ts                     # NEW: Zustand store for auth state
├── types/
│   └── auth.ts                          # NEW: UserProfile, Role, UserSession types
├── services/
│   └── auth/
│       └── authService.ts               # NEW: Login/logout logic, hardcoded profiles
├── mocks/
│   └── data/
│       ├── mockProfiles.ts              # NEW: Hardcoded user profiles
│       └── mockTenants.ts               # NEW: Tenant list for selector
└── utils/
    └── authGuards.ts                    # NEW: Route protection, role checks
```

**Structure Decision**: Following existing frontend/ structure from cart/order management implementation. All new auth components integrate into current React app.

## Complexity Tracking

> No constitutional violations requiring justification. Feature aligns with MVP principles and multi-tenancy requirements.

---

## Phase 0: Research

### Research Tasks

1. **Auth State Management Patterns**
   - Research: Zustand best practices for authentication state
   - Research: Session persistence strategies (localStorage vs sessionStorage vs memory-only)
   - Decision needed: Where to store auth state for MVP (localStorage for dev convenience vs memory-only for security)

2. **Route Protection Patterns**
   - Research: React Router 6 protected routes patterns
   - Research: Role-based component rendering (hide/disable vs redirect)
   - Decision needed: How to handle unauthorized access attempts (redirect to login vs show error vs hide features)

3. **Tenant Selection UX**
   - Research: Best practices for tenant switcher UI/UX
   - Research: Whether to allow tenant switching without full logout
   - Decision needed: Single-tenant session vs multi-tenant switching capability

4. **Backward Compatibility**
   - Research: How to migrate existing routes to require authentication
   - Research: Whether to have public vs protected route split
   - Decision needed: Make all existing admin pages require auth, or keep some public

**Output**: `research.md` documenting auth patterns, session management approach, route protection strategy

---

## Phase 1: Design & Contracts

### Data Model

**Entities** (detailed in `data-model.md`):

1. **UserProfile** (Hardcoded)
   - Fields: id, displayName, email, role, defaultTenantId (optional)
   - Hardcoded profiles: superadmin@system, admin@tenant-a, user@tenant-a

2. **Role** (Enum)
   - Values: `SUPERADMIN`, `TENANT_ADMIN`, `TENANT_USER`
   - Permissions embedded in role logic (not separate permission table)

3. **UserSession** (Runtime state)
   - Fields: profile, selectedTenantId, authenticatedAt, expiresAt (optional for MVP)
   - Managed by Zustand authStore

4. **Tenant** (Existing + Selector Data)
   - Fields: id, name, displayName
   - Used in tenant selector dropdown

### API Contracts

**Auth API Endpoints** (Future Backend, defined in `/contracts/auth-api.yaml`):

```yaml
POST /api/v1/auth/login
  Request: { profileId: string, tenantId?: string }
  Response: { session: UserSession, token?: string }

POST /api/v1/auth/logout
  Response: 204 No Content

GET /api/v1/auth/session
  Response: { session: UserSession | null }

GET /api/v1/auth/tenants
  Response: { tenants: Tenant[] }
```

**For MVP**: These endpoints are mocked via Zustand store methods (no MSW handlers needed yet).

### UI Flow

1. **Login Flow**:
   - User lands on `/login` (if not authenticated)
   - Selects profile from dropdown (3 hardcoded options)
   - If Tenant Admin or User: selects tenant from dropdown
   - Clicks "Login" → authStore.login(profileId, tenantId?)
   - Redirects to `/admin` dashboard

2. **Session Persistence**:
   - Auth state stored in Zustand with localStorage persistence
   - On app load: check authStore for existing session
   - If valid session: auto-authenticate and show dashboard
   - If no session or expired: redirect to `/login`

3. **Logout Flow**:
   - User clicks "Logout" in header
   - authStore.logout() → clears session
   - Redirects to `/login`

4. **Role-Based Rendering**:
   - Superadmin: See all tenants, all features enabled
   - Tenant Admin: See selected tenant only, all features enabled
   - Tenant User: See selected tenant only, order edit features disabled/hidden

**Output**: `data-model.md`, `/contracts/auth-api.yaml`, `quickstart.md` with test scenarios

---

## Phase 2: Implementation Plan (Generated by task generation)

*Tasks will be generated in next phase using task generation command based on this plan and data model.*

**Expected task groups**:
1. **Setup**: Auth types, store, hardcoded profiles
2. **Login UI**: LoginPage, ProfileSelector, TenantSelector
3. **Session Management**: Route guards, auth middleware
4. **Role Integration**: Filter data queries, hide/disable features by role
5. **Logout**: UserInfo component, logout handler
6. **Testing**: Manual test scenarios per quickstart.md
