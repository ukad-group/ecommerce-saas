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
- **Image Upload**: Multiple images per product with drag-and-drop reordering
- **Image Gallery**: Showcase displays all images with clickable thumbnails
- **Responsive Images**: Automatic resizing with browser caching (thumbnails: 150px, cards: 300px, detail: 600px)

### API Endpoints
- `GET /api/v1/products` - List products (market-scoped)
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/:id` - Get current version
- `PUT /api/v1/products/:id` - Update (creates new version)
- `DELETE /api/v1/products/:id` - Delete product
- `GET /api/v1/products/:id/versions` - Get version history
- `GET /api/v1/products/:id/versions/:version` - Get specific version
- `POST /api/v1/products/:id/versions/:version/restore` - Restore version
- `POST /api/v1/files/upload` - Upload product images (requires X-User-ID auth)
- `GET /api/v1/files/resize/{tenantId}/{marketId}/{fileName}?width={w}&height={h}` - Get resized image (cached 7 days)
- `DELETE /api/v1/files/:filename` - Delete uploaded image

### Components
- **ProductsPage**: `/admin/products` - Main product list
- **ProductList**: Table with search, filters, pagination
- **ProductForm**: Create/edit modal with validation
- **ImageUpload**: Drag-and-drop image upload with reordering
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

### Database Implementation
- **Composite primary key**: `{Id, Version}` in Products table
- **Version tracking**: `IsCurrentVersion` flag marks active version
- **Thread-safe**: Factory pattern with scoped DbContext per operation
- **Persistence**: SQLite database, survives API restarts
- **Query optimization**: `.AsNoTracking()` for read-only queries

### Important Notes
- Products are **market-specific** (each market has own catalog)
- API calls require `X-Market-ID` header
- Versioning is automatic on every update (can't be disabled)
- All versions persist in database (composite key allows same Id, different Version)
- **CRITICAL**: All product queries MUST filter by `IsCurrentVersion` to get the active version
- Deleting a product removes ALL versions (not just current)
- **Image uploads**: Stored locally at `api/EComm.Api/uploads/{tenantId}/{marketId}/`
- **Images array**: First image (`Images[0]`) is ALWAYS the primary image
- **NO legacy ImageUrl**: System uses ONLY the `Images` array (first = primary)
- **Image reordering**: Drag images in admin - position 0 is primary
- **Cart/Orders**: Store snapshot of `Images[0]` as `ProductImageUrl` at creation time
- **Showcase gallery**: Displays all images with thumbnail navigation
- **Image optimization**: Uses ImageSharp for on-the-fly resizing, cached for 7 days
- **ImageHelper**: Utility classes in showcase and frontend for generating resize URLs

### Common Tasks
**Add new product field**: Update Product type → ProductForm → API → backend
**Change product display**: Edit ProductList component
**Add product filter**: Update ProductsPage filters
**Modify version logic**: Check api ProductsController + DataStore.cs
**Reset database**: Delete `api/EComm.Api/ecomm.db` file and restart API
