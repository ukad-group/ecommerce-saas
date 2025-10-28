# Quick Start: Role-Based Access Control

**Feature**: Role-based access control with hardcoded profiles
**Purpose**: Manual testing guide for authentication and authorization flows

---

## Prerequisites

1. **Dev server running**: `cd frontend && npm run dev`
2. **Browser**: Chrome, Firefox, Safari, or Edge (modern versions)
3. **Clear localStorage**: Recommended to start fresh
   - Open browser DevTools → Application → Local Storage → Clear `ecommerce-auth`

---

## Test Scenario 1: Superadmin Full Access

**Goal**: Verify superadmin can access all tenants and all features.

### Steps

1. Navigate to `http://localhost:5176/login`
2. Select **"Super Admin"** from profile dropdown
3. Click **"Login"** button
   - **Expected**: No tenant selector appears (superadmin has access to all)
4. Verify dashboard loads at `http://localhost:5176/admin`
5. Navigate to **Products** page
   - **Expected**: See products from all tenants (no filtering)
6. Navigate to **Orders** page
   - **Expected**: See orders from all tenants
   - **Expected**: Can update order status (edit button enabled)
7. Navigate to **Categories** page
   - **Expected**: See all categories, can create/edit
8. Click **"Logout"** in header
   - **Expected**: Redirected to `/login`, localStorage cleared

### Success Criteria

- ✅ No tenant selector shown for superadmin
- ✅ Dashboard shows data from all tenants
- ✅ All features enabled (no disabled buttons)
- ✅ Can edit products, categories, and orders
- ✅ Logout clears session and redirects to login

---

## Test Scenario 2: Tenant Admin Scoped Access

**Goal**: Verify tenant admin sees only selected tenant's data and has full permissions within that tenant.

### Steps

1. Navigate to `http://localhost:5176/login`
2. Select **"Tenant Admin (Demo Store)"** from profile dropdown
3. **Expected**: Tenant selector dropdown appears
4. Select **"Demo Store (tenant-a)"** from tenant dropdown
5. Click **"Login"** button
6. Verify dashboard loads and shows only Tenant A data
7. Navigate to **Products** page
   - **Expected**: Only see products with `tenantId: "tenant-a"`
   - **Expected**: No products from tenant-b or tenant-c visible
8. Create a new product
   - **Expected**: Product is created with `tenantId: "tenant-a"`
9. Navigate to **Orders** page
   - **Expected**: Only see orders for tenant-a
   - **Expected**: Can update order status (edit button enabled)
10. Navigate to **Categories** page
    - **Expected**: Only see tenant-a categories, can create/edit
11. Check user info in header
    - **Expected**: Shows "Tenant Admin (Demo Store) | Demo Store"
12. Logout and re-login with **different tenant**
    - Select "Test Shop (tenant-b)" instead
    - **Expected**: Dashboard now shows tenant-b data only

### Success Criteria

- ✅ Tenant selector appears for tenant admin
- ✅ Only selected tenant's data visible
- ✅ Products/categories/orders filtered by tenant
- ✅ Can create/edit products, categories, and orders within tenant
- ✅ Cannot see other tenants' data
- ✅ User info displays current role and tenant

---

## Test Scenario 3: Tenant User Limited Editing

**Goal**: Verify tenant user can view all data but only edit products/categories (not orders).

### Steps

1. Navigate to `http://localhost:5176/login`
2. Select **"Catalog Manager (Demo Store)"** from profile dropdown
3. **Expected**: Tenant selector dropdown appears
4. Select **"Demo Store (tenant-a)"** from tenant dropdown
5. Click **"Login"** button
6. Navigate to **Products** page
   - **Expected**: See tenant-a products
   - **Expected**: Can click "Edit" button
7. Edit a product
   - **Expected**: Can save changes successfully
8. Navigate to **Categories** page
   - **Expected**: Can create/edit categories
9. Navigate to **Orders** page
   - **Expected**: Can VIEW orders
   - **Expected**: "Update Status" button is DISABLED or HIDDEN
10. Try to access order details page directly
    - Click on an order number
    - **Expected**: Can see order details
    - **Expected**: Status update section disabled/hidden
11. Check navigation and buttons
    - **Expected**: "Create Tenant" feature not visible (if implemented)
    - **Expected**: "Create Market" feature not visible (if implemented)

### Success Criteria

- ✅ Tenant selector appears for tenant user
- ✅ Can view all tenant data (products, categories, orders)
- ✅ Can edit products and categories
- ✅ CANNOT edit order status (button disabled/hidden)
- ✅ CANNOT create tenants or markets
- ✅ Tenant-scoped data filtering works correctly

---

## Test Scenario 4: Route Protection

**Goal**: Verify unauthenticated users cannot access protected routes.

### Steps

1. Ensure logged out (click Logout if needed)
2. Manually navigate to `http://localhost:5176/admin`
   - **Expected**: Redirected to `/login`
3. Manually navigate to `http://localhost:5176/admin/products`
   - **Expected**: Redirected to `/login`
4. Navigate to `/login` (should work without auth)
   - **Expected**: Login page loads normally
5. Login as any profile
6. Navigate to `/admin`
   - **Expected**: Dashboard loads successfully
7. Navigate to `/login` while authenticated
   - **Expected**: Either stay on login or redirect to `/admin` (implementation choice)

### Success Criteria

- ✅ Cannot access `/admin/*` routes without authentication
- ✅ Redirected to `/login` when accessing protected routes
- ✅ Can access protected routes after successful login
- ✅ Login page accessible without authentication

---

## Test Scenario 5: Session Persistence

**Goal**: Verify session persists across page refreshes.

### Steps

1. Login as any profile (e.g., Tenant Admin)
2. Navigate to Products page
3. Refresh browser (F5 or Ctrl+R)
   - **Expected**: Still authenticated, Products page reloads
   - **Expected**: No redirect to login
4. Open browser DevTools → Application → Local Storage
   - **Expected**: See `ecommerce-auth` key with session data
5. Close browser tab and reopen `http://localhost:5176`
   - **Expected**: Still authenticated if using same browser (localStorage persists)
6. Logout
7. Refresh browser
   - **Expected**: Redirected to `/login` (session cleared)

### Success Criteria

- ✅ Session persists across page refreshes
- ✅ localStorage contains auth session
- ✅ Logout clears localStorage
- ✅ After logout, cannot access protected routes

---

## Test Scenario 6: Data Isolation by Tenant

**Goal**: Verify tenant data filtering works correctly for all entities.

### Steps

1. Login as **Superadmin**
2. Note the total count of products on the Products page
   - **Example**: 20 products across all tenants
3. Logout and login as **Tenant Admin for "Demo Store" (tenant-a)**
4. Check Products page count
   - **Expected**: Fewer products than superadmin saw
   - **Expected**: Only products with `tenantId: "tenant-a"`
5. Create a new product as Tenant Admin
   - **Expected**: Product created with `tenantId: "tenant-a"`
6. Logout and login as **Superadmin** again
7. Navigate to Products
   - **Expected**: See the newly created product (because superadmin sees all)
8. Logout and login as **Tenant Admin for "Test Shop" (tenant-b)**
9. Navigate to Products
   - **Expected**: Do NOT see the product created by tenant-a admin
   - **Expected**: Only see tenant-b products

### Success Criteria

- ✅ Superadmin sees all tenants' data
- ✅ Tenant Admin sees only selected tenant's data
- ✅ Data created by one tenant not visible to other tenants
- ✅ Tenant isolation enforced across products, categories, and orders

---

## Common Test Cases

### Edge Case: Direct URL Navigation

1. Login as **Tenant User**
2. Manually type URL: `http://localhost:5176/admin/orders/ORDER-123/edit`
   - **Expected**: Order details page loads (user can VIEW)
   - **Expected**: Edit controls disabled/hidden (user cannot EDIT status)

### Edge Case: localStorage Tampering

1. Login as **Tenant User**
2. Open DevTools → Application → Local Storage
3. Manually change `role` from `TENANT_USER` to `SUPERADMIN` in localStorage
4. Refresh page
   - **Expected**: Either re-validate session (reject tampered data) OR show error
   - **Future enhancement**: Backend validation will prevent this

### Edge Case: Tenant Switching

1. Login as **Tenant Admin for tenant-a**
2. Navigate to Products page (see tenant-a products)
3. Try to switch tenant without logging out
   - **Expected**: No tenant switcher in header (must logout to switch)
   - **Alternative**: If tenant switcher is implemented, switching should clear and reload data

---

## Troubleshooting

### Issue: Logged out after every page refresh

**Cause**: localStorage persistence not working
**Solution**:
- Check Zustand persist middleware configuration
- Verify `ecommerce-auth` key in localStorage
- Check browser privacy settings (localStorage enabled?)

### Issue: Can see other tenants' data as Tenant Admin

**Cause**: Tenant filtering not applied to queries
**Solution**:
- Check TanStack Query hooks pass `authStore.getTenantId()`
- Verify API client adds `X-Tenant-ID` header
- Check MSW handlers filter by tenantId

### Issue: Tenant User can edit orders

**Cause**: Permission checks not implemented
**Solution**:
- Check `authStore.hasPermission('editOrders')` logic
- Verify order edit buttons check user role
- Ensure order update mutations check permissions

---

## Manual Test Checklist

Use this checklist to validate all features:

- [ ] **Login Flow**
  - [ ] Superadmin login (no tenant selector)
  - [ ] Tenant Admin login (with tenant selector)
  - [ ] Tenant User login (with tenant selector)
  - [ ] Invalid profile ID shows error

- [ ] **Data Visibility**
  - [ ] Superadmin sees all tenants' data
  - [ ] Tenant Admin sees only selected tenant's data
  - [ ] Tenant User sees only selected tenant's data

- [ ] **Permissions**
  - [ ] Superadmin can edit everything
  - [ ] Tenant Admin can edit products, categories, orders
  - [ ] Tenant User can edit products, categories only (NOT orders)

- [ ] **Session Management**
  - [ ] Session persists across page refreshes
  - [ ] Logout clears session
  - [ ] Cannot access protected routes when logged out

- [ ] **UI Elements**
  - [ ] User info shows role and tenant in header
  - [ ] Logout button visible and functional
  - [ ] Tenant selector only shown for scoped roles

- [ ] **Route Protection**
  - [ ] Redirected to /login when accessing /admin without auth
  - [ ] Can access /admin after successful login

---

## Next Steps After Manual Testing

1. **Document Issues**: Report any bugs found during testing
2. **Automated Tests**: Write E2E tests for critical flows (future phase)
3. **Production Auth**: Plan migration to real authentication (OAuth2/OIDC)
4. **User Management**: Add UI for creating/editing users (beyond hardcoded profiles)
5. **Audit Logging**: Track authentication events for security monitoring
