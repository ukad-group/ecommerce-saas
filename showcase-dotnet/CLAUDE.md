# eCommerce Showcase Website - Project Guide

## Project Overview

ASP.NET Core MVC reference implementation of a customer-facing eCommerce storefront demonstrating integration with the eCommerce SaaS Platform APIs.

**Purpose**:
- Showcase platform capabilities
- Reference implementation for client integrations
- Living documentation for API integration patterns
- Starter template for new storefronts

## Technology Stack

- **Framework**: ASP.NET Core 9.0 MVC
- **Language**: C# 12
- **View Engine**: Razor Pages
- **HTTP Client**: HttpClient with IHttpClientFactory
- **Session Management**: In-memory session state
- **Styling**: Bootstrap 5
- **JavaScript**: Vanilla JS for cart interactions

## Architecture

### Integration Pattern

```
[Showcase Website (ASP.NET MVC)]
         |
         | HTTP/REST
         v
[.NET Mock API :5180]
         |
         v
[In-Memory Data Store]
```

**Key Integration Points**:
- API Client service layer
- API Key authentication (per market)
- Session-based shopping cart
- Order management through platform APIs

### Project Structure

```
/ECommShowcase.Web/
  /Controllers/
    HomeController.cs           # Home page, featured products
    ProductsController.cs       # Product listing, details, search
    CartController.cs           # Shopping cart operations
    CheckoutController.cs       # Checkout flow, fake payment
  /Services/
    IECommApiClient.cs          # API client interface
    ECommApiClient.cs           # HTTP client for platform APIs
    ICartService.cs             # Cart business logic interface
    CartService.cs              # Cart management service
  /Models/
    /ViewModels/                # View-specific models
    /DTOs/                      # Match platform API contracts
  /Views/
    /Home/, /Products/, /Cart/, /Checkout/
    /Shared/
      _Layout.cshtml            # Main layout with nav
      _ProductCard.cshtml       # Reusable product card
  /wwwroot/
    /css/, /js/cart.js
  appsettings.json
  Program.cs
```

## Configuration

### appsettings.json

```json
{
  "ECommPlatform": {
    "BaseUrl": "http://localhost:5180/api/v1",
    "ApiKey": "sk_live_demo_key_12345",
    "TenantId": "tenant-a",
    "MarketId": "market-1",
    "Timeout": 30
  },
  "Showcase": {
    "StoreName": "Demo Shop",
    "Currency": "USD",
    "CurrencySymbol": "$",
    "FeaturedProductCount": 8,
    "ProductsPerPage": 12
  }
}
```

### Environment Variables (Optional)

- `ECOMM_API_BASE_URL` - Override platform API URL
- `ECOMM_API_KEY` - Override API key
- `ECOMM_TENANT_ID` - Override tenant ID
- `ECOMM_MARKET_ID` - Override market ID

## Core Features

### 1. Home Page ✅
- Hero section with store branding
- Featured/latest products grid
- Category navigation, search bar

### 2. Product Catalog ✅
- Product listing with pagination
- Category filtering, product search
- Product cards with quick "Add to Cart"
- Product detail pages

**API Integration**:
- `GET /api/v1/products` - List products
- `GET /api/v1/products/{id}` - Product details
- `GET /api/v1/categories` - List categories

### 3. Shopping Cart ✅
- View cart items
- Update quantities, remove items
- Real-time total calculation
- Session persistence
- Cart indicator in navigation

**State Management**:
- Cart stored in HTTP session
- Cart synced with platform via API
- Session expires after 20 minutes

**API Integration**:
- `POST /api/v1/cart/items` - Add item
- `PUT /api/v1/cart/items/{id}` - Update quantity
- `DELETE /api/v1/cart/items/{id}` - Remove item
- `GET /api/v1/cart` - Get current cart

### 4. Checkout Flow ✅ (Fake Payment)
- Customer information form
- Shipping address form
- Fake payment button
- Order summary and confirmation

**Fake Payment Flow**:
1. User fills checkout form
2. Clicks "Pay Now"
3. Order created with status "Pending"
4. Immediately updated to "Paid"
5. Fake tracking number generated
6. Confirmation page shown

**API Integration**:
- `POST /api/v1/orders` - Create order
- `PUT /api/v1/orders/{id}/status` - Update to "Paid"

### 5. Product Search ✅
- Search bar in navigation
- Search results page
- Search by product name/description
- Category filter on results

## API Client Implementation

### ECommApiClient Service

Wraps all HTTP communication with the platform.

**Key Methods**:
```csharp
// Products
Task<List<ProductDto>> GetProductsAsync(string? categoryId, string? search, int page, int pageSize);
Task<ProductDto?> GetProductByIdAsync(string productId);

// Categories
Task<List<CategoryDto>> GetCategoriesAsync();

// Cart
Task<CartDto?> GetCartAsync(string sessionId);
Task<CartItemDto> AddCartItemAsync(string sessionId, AddCartItemRequest request);
Task<CartItemDto> UpdateCartItemAsync(string sessionId, string itemId, int quantity);
Task DeleteCartItemAsync(string sessionId, string itemId);

// Orders
Task<OrderDto> CreateOrderAsync(CreateOrderRequest request);
Task<OrderDto> UpdateOrderStatusAsync(string orderId, string status, string? notes);
```

**Authentication**:
- All requests include `X-API-Key` header
- All requests include `X-Tenant-ID` header
- All requests include `X-Market-ID` header

**Error Handling**:
- Retry logic for transient failures (3 retries)
- Timeout handling (30 seconds default)
- Graceful degradation
- User-friendly error messages

## Data Models

### DTOs (Data Transfer Objects)

DTOs match the platform API contracts:

**ProductDto**:
```csharp
public class ProductDto
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public string CategoryId { get; set; }
    public string Status { get; set; } = "active";
    public int StockQuantity { get; set; }
}
```

**CartDto**:
```csharp
public class CartDto
{
    public string Id { get; set; }
    public List<CartItemDto> Items { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
}
```

### ViewModels

Adapt DTOs for view rendering:

**ProductListViewModel**:
```csharp
public class ProductListViewModel
{
    public List<ProductDto> Products { get; set; }
    public List<CategoryDto> Categories { get; set; }
    public string? SelectedCategoryId { get; set; }
    public string? SearchQuery { get; set; }
    public int CurrentPage { get; set; }
    public int TotalPages { get; set; }
}
```

## Running the Application

### Prerequisites
- .NET 9.0 SDK or later
- .NET Mock API running (http://localhost:5180)

### Development Setup

1. **Start .NET Mock API**:
   ```bash
   cd mock-api/MockApi
   dotnet run
   # Runs at http://localhost:5180
   ```

2. **Configure API Settings**:
   Verify `appsettings.Development.json`:
   ```json
   {
     "ECommPlatform": {
       "BaseUrl": "http://localhost:5180/api/v1"
     }
   }
   ```

3. **Run the Showcase**:
   ```bash
   cd showcase-dotnet/ECommShowcase.Web
   dotnet run
   # Or with watch mode:
   dotnet watch run
   # Opens at http://localhost:5025
   ```

### Available Routes

**Public Routes**:
- `/` - Home page with featured products
- `/products` - Product listing
- `/products/{id}` - Product detail page
- `/products/search?q={query}` - Search results
- `/cart` - Shopping cart
- `/checkout` - Checkout form
- `/checkout/confirmation/{orderId}` - Order confirmation

## Integration with Platform

### API Contract Alignment

Built against platform API contracts. Changes to platform APIs require corresponding updates here.

**Contract Source**: See [../specs/](../specs/) in main eComm repository.

### .NET Mock API Integration

The showcase works with the .NET Mock API:

- **Mock API**: `http://localhost:5180/api/v1`
- In-memory data store (seed data in MockDataStore.cs)
- No real data persistence
- Suitable for development and demos

**Future Real Backend**:
- Update `BaseUrl` in appsettings.json
- Requires valid API key from platform
- Full data persistence

### Authentication Flow

**API Key Authentication**:
1. API key configured in `appsettings.json`
2. All requests include `X-API-Key` header automatically
3. Platform validates and scopes requests to market

### Session Management

**Cart Session**:
- Session ID stored in HTTP session
- Cart tied to session on platform side
- Session expires after 20 minutes of inactivity
- On expiry, cart is cleared

## Development Guidelines

### Adding New Features

1. **Define API contract** in main platform project
2. **Update ECommApiClient** with new methods
3. **Create DTOs** matching API response
4. **Build controller** with business logic
5. **Create views** for UI
6. **Test integration** with platform

### Styling Guidelines

- Use Bootstrap 5 utilities for layout
- Keep custom CSS minimal
- Mobile-first responsive design
- Follow eCommerce UX best practices

### Error Handling

**User-Facing Errors**:
- Product not found → 404 page
- API timeout → "Service unavailable" message
- Cart operation fails → Error toast, retry

**Logging**:
- Log all API errors to console
- Include request/response details
- Use structured logging (Serilog for production)

## Fake Flows Implementation

### Fake Payment

**Flow**:
1. Checkout form submitted
2. Order created with status "Pending"
3. Simulate 1-second processing delay
4. Update order status to "Paid"
5. Generate fake tracking: `TRACK-{orderId.Substring(0,8)}`
6. Redirect to confirmation page

**Code**: `CheckoutController.CompleteCheckout()`

### Fake Shipping

- All orders auto-assigned fake tracking number
- Shipping status always "Processing"
- No actual shipping provider integration

## Deployment

### Hosting Options

1. **Azure App Service**
2. **IIS (On-Premises)**
3. **Docker**

### Production Checklist

- [ ] Update `appsettings.Production.json` with production API URL
- [ ] Use production API key
- [ ] Enable HTTPS
- [ ] Configure session state for scalability (Redis/SQL Server)
- [ ] Set up Application Insights or logging
- [ ] Test all flows end-to-end
- [ ] Load test checkout flow

## Testing Strategy

### Manual Testing
- Navigate all pages
- Add/update/remove cart items
- Complete checkout flow
- Test search functionality
- Verify responsive design

### Automated Testing (Future)
- Unit tests for services
- Integration tests for controllers
- UI tests with Playwright

## Troubleshooting

### Common Issues

**Cannot connect to platform APIs**:
- Verify .NET Mock API running at http://localhost:5180
- Check `ECommPlatform:BaseUrl` in appsettings.json
- Ensure firewall allows localhost connections

**Cart not persisting**:
- Verify session state configured in `Program.cs`
- Check session cookie is being set
- Clear browser cookies and retry

**Products not loading**:
- Check API key is valid
- Verify tenant/market IDs match Mock API seed data
- Check Mock API seed data includes products for the market

**Checkout fails**:
- Ensure cart is not empty
- Verify order creation API is working
- Check form validation is passing

## Future Enhancements

### Planned Features
- User authentication (login/register)
- Order history for logged-in users
- Product reviews and ratings
- Wishlist functionality
- Product filtering (price, rating)
- Related products recommendations
- Email notifications
- Real payment gateway (Stripe/PayPal)

### Platform Integration Enhancements
- Webhook listener for order status updates
- Inventory availability check before checkout
- Real-time stock updates
- Product recommendations API
- Customer data synchronization

## Related Documentation

- [Platform Documentation](../CLAUDE.md)
- [API Specifications](../specs/)
- [Mock API Guide](../mock-api/CLAUDE.md)
- [Frontend Guide](../frontend/CLAUDE.md)

## Version History

- **v1.0** (2025-11-03): Initial showcase implementation
  - Home page with featured products
  - Product listing and detail pages
  - Shopping cart functionality
  - Checkout flow with fake payment
  - Product search
  - API client integration

---

**Last Updated**: 2025-11-04
**Status**: Active Development - Reference Implementation
**Platform Version**: Compatible with eComm Platform v2.0+
