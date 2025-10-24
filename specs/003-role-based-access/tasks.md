# Tasks: Role-Based Access Control

**Input**: Design documents from `/specs/003-role-based-access/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.yaml

**Tests**: No automated tests in MVP scope (manual testing only via quickstart.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app structure: `frontend/src/`
- Auth components: `frontend/src/components/auth/`
- Auth store: `frontend/src/store/authStore.ts`
- Mock data: `frontend/src/mocks/data/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and auth-specific structure

- [ ] T001 Create auth directory structure (frontend/src/components/auth/, frontend/src/types/auth.ts, frontend/src/services/auth/, frontend/src/mocks/data/)
- [ ] T002 [P] Define auth types in frontend/src/types/auth.ts (UserProfile, Role enum, UserSession, Tenant)
- [ ] T003 [P] Create hardcoded profiles in frontend/src/mocks/data/mockProfiles.ts (superadmin, tenant-admin, tenant-user)
- [ ] T004 [P] Create tenant list for selector in frontend/src/mocks/data/mockTenants.ts (tenant-a, tenant-b, tenant-c)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create Zustand auth store in frontend/src/store/authStore.ts with localStorage persistence (session state, login/logout methods, role checks)
- [ ] T006 Implement authService in frontend/src/services/auth/authService.ts (login logic, profile validation, session creation)
- [ ] T007 Create ProtectedRoute wrapper component in frontend/src/components/auth/ProtectedRoute.tsx (checks authentication, redirects to /login)
- [ ] T008 Create route guards utility in frontend/src/utils/authGuards.ts (hasPermission helper, role-based checks)
- [ ] T009 Update router configuration in frontend/src/router.tsx (wrap /admin routes with ProtectedRoute, add /login route)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Superadmin Full Access (Priority: P1) 🎯 MVP

**Goal**: Enable superadmin to log in without tenant selection and access all tenants' data with full permissions

**Independent Test**: Select "Super Admin" profile, login without tenant selector, verify dashboard shows all tenants' data, verify can edit products/categories/orders across all tenants (see quickstart.md Test Scenario 1)

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create LoginPage component in frontend/src/pages/LoginPage.tsx (profile selector, conditional tenant selector, login button)
- [ ] T011 [P] [US1] Create ProfileSelector component in frontend/src/components/auth/ProfileSelector.tsx (dropdown with 3 hardcoded profiles)
- [ ] T012 [P] [US1] Create TenantSelector component in frontend/src/components/auth/TenantSelector.tsx (conditional dropdown, shown only for non-superadmin)
- [ ] T013 [US1] Implement superadmin login flow in authService.ts (no tenant validation, create session without selectedTenantId)
- [ ] T014 [US1] Add superadmin role checks to authStore (isSuperadmin helper, getTenantId returns null for superadmin)
- [ ] T015 [US1] Update data query hooks to skip tenant filtering for superadmin in frontend/src/services/hooks/ (useProducts, useCategories, useOrders)
- [ ] T016 [US1] Add UserInfo component in frontend/src/components/auth/UserInfo.tsx (show current user, role, logout button)
- [ ] T017 [US1] Integrate UserInfo into Navigation component in frontend/src/components/layout/Navigation.tsx (header display)
- [ ] T018 [US1] Implement logout flow in authStore (clear session, clear localStorage, redirect to /login)

**Checkpoint**: At this point, superadmin login should be fully functional with access to all data

---

## Phase 4: User Story 2 - Tenant Admin Scoped Management (Priority: P1)

**Goal**: Enable tenant admin to select tenant at login and manage all aspects within that tenant with full permissions

**Independent Test**: Select "Tenant Admin (Demo Store)" profile, select "Demo Store (tenant-a)" from tenant dropdown, verify dashboard shows only tenant-a data, verify can create/edit products/categories/orders within tenant-a, verify cannot see tenant-b or tenant-c data (see quickstart.md Test Scenario 2)

### Implementation for User Story 2

- [ ] T019 [US2] Implement tenant admin login flow in authService.ts (validate tenant selection required, create session with selectedTenantId)
- [ ] T020 [US2] Add tenant validation logic in authService.ts (check tenant exists, validate tenant matches profile's access)
- [ ] T021 [US2] Update TenantSelector component to show tenant dropdown for TENANT_ADMIN role
- [ ] T022 [US2] Add tenant filtering to data query hooks in frontend/src/services/hooks/ (add tenantId parameter from authStore.getTenantId())
- [ ] T023 [US2] Update API client in frontend/src/services/api/client.ts to add X-Tenant-ID header for tenant-scoped requests
- [ ] T024 [US2] Update MSW handlers in frontend/src/mocks/handlers/ to filter data by X-Tenant-ID header (products, categories, orders)
- [ ] T025 [US2] Add tenant info display to UserInfo component (show "Role | Tenant Name" format)
- [ ] T026 [US2] Implement tenant switching prevention (logout required to change tenant - document in quickstart.md)

**Checkpoint**: At this point, tenant admin login should work with proper tenant-scoped data isolation

---

## Phase 5: User Story 3 - Tenant User Limited Editing (Priority: P2)

**Goal**: Enable tenant user to select tenant at login, view all tenant data, but only edit products/categories (cannot edit order status)

**Independent Test**: Select "Catalog Manager (Demo Store)" profile, select "Demo Store (tenant-a)" from tenant dropdown, verify can view orders but "Update Status" button is disabled/hidden, verify can edit products and categories (see quickstart.md Test Scenario 3)

### Implementation for User Story 3

- [ ] T027 [US3] Implement tenant user login flow in authService.ts (same as tenant admin but with TENANT_USER role)
- [ ] T028 [US3] Update TenantSelector component to show tenant dropdown for TENANT_USER role
- [ ] T029 [US3] Add permission helper methods to authStore (hasPermission('editOrders'), canEditOrders, canCreateTenants, canCreateCustomerShops)
- [ ] T030 [US3] Update OrderStatusUpdate component in frontend/src/components/admin/OrderStatusUpdate.tsx to check authStore.hasPermission('editOrders') and disable/hide controls
- [ ] T031 [US3] Update AdminOrderDetailsPage to conditionally render status update section based on role permissions
- [ ] T032 [US3] Add permission checks to order edit buttons in AdminOrdersPage (disable "Update Status" for TENANT_USER)
- [ ] T033 [US3] Verify products and categories pages allow editing for TENANT_USER role (should work as-is)
- [ ] T034 [US3] Document tenant user permissions in permission matrix (update quickstart.md if needed)

**Checkpoint**: All user stories should now be independently functional with proper role-based permissions

---

## Phase 6: Route Protection & Session Management

**Purpose**: Enforce authentication boundaries and session persistence

- [ ] T035 [P] Implement redirect to /login for unauthenticated users accessing /admin routes (verify ProtectedRoute works)
- [ ] T036 [P] Test session persistence across page refreshes (localStorage should persist session)
- [ ] T037 Test logout clears session and localStorage (verify authStore.logout() works)
- [ ] T038 Add redirect logic for root route / (redirect to /admin if authenticated, /login if not)
- [ ] T039 [P] Test direct URL navigation protection (manual navigation to /admin/products should redirect if not authenticated)
- [ ] T040 Verify route protection per quickstart.md Test Scenario 4

**Checkpoint**: Route protection and session management complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T041 [P] Add loading states to LoginPage (show spinner during login)
- [ ] T042 [P] Add error handling to login flow (display error message if profile/tenant invalid)
- [ ] T043 Add form validation to LoginPage (require profile selection, require tenant for non-superadmin)
- [ ] T044 [P] Style LoginPage with Tailwind CSS (consistent with existing admin UI)
- [ ] T045 [P] Style auth components (ProfileSelector, TenantSelector, UserInfo) with Tailwind CSS
- [ ] T046 Add transition animations to login/logout flows (smooth redirects)
- [ ] T047 [P] Update quickstart.md with final testing instructions (verify all 6 test scenarios)
- [ ] T048 Run full manual validation per quickstart.md (all test scenarios, edge cases, troubleshooting)
- [ ] T049 [P] Add inline code documentation for auth utilities and store methods
- [ ] T050 Code cleanup and refactoring (remove console.logs, organize imports)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (US1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (US2): Can start after Foundational - No dependencies on US1 (independent tenant admin flow)
  - User Story 3 (US3): Can start after Foundational - No dependencies on US1/US2 (builds on same infrastructure)
- **Route Protection (Phase 6)**: Depends on at least US1 being complete (needs login flow to test)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent but uses same components as US1 (TenantSelector)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends permission system but independently testable

### Within Each User Story

- **US1**: ProfileSelector and TenantSelector can be built in parallel (T011, T012) → Then login flow (T013) → Then data filtering (T015) → Then logout (T018)
- **US2**: Login flow (T019) → Tenant validation (T020) → MSW filtering (T024) → UI updates (T025)
- **US3**: Permission helpers (T029) → UI permission checks (T030-T032) → Validation (T034)

### Parallel Opportunities

- All Setup tasks (T001-T004) can run in parallel
- Within US1: T010, T011, T012, T016 can run in parallel (different files)
- Within Phase 6: T035, T036, T039 can run in parallel (independent tests)
- Within Phase 7: T041, T042, T044, T045, T047, T049 can run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch all UI components for User Story 1 together:
Task: "Create LoginPage component in frontend/src/pages/LoginPage.tsx"
Task: "Create ProfileSelector component in frontend/src/components/auth/ProfileSelector.tsx"
Task: "Create TenantSelector component in frontend/src/components/auth/TenantSelector.tsx"
Task: "Add UserInfo component in frontend/src/components/auth/UserInfo.tsx"

# Then implement login logic:
Task: "Implement superadmin login flow in authService.ts"

# Then add data filtering:
Task: "Update data query hooks to skip tenant filtering for superadmin"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009) - CRITICAL
3. Complete Phase 3: User Story 1 (T010-T018)
4. Complete Phase 6: Route Protection (T035-T040)
5. **STOP and VALIDATE**: Test superadmin login per quickstart.md Test Scenario 1
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP - Superadmin only!)
3. Add User Story 2 → Test independently → Deploy/Demo (Tenant Admin access!)
4. Add User Story 3 → Test independently → Deploy/Demo (Tenant User permissions!)
5. Add Polish → Final validation → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (superadmin)
   - Developer B: User Story 2 (tenant admin)
   - Developer C: User Story 3 (tenant user)
3. Stories complete and integrate independently
4. Final integration testing with all three roles

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **No automated tests in MVP** - all validation via quickstart.md manual testing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Security Note**: Hardcoded profiles are development-only; production will use real auth (OAuth2/OIDC)
