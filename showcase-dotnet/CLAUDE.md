# Showcase Website - Customer Storefront Guide

## Overview

ASP.NET Core MVC demo storefront showing how to integrate with the eCommerce SaaS Platform APIs.

**Port**: http://localhost:5025

## Purpose

- Showcase platform capabilities
- Reference implementation for client integrations
- Starter template for new storefronts
- Living API integration documentation

## Tech Stack

- ASP.NET Core 9.0 MVC + C# 12
- Razor Pages (views)
- HttpClient with IHttpClientFactory
- In-memory session for cart
- Bootstrap 5 (styling)
- Vanilla JS for cart interactions

## Quick Start

```bash
dotnet run
# http://localhost:5025
```

**Config** (appsettings.json):
```json
{
  "ECommPlatform": {
    "BaseUrl": "http://localhost:5180/api/v1",
    "ApiKey": "sk_live_demo_key_12345",
    "TenantId": "tenant-a",
    "MarketId": "market-1"
  }
}
```

## Project Structure

```
/ECommShowcase.Web/
  /Controllers/
    HomeController.cs          # Home page, featured products
    ProductsController.cs      # Product listing, details, search
    CartController.cs          # Shopping cart operations
    CheckoutController.cs      # Checkout flow, fake payment

  /Services/
    IECommApiClient.cs         # API client interface
    ECommApiClient.cs          # HTTP client implementation
    ICartService.cs            # Cart business logic interface
    CartService.cs             # Cart management service

  /Models/
    /ViewModels/               # View-specific models
    /DTOs/                     # Match platform API contracts

  /Views/
    /Home/, /Products/, /Cart/, /Checkout/
    /Shared/
      _Layout.cshtml           # Main layout with nav
      _ProductCard.cshtml      # Reusable product card

  /wwwroot/
    /css/, /js/cart.js

  appsettings.json
  Program.cs
```

## Integration Pattern

```
[Showcase Website (ASP.NET MVC)]
         |
         | HTTP/REST + API Key
         v
[.NET Mock API :5180]
         |
         v
[In-Memory Data Store]
```

## Key Services

### API Client
```csharp
// Services/ECommApiClient.cs
public class ECommApiClient : IECommApiClient
{
    private readonly HttpClient _httpClient;

    public async Task<IEnumerable<Product>> GetProducts()
    {
        var response = await _httpClient.GetAsync("products");
        return await response.Content.ReadFromJsonAsync<IEnumerable<Product>>();
    }
}
```

### Cart Service
```csharp
// Services/CartService.cs
public class CartService : ICartService
{
    private readonly IECommApiClient _apiClient;
    private readonly IHttpContextAccessor _httpContextAccessor;

    // Uses session to persist cart ID
    // Syncs with backend API
}
```

## Configuration

**Program.cs**:
```csharp
// Add HttpClient with API key
builder.Services.AddHttpClient<IECommApiClient, ECommApiClient>((sp, client) =>
{
    var settings = sp.GetRequiredService<IOptions<ECommPlatformSettings>>().Value;
    client.BaseAddress = new Uri(settings.BaseUrl);
    client.DefaultRequestHeaders.Add("X-API-Key", settings.ApiKey);
    client.DefaultRequestHeaders.Add("X-Tenant-ID", settings.TenantId);
    client.DefaultRequestHeaders.Add("X-Market-ID", settings.MarketId);
});

// Add session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});
```

## Routes

- `/` - Home with featured products
- `/products` - Product catalog with search
- `/products/{id}` - Product details
- `/cart` - Shopping cart
- `/checkout` - Fake checkout (auto-pays)
- `/checkout/confirmation` - Order confirmation

## Features

✅ Product browsing and search
✅ Product details page
✅ Add to cart
✅ Cart management (update quantities, remove items)
✅ Session-based cart persistence
✅ Fake checkout flow (auto-pays on submit)
✅ Order confirmation

❌ Real payment processing
❌ User accounts
❌ Order tracking

## Common Tasks

### Add Product Field
1. Update DTO models to match API
2. Update views to display field
3. No backend changes (API drives schema)

### Modify Checkout Flow
1. Update CheckoutController steps
2. Update views in /Views/Checkout/
3. Update cart.js if needed

### Change Styling
1. Edit /wwwroot/css/ files
2. Update _Layout.cshtml
3. Modify Bootstrap classes in views

### Add API Endpoint
1. Add method to IECommApiClient
2. Implement in ECommApiClient
3. Use in controllers

## Session Management

**Cart ID stored in session**:
```csharp
var cartId = HttpContext.Session.GetString("CartId");
if (string.IsNullOrEmpty(cartId))
{
    cartId = Guid.NewGuid().ToString();
    HttpContext.Session.SetString("CartId", cartId);
}
```

## Important Notes

- **API Key authentication**: Market-scoped key in header
- **Session-based cart**: Cart ID persists in session
- **Fake checkout**: Auto-submits and auto-pays orders
- **Mock API dependency**: Requires mock-api running on port 5180
- **No real payments**: Demo purposes only

## Troubleshooting

**No products showing**: Check mock-api is running on port 5180

**Cart not persisting**: Verify session is enabled in Program.cs

**API errors**: Check API key and base URL in appsettings.json

**Checkout not working**: Ensure cart has items and API is responding

## Next Steps

- Add user authentication
- Implement real payment gateway
- Add customer order tracking
- Improve error handling
- Add loading states

---

**For platform API details, see**: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
