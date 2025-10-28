# Feature 001: Product Catalog Management

## Overview

**Feature Branch**: `001-product-catalog`
**Status**: Partially Implemented
**Priority**: P1 (Core MVP)
**Created**: 2025-10-22

This feature implements a comprehensive product catalog management system for the eCommerce SaaS backoffice, enabling administrators to create, edit, and organize products with categories, variants, inventory tracking, and images.

### Market-Based Architecture

Products and categories are **market-specific**, not tenant-wide:
- Each market has its own unique catalog
- Categories are scoped to markets
- Products belong to specific markets
- This allows different stores/locations to have tailored product offerings

## Quick Reference

- **Specification**: [spec.md](spec.md)
- **Implementation Status**: Core CRUD operations complete, advanced features pending

## What's Implemented

### Core Product Management
- ✅ Create/Read/Update products
- ✅ Product status management (Active/Inactive/Draft)
- ✅ SKU validation (uniqueness)
- ✅ Product list view with sorting and pagination
- ✅ Product form with basic fields (name, SKU, description, price)

### Categories
- ✅ Category CRUD operations
- ✅ Hierarchical category structure (parent-child)
- ✅ Category list and tree view
- ✅ Assign products to categories

### Inventory
- ✅ Quick stock updates
- ✅ Stock quantity tracking
- ✅ Low-stock threshold configuration
- ✅ Visual indicators for low-stock and out-of-stock

### Product Variants
- ✅ Variant support in data model
- ✅ Variant types and options
- ✅ Custom properties on products
- ⚠️ Full variant UI partially implemented

## What's Missing

### Images and Media (FR-028 to FR-033)
- ❌ Product image upload
- ❌ Multiple images per product
- ❌ Image reordering
- ❌ Primary image selection
- ❌ Thumbnail generation

### Search and Filtering (FR-034 to FR-037)
- ❌ Full-text search across product fields
- ❌ Advanced filtering by category, status, stock level
- ❌ Combined filters
- ❌ Clear filters functionality

### Advanced Features
- ❌ Soft-deletion (currently hard delete)
- ❌ Product history/audit trail
- ❌ Bulk operations (import/export)
- ❌ Product duplication
- ❌ Sale/promotional pricing

## Key Components

### Pages
- **ProductsPage** (`frontend/src/pages/admin/ProductsPage.tsx`)
  - Product list with inline stock updates
  - Add new product button
  - Basic filtering

- **ProductEditPage** (`frontend/src/pages/admin/ProductEditPage.tsx`)
  - Full product form
  - Inventory management
  - Status toggle

- **CategoriesPage** (`frontend/src/pages/admin/CategoriesPage.tsx`)
  - Category tree view
  - Category CRUD operations
  - Hierarchical management

### Components
- **ProductList** (`frontend/src/components/admin/ProductList.tsx`)
- **ProductForm** (`frontend/src/components/admin/ProductForm.tsx`)
- **QuickStockUpdate** (`frontend/src/components/admin/QuickStockUpdate.tsx`)
- **CategoryList** (`frontend/src/components/admin/CategoryList.tsx`)
- **CategoryForm** (`frontend/src/components/admin/CategoryForm.tsx`)

### API Services

**Endpoints** (Mocked with MSW):
```typescript
// Products
GET    /api/v1/products              // List products
POST   /api/v1/products              // Create product
GET    /api/v1/products/:id          // Get product details
PUT    /api/v1/products/:id          // Update product
DELETE /api/v1/products/:id          // Delete product
PATCH  /api/v1/products/:id/stock    // Quick stock update

// Categories
GET    /api/v1/categories            // List categories
POST   /api/v1/categories            // Create category
GET    /api/v1/categories/:id        // Get category details
PUT    /api/v1/categories/:id        // Update category
DELETE /api/v1/categories/:id        // Delete category
```

### Data Models

**Product**:
```typescript
{
  id: string;
  tenantId: string;
  marketId: string;          // NEW: Market-specific
  name: string;
  sku: string;               // Unique within market
  description?: string;
  basePrice: number;
  salePrice?: number;
  status: 'active' | 'inactive' | 'draft';
  stockQuantity: number;
  lowStockThreshold: number;
  categoryIds: string[];     // Categories within same market
  variants?: ProductVariant[];
  customProperties?: { [key: string]: any };
  createdAt: Date;
  updatedAt: Date;
}
```

**Category**:
```typescript
{
  id: string;
  tenantId: string;
  marketId: string;          // NEW: Market-specific
  name: string;
  description?: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Market** (New Entity):
```typescript
{
  id: string;
  tenantId: string;
  name: string;              // e.g., "Downtown Store"
  code: string;              // e.g., "DT-001"
  type: 'physical' | 'online' | 'hybrid';
  isActive: boolean;
  settings?: {
    currency?: string;
    timezone?: string;
    address?: Address;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Multi-Tenancy & Market Isolation

The system implements two-level data isolation:

### Tenant Level
- Tenants own markets
- Each tenant can have multiple markets
- API calls include `X-Tenant-ID` header

### Market Level
- Products and categories are market-specific
- Each market has its own catalog
- API calls include both `X-Tenant-ID` and `X-Market-ID` headers
- MSW handlers filter by both tenant and market

**Access Control**:
- **Superadmin**: All tenants and markets
- **Tenant Admin**: All markets within their tenant
- **Tenant User**: Specific assigned markets only

## Testing

### Manual Test Scenarios

**Test 1: Create Product**
1. Navigate to `/admin/products`
2. Click "Add New Product"
3. Fill in: Name, SKU, Description, Base Price
4. Set initial stock quantity
5. Select categories
6. Click "Save"
7. Verify product appears in list

**Test 2: Update Stock**
1. Navigate to `/admin/products`
2. Find product with low stock
3. Use inline stock update field
4. Enter new quantity
5. Verify stock indicator updates

**Test 3: Category Hierarchy**
1. Navigate to `/admin/categories`
2. Create parent category (e.g., "Electronics")
3. Create child category with parent selected (e.g., "Laptops")
4. Verify tree structure displays correctly
5. Assign product to child category
6. Verify product shows in category filter

### Edge Cases Covered

- ✅ Duplicate SKU prevention
- ✅ Negative price validation
- ✅ Zero stock handling
- ✅ Category deletion with assigned products (blocked)
- ⚠️ Parent category reassignment (needs testing)
- ❌ Very long product names/descriptions (no UI limits yet)
- ❌ Product deletion with existing orders (soft-delete needed)

## Success Criteria Status

From [spec.md](spec.md) Success Criteria:

- **SC-001** ✅ Create product in < 2 minutes: ACHIEVED
- **SC-002** ⚠️ Find/edit in 1000 products < 30s: NEEDS search implementation
- **SC-003** ✅ List page loads 50 products < 2s: ACHIEVED (mock data)
- **SC-004** ✅ 95% creation success rate: ACHIEVED with validation
- **SC-005** ⏳ 1000 concurrent users: NOT YET TESTED (backend phase)
- **SC-006** ✅ Low-stock warnings < 1s: ACHIEVED
- **SC-007** ⏳ Image upload 99% success: NOT IMPLEMENTED
- **SC-008** ⚠️ Category filtering < 1s: BASIC implementation
- **SC-009** ⏳ 100K products support: NOT YET TESTED
- **SC-010** ❌ Zero data loss (soft-delete): NOT IMPLEMENTED

## Next Steps

### High Priority
1. Implement product image upload and management
2. Add full-text search across products
3. Implement soft-delete for products
4. Add advanced filtering (combine multiple criteria)

### Medium Priority
5. Complete variant UI (currently data-model only)
6. Add bulk operations (import/export)
7. Product duplication feature
8. Sale price management with date ranges

### Low Priority
9. Product history/audit trail
10. Advanced inventory features (stock adjustments with reasons)
11. Product comparison features
12. Related products recommendations

## Dependencies

### Internal
- ✅ Multi-tenant architecture (implemented)
- ✅ Auth system for role-based access (partially implemented)
- ⏳ Cloud storage for images (Azure Blob - not integrated)

### External
- ⏳ Backend API implementation (.NET - future phase)
- ⏳ Image optimization service (future)
- ⏳ Search service for full-text search (future)

## Known Issues

1. **Hard Delete**: Products are permanently deleted, should be soft-deleted to preserve order history
2. **No Image Support**: Product images not implemented yet
3. **Limited Search**: No full-text search, only basic filtering
4. **Variant UI Incomplete**: Variants exist in data model but UI is basic
5. **No Bulk Operations**: Can't import/export products
6. **Category Delete**: Doesn't check for products in subcategories recursively

## Configuration

### Mock Data
Located in `frontend/src/mocks/data/mockProducts.ts`:
- 20+ sample products
- Various categories (Electronics, Clothing, Home & Garden)
- Different stock levels (in-stock, low-stock, out-of-stock)
- Product variants and custom properties examples

### Environment Variables
```bash
VITE_TENANT_ID=demo-tenant           # Default tenant for development
VITE_API_BASE_URL=http://localhost:5176/api
VITE_USE_MOCKS=true                  # Enable MSW mocking
```

## Future Backend Implementation

When implementing the .NET backend, ensure:

1. **API Contract Compliance**
   - Follow exact endpoint signatures from MSW handlers
   - Return same data structures
   - Implement same validation rules

2. **Database Schema**
   - Markets table with tenant_id foreign key
   - Products table with tenant_id AND market_id foreign keys
   - Categories table with tenant_id AND market_id foreign keys
   - Categories self-referencing parent_id within same market
   - Product_Categories junction table (many-to-many)
   - Variants table if supporting full variant system
   - Soft-delete: Add `deleted_at` timestamp column

3. **Multi-Tenancy & Market Isolation**
   - All queries must filter by tenant_id AND market_id
   - Validate X-Tenant-ID and X-Market-ID headers
   - Superadmin can access all tenants and markets
   - Tenant Admin can access all markets within their tenant

4. **Performance**
   - Composite index on: (tenant_id, market_id, sku)
   - Index on: (market_id, status, created_at)
   - Implement pagination server-side
   - Consider full-text search index for name/description

5. **Validation**
   - SKU uniqueness per market (not per tenant)
   - Price >= 0
   - Stock quantity >= 0
   - Category exists and belongs to same market
   - Market belongs to same tenant

## Resources

- Main specification: [spec.md](spec.md)
- Project overview: [../../CLAUDE.md](../../CLAUDE.md)
- Constitution: [../../memory/constitution.md](../../memory/constitution.md)

---

**Last Updated**: 2025-10-28
**Maintained By**: Development Team
