# eCommerce Showcase Website - Project Guide

## Project Overview

This is a reference implementation of a customer-facing eCommerce storefront built with ASP.NET Core MVC. It demonstrates how to integrate with the eCommerce SaaS Platform APIs to create a functional online shop.

**Purpose**:
- Showcase the eCommerce SaaS platform capabilities
- Provide a reference implementation for clients integrating the platform
- Serve as living documentation for API integration patterns
- Act as a starter template for new storefront projects

## Technology Stack

- **Framework**: ASP.NET Core 9.0 MVC
- **Language**: C# 12
- **View Engine**: Razor Pages
- **HTTP Client**: HttpClient with IHttpClientFactory
- **Session Management**: In-memory session state
- **Styling**: Bootstrap 5 (included in template)
- **JavaScript**: Vanilla JS for cart interactions

## Architecture

### Integration Pattern

This showcase website acts as a **client application** that consumes the eCommerce SaaS Platform APIs:

```
[Showcase Website (ASP.NET MVC)]
         |
         | HTTP/REST
         v
[eCommerce SaaS Platform APIs]
         |
         v
[Platform Database]
```

**Key Integration Points**:
- API Client service layer for all platform communication
- API Key authentication (per market)
- Session-based shopping cart state
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
    /ViewModels/
      HomeViewModel.cs
      ProductListViewModel.cs
      ProductDetailViewModel.cs
      CartViewModel.cs
      CheckoutViewModel.cs
    /DTOs/                      # Match platform API contracts
      ProductDto.cs
      CategoryDto.cs
      CartDto.cs
      OrderDto.cs
  /Views/
    /Home/
      Index.cshtml              # Home page
    /Products/
      Index.cshtml              # Product listing
      Details.cshtml            # Product detail
    /Cart/
      Index.cshtml              # Shopping cart
    /Checkout/
      Index.cshtml              # Checkout form
      Confirmation.cshtml       # Order confirmation
    /Shared/
      _Layout.cshtml            # Main layout with nav
      _ProductCard.cshtml       # Reusable product card
  /wwwroot/
    /css/
    /js/
      cart.js                   # Cart interactions
  appsettings.json              # Configuration
  Program.cs                    # Application startup
```

## Configuration

### appsettings.json

```json
{
  "ECommPlatform": {
    "BaseUrl": "http://localhost:5176/api/v1",
    "ApiKey": "sk_live_demo_key_12345",
    "TenantId": "demo-tenant",
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

### 1. Home Page
**Status**: Implemented

**Features**:
- Hero section with store branding
- Featured/latest products grid
- Category navigation
- Search bar

**Controller**: `HomeController`
**View**: `Views/Home/Index.cshtml`

### 2. Product Catalog
**Status**: Implemented

**Features**:
- Product listing with pagination
- Category filtering
- Product search
- Product cards with image, name, price
- "Add to Cart" quick action

**Controller**: `ProductsController`
**Views**:
- `Views/Products/Index.cshtml` (listing)
- `Views/Products/Details.cshtml` (detail page)

**API Integration**:
- `GET /api/v1/products` - List products
- `GET /api/v1/products/{id}` - Get product details
- `GET /api/v1/categories` - List categories

### 3. Shopping Cart
**Status**: Implemented

**Features**:
- View cart items
- Update quantities
- Remove items
- Real-time total calculation
- Session persistence
- Cart indicator in navigation (item count)

**Controller**: `CartController`
**Service**: `CartService`
**View**: `Views/Cart/Index.cshtml`

**State Management**:
- Cart stored in HTTP session
- Cart synced with platform via API
- Session expires after 20 minutes of inactivity

**API Integration**:
- `POST /api/v1/cart/items` - Add item
- `PUT /api/v1/cart/items/{id}` - Update quantity
- `DELETE /api/v1/cart/items/{id}` - Remove item
- `GET /api/v1/cart` - Get current cart

### 4. Checkout Flow
**Status**: Implemented (Fake Payment)

**Features**:
- Customer information form (name, email, phone)
- Shipping address form
- Fake payment button
- Order summary
- Order confirmation page

**Controller**: `CheckoutController`
**Views**:
- `Views/Checkout/Index.cshtml` (form)
- `Views/Checkout/Confirmation.cshtml` (success)

**Fake Payment Flow**:
1. User fills out checkout form
2. Clicks "Pay Now" button
3. Order created via API with status "Pending"
4. Immediately updated to "Paid" status
5. Fake tracking number generated
6. Confirmation page shown with order details

**API Integration**:
- `POST /api/v1/orders` - Create order
- `PUT /api/v1/orders/{id}/status` - Update to "Paid"

### 5. Product Search
**Status**: Implemented

**Features**:
- Search bar in navigation
- Search results page
- Search by product name/description
- Category filter on search results

**Controller**: `ProductsController.Search()`
**View**: `Views/Products/Index.cshtml` (reused)

**API Integration**:
- `GET /api/v1/products?search={query}` - Search products

## API Client Implementation

### ECommApiClient Service

The `ECommApiClient` is a service that wraps all HTTP communication with the platform:

**Key Methods**:
```csharp
// Products
Task<List<ProductDto>> GetProductsAsync(string? categoryId = null, string? search = null, int page = 1, int pageSize = 12);
Task<ProductDto?> GetProductByIdAsync(string productId);

// Categories
Task<List<CategoryDto>> GetCategoriesAsync();
Task<CategoryDto?> GetCategoryByIdAsync(string categoryId);

// Cart
Task<CartDto?> GetCartAsync(string sessionId);
Task<CartItemDto> AddCartItemAsync(string sessionId, AddCartItemRequest request);
Task<CartItemDto> UpdateCartItemAsync(string sessionId, string itemId, int quantity);
Task DeleteCartItemAsync(string sessionId, string itemId);

// Orders
Task<OrderDto> CreateOrderAsync(CreateOrderRequest request);
Task<OrderDto> UpdateOrderStatusAsync(string orderId, string status, string? notes = null);
```

**Authentication**:
- All requests include `X-API-Key` header
- All requests include `X-Tenant-ID` header
- All requests include `X-Market-ID` header

**Error Handling**:
- Retry logic for transient failures (3 retries)
- Timeout handling (30 seconds default)
- Graceful degradation (show cached data if available)
- User-friendly error messages

## Data Models

### DTOs (Data Transfer Objects)

DTOs match the platform API contracts exactly:

**ProductDto**:
```csharp
public class ProductDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public string CategoryId { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public int StockQuantity { get; set; }
}
```

**CartDto**:
```csharp
public class CartDto
{
    public string Id { get; set; } = string.Empty;
    public List<CartItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
}
```

**OrderDto**:
```csharp
public class OrderDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public decimal Total { get; set; }
    public CustomerInfoDto Customer { get; set; } = new();
    public List<OrderItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
```

### ViewModels

ViewModels adapt DTOs for view rendering:

**ProductListViewModel**:
```csharp
public class ProductListViewModel
{
    public List<ProductDto> Products { get; set; } = new();
    public List<CategoryDto> Categories { get; set; } = new();
    public string? SelectedCategoryId { get; set; }
    public string? SearchQuery { get; set; }
    public int CurrentPage { get; set; }
    public int TotalPages { get; set; }
}
```

**CartViewModel**:
```csharp
public class CartViewModel
{
    public CartDto Cart { get; set; } = new();
    public string CurrencySymbol { get; set; } = "$";
    public bool IsEmpty => Cart.Items.Count == 0;
}
```

## Running the Application

### Prerequisites
- .NET 9.0 SDK or later
- eCommerce SaaS Platform running (with mock APIs)

### Development Setup

1. **Start the Platform Backend** (if available):
   ```bash
   # From eComm/frontend directory
   npm run dev
   # Platform runs at http://localhost:5176
   ```

2. **Configure API Settings**:
   Edit `appsettings.Development.json`:
   ```json
   {
     "ECommPlatform": {
       "BaseUrl": "http://localhost:5176/api/v1"
     }
   }
   ```

3. **Run the Showcase**:
   ```bash
   cd showcase-dotnet/ECommShowcase.Web
   dotnet run
   # Or with watch mode:
   dotnet watch run
   # Opens at https://localhost:5001
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

This showcase is built against the platform's API contracts defined in the main eComm project. Any changes to the platform APIs require corresponding updates here.

**Contract Source**: See `/specs/` in main eComm repository for API specifications.

### Mock vs Real Backend

The showcase works with both:

1. **Mock APIs** (MSW in platform frontend):
   - Uses `http://localhost:5176/api/v1`
   - Suitable for development and demos
   - No real data persistence

2. **Real Backend** (future .NET backend):
   - Update `BaseUrl` in appsettings.json
   - Requires valid API key from platform
   - Full data persistence

### Authentication Flow

**API Key Authentication**:
1. Obtain API key from platform (Admin UI → Markets → API Keys)
2. Configure API key in `appsettings.json`
3. All requests include `X-API-Key` header automatically
4. Platform validates and scopes requests to the market

### Session Management

**Cart Session**:
- Session ID stored in HTTP session
- Cart tied to session on platform side
- Session expires after 20 minutes of inactivity
- On expiry, cart is cleared (could be persisted for registered users)

## Development Guidelines

### Adding New Features

1. **Define API contract** in main platform project first
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
- Product not found → Show 404 page
- API timeout → Show "Service unavailable" message
- Cart operation fails → Show error toast, retry

**Logging**:
- Log all API errors to console
- Include request/response details
- Use structured logging (Serilog recommended for production)

## Fake Flows Implementation

### Fake Payment

**Flow**:
1. Checkout form submitted
2. Order created with status "Pending"
3. Simulate 1-second payment processing delay
4. Update order status to "Paid"
5. Generate fake tracking number: `TRACK-{orderId.Substring(0,8)}`
6. Redirect to confirmation page

**Code Location**: `CheckoutController.CompleteCheckout()`

### Fake Shipping

**Flow**:
- All orders auto-assigned fake tracking number
- Shipping status always "Processing"
- No actual shipping provider integration

**Future Enhancement**: Add admin webhook to simulate shipping updates.

## Deployment

### Hosting Options

1. **Azure App Service**:
   - Deploy directly from Visual Studio
   - Configure app settings for production API URL
   - Enable Application Insights for monitoring

2. **IIS (On-Premises)**:
   - Publish to folder
   - Configure IIS site
   - Set environment variables for configuration

3. **Docker**:
   - Add Dockerfile (standard ASP.NET Core)
   - Build and deploy container
   - Configure via environment variables

### Production Checklist

- [ ] Update `appsettings.Production.json` with production API URL
- [ ] Use production API key (not demo key)
- [ ] Enable HTTPS
- [ ] Configure session state for scalability (Redis/SQL Server)
- [ ] Set up Application Insights or logging
- [ ] Configure CORS if needed
- [ ] Test all flows end-to-end
- [ ] Load test checkout flow

## Testing Strategy

### Manual Testing
- Navigate all pages
- Add/update/remove cart items
- Complete checkout flow
- Test search functionality
- Verify responsive design (mobile, tablet, desktop)

### Automated Testing (Future)
- Unit tests for services (ECommApiClient, CartService)
- Integration tests for controllers
- UI tests with Playwright/Selenium

## Troubleshooting

### Common Issues

**Cannot connect to platform APIs**:
- Verify platform is running at configured URL
- Check `ECommPlatform:BaseUrl` in appsettings.json
- Ensure firewall allows localhost connections
- Check browser console for CORS errors

**Cart not persisting**:
- Verify session state is configured in `Program.cs`
- Check session cookie is being set
- Clear browser cookies and retry

**Products not loading**:
- Check API key is valid
- Verify tenant/market IDs are correct
- Check platform mock data includes products for the market

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
- Product filtering (price, rating, etc.)
- Related products recommendations
- Email notifications (order confirmation)
- Real payment gateway integration (Stripe/PayPal)

### Platform Integration Enhancements
- Webhook listener for order status updates
- Inventory availability check before checkout
- Real-time stock updates
- Product recommendations API
- Customer data synchronization

## Migration to Separate Repository

When moving this project to its own repository:

1. **Copy entire `showcase-dotnet` folder**
2. **Initialize new git repository**:
   ```bash
   cd showcase-dotnet
   git init
   git add .
   git commit -m "Initial commit: eCommerce showcase website"
   ```
3. **Update documentation**:
   - Update README.md with repo-specific info
   - Add LICENSE file
   - Add CONTRIBUTING.md if open-sourcing
4. **Configure CI/CD**:
   - GitHub Actions for build/test
   - Deployment workflows
5. **Update references**:
   - Update links to platform documentation
   - Reference main platform repo for API specs

## Related Documentation

- **Platform Documentation**: See `../CLAUDE.md` (main eComm project)
- **API Specifications**: See `../specs/` (feature specs in main project)
- **ASP.NET Core Docs**: https://learn.microsoft.com/aspnet/core/

## Version History

- **v1.0** (2025-11-03): Initial showcase implementation
  - Home page with featured products
  - Product listing and detail pages
  - Shopping cart functionality
  - Checkout flow with fake payment
  - Product search
  - API client integration

---

**Last Updated**: 2025-11-03
**Status**: Active Development - Reference Implementation
**Platform Version**: Compatible with eComm Platform v1.4+
