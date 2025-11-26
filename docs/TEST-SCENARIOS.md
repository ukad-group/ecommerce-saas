# Test Scenarios - Happy Paths

This document defines the happy path test scenarios that should be validated when implementing new features.

## Prerequisites

Before running tests:
1. API running on `http://localhost:5180`
2. Admin UI running on `http://localhost:5173`
3. Showcase running on `http://localhost:5025`

## Test User Credentials

All test users have password: `password123` (pre-filled in login form)

### Super Admin
- **Email**: `admin@platform.com`
- **Password**: `password123`
- **Access**: All tenants, all markets
- **Test URLs**: All admin routes

### Admin (Demo Store)
- **Email**: `admin@demostore.com`
- **Password**: `password123`
- **Access**: tenant-a only
- **Test URLs**: All admin routes except `/admin/tenants`

### Catalog Manager (Demo Store)
- **Email**: `catalog@demostore.com`
- **Password**: `password123`
- **Access**: tenant-a, limited permissions
- **Test URLs**: `/admin/products`, `/admin/categories`

## Happy Path Scenarios

### 0. Authentication Flow (Admin UI)

**Test ID**: `AUTH-001`
**User**: Super Admin
**Steps**:
1. Navigate to `http://localhost:5173/login`
2. Verify login form displays with:
   - Email input field
   - Password input field (pre-filled with "password123")
   - Login button
   - Test accounts information
3. Enter email: `admin@platform.com`
4. Click "Login" button
5. Verify redirect to `/admin` (dashboard)
6. Verify user info displayed in header:
   - Display name: "Super Admin"
   - Role badge: "Superadmin" with purple background
7. Verify navigation menu accessible
8. Click "Logout" button
9. Verify redirect to `/login`
10. Try to access `/admin/products` directly
11. Verify auto-redirect to `/login` (unauthorized)

**Expected**: Complete authentication flow works with JWT cookies

---

### 1. Product Management (Admin UI)

**Test ID**: `PRODUCT-001`
**User**: Admin (Demo Store)
**Steps**:
1. Navigate to `http://localhost:5173/login`
2. Click "Admin (Demo Store)" profile
3. Navigate to `/admin/products`
4. Click "Add Product" button
5. Fill form:
   - Name: "Test Product"
   - SKU: "TEST-001"
   - Price: "29.99"
   - Stock: "100"
   - Category: Select any
   - Description: "Test description"
6. Click "Save"
7. Verify product appears in list
8. Click edit on new product
9. Change stock to "50"
10. Click "Save"
11. Verify stock updated in list

**Expected**: Product created and updated successfully

---

### 2. Category Management (Admin UI)

**Test ID**: `CATEGORY-001`
**User**: Admin (Demo Store)
**Steps**:
1. Login as Admin (Demo Store)
2. Navigate to `/admin/categories`
3. Click "Add Category"
4. Fill form:
   - Name: "Test Category"
   - Description: "Test description"
5. Click "Save"
6. Verify category appears in list

**Expected**: Category created successfully

---

### 3. Order Status Management (Admin UI)

**Test ID**: `ORDER-STATUS-001`
**User**: Super Admin
**Steps**:
1. Login as Super Admin
2. Navigate to `/admin/order-statuses`
3. Click "Add Order Status"
4. Fill form:
   - Name: "Test Status"
   - Color: Select any color
5. Click "Save"
6. Verify status appears in list

**Expected**: Order status created successfully

---

### 4. Shopping Cart (Showcase)

**Test ID**: `CART-001`
**User**: Anonymous
**Steps**:
1. Navigate to `http://localhost:5025/products`
2. Click on any product
3. Click "Add to Cart"
4. Verify success message
5. Click cart icon
6. Verify product in cart
7. Update quantity to "2"
8. Verify total price updated
9. Click "Remove" on item
10. Verify cart empty

**Expected**: Cart operations work correctly

---

### 5. Fake Checkout (Showcase)

**Test ID**: `CHECKOUT-001`
**User**: Anonymous
**Steps**:
1. Navigate to `http://localhost:5025/products`
2. Add product to cart
3. Navigate to `/cart`
4. Click "Proceed to Checkout"
5. Fill form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Address: "123 Test St"
   - City: "Test City"
   - Postal Code: "12345"
   - Country: "Test Country"
6. Click "Place Order (Fake Payment)"
7. Verify success message with order number

**Expected**: Order created successfully

---

### 6. Image Upload (Admin UI)

**Test ID**: `IMAGE-001`
**User**: Admin (Demo Store)
**Steps**:
1. Login as Admin (Demo Store)
2. Navigate to `/admin/products`
3. Click "Add Product"
4. Drag and drop image to upload area
5. Verify image preview appears
6. Upload second image
7. Drag first image to second position
8. Verify order changed
9. Fill required fields
10. Click "Save"
11. Navigate to showcase product page
12. Verify images appear in gallery

**Expected**: Multiple images uploaded and reordered successfully

---

### 7. Tenant Management (Admin UI)

**Test ID**: `TENANT-001`
**User**: Super Admin
**Steps**:
1. Login as Super Admin
2. Navigate to `/admin/tenants`
3. Click "Add Tenant"
4. Fill form:
   - Name: "Test Tenant"
   - Code: "test-tenant"
5. Click "Save"
6. Verify tenant appears in list
7. Click "Manage Markets" on new tenant
8. Click "Add Market"
9. Fill form:
   - Name: "Test Market"
   - Region: "Test Region"
10. Click "Save"
11. Verify market appears in list

**Expected**: Tenant and market created successfully

---

### 8. Role-Based Access Control

**Test ID**: `RBAC-001`
**User**: Catalog Manager (Demo Store)
**Steps**:
1. Login as Catalog Manager
2. Verify can access `/admin/products`
3. Verify can access `/admin/categories`
4. Navigate to `/admin/tenants`
5. Verify redirected to home or unauthorized

**Expected**: Access control enforced correctly

---

## Test Execution Notes

When implementing new features:
1. Identify which test scenario(s) are affected
2. Run the relevant happy path test(s)
3. Document any new scenarios for new features
4. Update this file if test steps change

## Known Limitations

- Tests assume clean database state (or predictable seed data)
- No tests for error handling (only happy paths)
- No performance testing
- No accessibility testing (though Playwright can do this)

---

**Last Updated**: 2025-11-14
**Purpose**: Define automated test scenarios for Playwright MCP
