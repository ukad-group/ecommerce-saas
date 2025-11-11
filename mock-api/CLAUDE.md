# Mock API - Development Backend Guide

## Overview

ASP.NET Core Web API providing mock backend for development and testing. Serves both admin backoffice and showcase website.

**Port**: http://localhost:5180

## Purpose

- **Development backend** - No real database needed
- **Contract reference** - Defines API contracts for production
- **Cross-platform** - Used by React admin + ASP.NET showcase
- **Easy transition** - Same contracts will be implemented in production

## Tech Stack

- ASP.NET Core 9.0 Web API
- C# 12
- In-memory data store (singleton)
- CORS enabled for localhost
- Swagger/OpenAPI (auto-generated)

## Quick Start

```bash
cd MockApi
dotnet run
# http://localhost:5180

# View Swagger docs
# http://localhost:5180/swagger
```

## Project Structure

```
/MockApi/
  /Controllers/
    ProductsController.cs       # Product CRUD + versioning
    CategoriesController.cs     # Category hierarchy
    CartController.cs           # Shopping cart operations
    OrdersController.cs         # Customer orders
    AdminOrdersController.cs    # Admin order management
    TenantsController.cs        # Tenant management
    MarketsController.cs        # Market management
    ApiKeysController.cs        # API key generation/revocation

  /Models/
    Product.cs, Category.cs, Order.cs, Tenant.cs, Market.cs, etc.
    ProductVersion.cs           # Product versioning support

  /Data/
    MockDataStore.cs            # In-memory singleton data store
    SeedData.cs                 # Initial data seeding

  Program.cs                    # API configuration
  appsettings.json             # Configuration
```

## 8 Controllers

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

## Data Store

**MockDataStore.cs** - Singleton in-memory storage:
```csharp
public class MockDataStore
{
    // In-memory collections
    public List<Product> Products { get; set; }
    public List<ProductVersion> ProductVersions { get; set; }
    public List<Category> Categories { get; set; }
    public List<Order> Orders { get; set; }
    public List<Tenant> Tenants { get; set; }
    public List<Market> Markets { get; set; }
    public List<ApiKey> ApiKeys { get; set; }
}
```

**Important**: All data resets when API restarts!

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
2. Update MockDataStore if new entity
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
2. Check `MockDataStore` state (in-memory)
3. Restart API to reset data

## CORS Configuration

**Program.cs** allows:
- http://localhost:5173 (admin frontend)
- http://localhost:5025 (showcase website)

Add more origins in `Program.cs` if needed.

## Product Versioning

**Every product update creates a new version**:
- Sequential version numbers (v1, v2, v3...)
- Full product snapshot stored
- Original stays in `Products` list (replaced)
- History in `ProductVersions` list
- Restore overwrites current + creates new version

```csharp
// Update flow
PUT /api/v1/products/123
→ Creates ProductVersion with current state
→ Updates Product with new data
→ Increments version number
```

## Important Notes

- **In-memory only** - Data resets on restart
- **No persistence** - No database, no files
- **No auth validation** - Headers checked but not validated
- **No rate limiting** - Unlimited requests
- **Development only** - NOT for production use

## Troubleshooting

**API not starting**: Check port 5180 is free

**CORS errors**: Verify origin in Program.cs CORS config

**Data reset**: Expected behavior (in-memory), restart API

**404 errors**: Check route in Swagger docs

## Next Steps (Production Backend)

When replacing with production:
1. Implement same endpoints (use Swagger as reference)
2. Add PostgreSQL database
3. Add real authentication (OAuth2/OIDC)
4. Add validation and error handling
5. Add rate limiting
6. Add logging and monitoring
7. Keep same API contracts!

---

**For API integration patterns, see**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
