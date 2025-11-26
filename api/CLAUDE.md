# API Backend Guide

## Overview

ASP.NET Core Web API backend for the eCommerce platform. Serves both admin backoffice and showcase website.

**Port**: http://localhost:5180

## Purpose

- **Full-featured backend** - SQLite database with Entity Framework Core
- **Contract reference** - Defines API contracts
- **Cross-platform** - Used by React admin + ASP.NET showcase
- **Production-ready patterns** - Swap SQLite for SQLServer when scaling

## Tech Stack

- ASP.NET Core 9.0 Web API
- C# 12
- **SQLite database with Entity Framework Core** (persistent storage)
- CORS enabled for localhost
- Swagger/OpenAPI (auto-generated)

## Quick Start

```bash
cd EComm.Api
dotnet run
# http://localhost:5180

# View Swagger docs
# http://localhost:5180/swagger
```

## Project Structure

```
/EComm.Api/
  /Controllers/
    ProductsController.cs       # Product CRUD + versioning
    CategoriesController.cs     # Category hierarchy
    CartController.cs           # Shopping cart operations
    OrdersController.cs         # Customer orders
    AdminOrdersController.cs    # Admin order management
    TenantsController.cs        # Tenant management
    MarketsController.cs        # Market management
    ApiKeysController.cs        # API key generation/revocation
    FilesController.cs          # File upload & image resizing

  /Models/
    Product.cs, Category.cs, Order.cs, Tenant.cs, Market.cs, etc.
    ProductVersion.cs           # Product versioning support

  /Data/
    ECommDbContext.cs           # EF Core DbContext with JSON column support
    DataStore.cs                # Data access layer (uses EF Core)
    DatabaseSeeder.cs           # Database seeding on startup

  /uploads/                     # Uploaded product images (tenant/market scoped)

  Program.cs                    # API configuration
  appsettings.json             # Configuration
```

## 9 Controllers

### 1. ProductsController
```csharp
GET    /api/v1/products                        // List products (market-scoped)
POST   /api/v1/products                        // Create product
GET    /api/v1/products/{id}                   // Get current version
PUT    /api/v1/products/{id}                   // Update (creates new version)
DELETE /api/v1/products/{id}                   // Delete product
GET    /api/v1/products/{id}/versions          // Get version history
GET    /api/v1/products/{id}/versions/{ver}    // Get specific version
POST   /api/v1/products/{id}/versions/{ver}/restore // Restore version
```

### 2. CategoriesController
```csharp
GET    /api/v1/categories              // List categories (market-scoped)
POST   /api/v1/categories              // Create category
GET    /api/v1/categories/{id}         // Get category
PUT    /api/v1/categories/{id}         // Update category
DELETE /api/v1/categories/{id}         // Delete category
```

### 3. CartController
```csharp
GET    /api/v1/cart                    // Get cart (new order)
POST   /api/v1/cart/items              // Add item to cart
PUT    /api/v1/cart/items/{id}         // Update item quantity
DELETE /api/v1/cart/items/{id}         // Remove item
```

### 4. OrdersController
```csharp
GET    /api/v1/orders                  // List customer orders
POST   /api/v1/orders                  // Create order
GET    /api/v1/orders/{id}             // Get order details
```

### 5. AdminOrdersController
```csharp
GET    /api/v1/admin/orders            // List all orders (admin)
GET    /api/v1/admin/orders/{id}       // Get order details
PUT    /api/v1/admin/orders/{id}/status // Update order status
```

### 6. TenantsController
```csharp
GET    /api/v1/tenants                 // List all tenants
POST   /api/v1/tenants                 // Create tenant
GET    /api/v1/tenants/{id}            // Get tenant
PUT    /api/v1/tenants/{id}            // Update tenant
DELETE /api/v1/tenants/{id}            // Delete tenant
```

### 7. MarketsController
```csharp
GET    /api/v1/markets?tenantId={id}   // List markets for tenant
POST   /api/v1/markets                 // Create market
GET    /api/v1/markets/{id}            // Get market
PUT    /api/v1/markets/{id}            // Update market
DELETE /api/v1/markets/{id}            // Delete market
```

### 8. ApiKeysController
```csharp
GET    /api/v1/api-keys?marketId={id}  // List keys for market
POST   /api/v1/api-keys                // Generate new key (shows once!)
PUT    /api/v1/api-keys/{id}/revoke    // Revoke key
DELETE /api/v1/api-keys/{id}           // Delete key
```

### 9. FilesController
```csharp
POST   /api/v1/files/upload                                    // Upload product images (multipart/form-data)
GET    /api/v1/files/resize/{tenant}/{market}/{file}?width={w}&height={h} // Get resized image (cached 7 days)
DELETE /api/v1/files/{filename}                                // Delete uploaded image
```
**Features**:
- Uses SixLabors.ImageSharp for high-quality resizing
- Maintains aspect ratio with ResizeMode.Max
- Automatic browser caching (7 days via Cache-Control headers)
- Stores files at `/uploads/{tenantId}/{marketId}/`
- Supports: jpg, jpeg, png, gif, webp (max 5MB per file)

## Data Store

**SQLite Database** (`ecomm.db`):
- Persistent storage across API restarts
- Entity Framework Core with JSON column support
- Automatic database creation and seeding
- **Reset capability**: Delete `ecomm.db` file, restart API → fresh database

**DataStore.cs** - Data access layer using EF Core:
```csharp
public class DataStore
{
    // Factory pattern for thread-safe DbContext access
    private DbContextOptions<ECommDbContext> _dbOptions;

    private ECommDbContext CreateContext()
    {
        return new ECommDbContext(_dbOptions);
    }

    // Each operation creates a new scoped context
    public List<Product> GetProducts()
    {
        using var context = CreateContext();
        return context.Products.AsNoTracking().ToList();
    }

    public void AddProduct(Product product)
    {
        using var context = CreateContext();
        context.Products.Add(product);
        context.SaveChanges();
    }
    // ... etc
}
```

**ECommDbContext.cs** - Entity Framework Core DbContext:
- Stores complex types as JSON (Lists, Dictionaries, nested objects)
- **Composite primary key for Products**: `{Id, Version}` to support versioning
- Uses `.AsNoTracking()` for read-only queries to avoid tracking conflicts
- Optimized indexes for common queries
- Supports product versioning with full history

## Seed Data

**SeedData.cs** provides:
- 3 Tenants (A, B, C)
- 7 Markets across tenants
- 12 Products (market-1 only)
- 5 Categories (hierarchical)
- 6 Orders (various statuses)
- 9 API Keys (various markets)
- 3 Mock users (for auth reference)

## Multi-Tenancy Headers

**Every request should include**:
```csharp
X-Tenant-ID: tenant-a
X-Market-ID: market-1
```

**API Key requests** (showcase):
```csharp
X-API-Key: sk_live_...
```

Controllers filter data based on these headers.

## Common Tasks

### Add New Endpoint
1. Add method to controller
2. Update DataStore if new entity
3. Add seed data if needed
4. Test with Swagger

### Add New Entity Field
1. Update model class in `/Models/`
2. Update seed data in `SeedData.cs`
3. Frontend will auto-pick up changes

### Change API Contract
1. Update controller method
2. Update model if needed
3. Inform frontend team
4. Document breaking changes

### Debug Data
1. Use Swagger UI: http://localhost:5180/swagger
2. Check SQLite database: `ecomm.db` (use DB Browser for SQLite)
3. Reset data: Delete `ecomm.db` and restart API

## CORS Configuration

**Program.cs** allows:
- http://localhost:5173 (admin frontend)
- http://localhost:5025 (showcase website)

Add more origins in `Program.cs` if needed.

## Product Versioning

**Every product update creates a new version**:
- Sequential version numbers (v1, v2, v3...)
- Full product snapshot stored in database
- **Uses composite primary key `{Id, Version}`** in Products table
- `IsCurrentVersion` flag marks the active version
- All versions persist in database for complete history
- Restore creates new version from historical snapshot

```csharp
// Update flow
PUT /api/v1/products/123
→ Marks existing product as IsCurrentVersion = false
→ Creates new Product row with incremented version number
→ Sets IsCurrentVersion = true on new version
→ Both versions coexist in database (composite key)
```

**Database Schema**:
```sql
-- Products table uses composite primary key to support versioning
PRIMARY KEY (Id, Version)
-- This allows multiple versions of same product (same Id, different Version)
-- Queries filter by IsCurrentVersion to get active version
```

## Important Notes

- **SQLite persistence** - Data persists across restarts
- **Easy reset** - Delete `ecomm.db` file to start fresh
- **No auth validation** - Headers checked but not validated
- **No rate limiting** - Unlimited requests
- **SQLite for development** - Swap to SQLServer for production scale
- **Image storage** - Files stored locally at `/uploads/{tenantId}/{marketId}/`
- **Image caching** - Static files and resized images cached for 7 days
- **Image optimization** - SixLabors.ImageSharp package for on-the-fly resizing

## Troubleshooting

**API not starting**: Check port 5180 is free

**CORS errors**: Verify origin in Program.cs CORS config

**Data reset**: Delete `ecomm.db` file and restart API

**404 errors**: Check route in Swagger docs

**Database locked**: Close any SQLite database viewers before restarting API

**Product update errors**: If you see "UNIQUE constraint failed" errors, delete `ecomm.db` and restart. The database will be recreated with the correct composite primary key schema.

**DbContext concurrency errors**: DataStore uses factory pattern with scoped contexts per operation. Each method creates its own `using var context = CreateContext()` instance to avoid threading issues.

## Scaling to Production

When ready for production scale:
1. **Migrate from SQLite to SQLServer** (EF Core makes this easy!)
2. Add real authentication (OAuth2/OIDC)
3. Add validation and error handling
4. Add rate limiting
5. Add logging and monitoring
6. Deploy with Docker/Kubernetes

---

**For API integration patterns, see**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
