Review product catalog implementation before proceeding.

## Product Catalog Context

**Status**: Implemented with versioning

### Data Model
```typescript
interface Product {
  id: string;
  marketId: string;
  tenantId: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  categoryId?: string;
  status: 'active' | 'inactive' | 'draft';
  images?: string[];
  variants?: ProductVariant[];
  customProperties?: Record<string, any>;
  version: number;         // Sequential version number
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVersion {
  versionNumber: number;
  product: Product;          // Full product snapshot at this version
  changedBy?: string;
  changeNotes?: string;
  createdAt: Date;
}
```

### Key Features
- **CRUD**: Create, read, update, delete products
- **Versioning**: Every update creates new version, full history retained
- **Market-scoped**: Products belong to specific markets (not tenant-wide)
- **Categories**: Hierarchical category assignment
- **Stock**: Quick stock updates, low-stock warnings
- **Search & Filter**: By name, SKU, status, category
- **Restore**: Restore any previous version with one click

### API Endpoints
- `GET /api/v1/products` - List products (market-scoped)
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/:id` - Get current version
- `PUT /api/v1/products/:id` - Update (creates new version)
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/products/:id/versions` - Get version history
- `GET /api/v1/products/:id/versions/:version` - Get specific version
- `POST /api/v1/products/:id/versions/:version/restore` - Restore version

### Components
- **ProductsPage**: `/admin/products` - Main product list
- **ProductList**: Table with search, filters, pagination
- **ProductForm**: Create/edit modal with validation
- **QuickStockUpdate**: Inline stock editing
- **ProductVersionHistory**: Version list with restore

### State Management
- TanStack Query for data fetching/caching
- Optimistic updates for stock changes
- Auto-refetch on window focus

### Permissions
- **Superadmin**: Full access, all markets
- **Tenant Admin**: Full access, their markets only
- **Tenant User**: Full access, their assigned markets

### Important Notes
- Products are **market-specific** (each market has own catalog)
- API calls require `X-Market-ID` header
- Versioning is automatic on every update (can't be disabled)
- Deleting a product keeps version history

### Common Tasks
**Add new product field**: Update Product type → ProductForm → API mock → backend
**Change product display**: Edit ProductList component
**Add product filter**: Update ProductsPage filters
**Modify version logic**: Check mock-api ProductsController
