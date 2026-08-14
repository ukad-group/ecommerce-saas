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
  highlights?: string[];
  leasingFactor?: number;           // Falls back to market's DefaultLeasingFactor
  hidePrice?: boolean;
  hiddenPriceDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
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
- **Stock**: Quick stock updates, low-stock warnings; negative stock is refused by the API (400) on
  every write path, not just by the admin form
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

### Feature: Product Attributes (per-store variant axes)
- **Market-scoped library** in `Market.Settings.Attributes` — each `ProductAttribute { id, name, alias, values: { name, alias }[] }`. Plus `Market.Settings.AttributePresets` = `ProductAttributePreset { id, name, alias, attributeIds[] }` (named bundles).
- A product's variant axes use `VariantOption { name, alias?, attributeId?, values: ProductAttributeValue[] }` — **global** when `attributeId` links a library attribute (values = selected subset), **local** when defined inline.
- **`ProductVariant.options` is a list of `VariantOptionSelection { attributeId?, alias, name, valueAlias, valueName }`** (was `Record<name,value>`). Identity/uniqueness/matching key off the stable **alias(es)** (`(attributeId ?? alias) + valueAlias`), so renaming an attribute or value never breaks a variant; `name`/`valueName` are display snapshots refreshed from the library on save. Storefronts match variants by alias via `data-option`/`data-value` alias attributes. Migrate existing rows with `scripts/migration/migrate_variant_options.py` (dict → list; dry-run default, `--apply` backs up).
- **Variant uniqueness**: enforced in `ProductsController.ValidateVariants` (server) and `ProductForm`/workspace view (client) — no two variants may share the same attribute-value combination (order-independent) or SKU.
- **Property templates → attribute binding**: `CustomPropertyTemplate.attributeId`, when set, makes that custom-property field a **dropdown** of the attribute's values (React `ProductForm` + Umbraco workspace view); free text otherwise.
- **React admin**: `ProductAttributesPage` (`/admin/products/attributes`), `ProductAttributePresetsPage` (`/admin/products/attribute-presets`), `marketAttributesApi` + `useMarketAttributes`. ProductForm "Attributes" section: add-global-attribute + apply-preset + add-local.
- **Umbraco plugin**: single Commerce dashboard **"Product Attributes"** tab (list → detail editor: Name/Alias + Values as Name/Alias pairs; the separate "Product Attribute Presets" tab was removed — presets stay in the React admin + API); workspace-view custom-property dropdowns. The product workspace view labels variant axes **"Attributes"** (custom fields are **"Custom properties"**) and supports **global** axes: an "Add store attribute" picker on the Attributes editor, `global`/`local` badges, and per-variant value dropdowns that resolve a global axis's full unique value set from the library (`attributeId` is preserved across all save paths).
- **API**: `GET/POST/PUT/DELETE /api/v1/admin/markets/:id/attributes` and `.../attribute-presets` (+ bulk PUT). The **attributes** endpoints use the `AdminOrApiKey` policy (admin JWT **or** a valid plugin API key — so the Umbraco plugin can read/write them; not anonymous). Attribute **values are deduped by name** (case-insensitive) on add/update/bulk in `MarketsController`.
- **Migration**: `VariantOption.Values` moved string → `{name, alias}` (no `ecomm.db` reset — data migrated in place; seeder writes new shape). `scripts/migration/migrate_westbay_attributes.py` promotes a market's local variant axes into global store attributes (unique unioned values) and relinks products via `attributeId` (dry-run by default, `--apply` backs up first).

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
