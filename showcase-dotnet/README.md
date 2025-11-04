# eCommerce Showcase Website

A reference implementation of a customer-facing eCommerce storefront built with ASP.NET Core MVC that demonstrates integration with the eCommerce SaaS Platform.

## Quick Start

### Prerequisites
- .NET 9.0 SDK or later
- eCommerce SaaS Platform running at `http://localhost:5176` (with mock APIs)

### Running the Application

1. **Start the Platform Backend First**:
   ```bash
   cd ../frontend
   npm run dev
   # Platform runs at http://localhost:5176
   ```

2. **Run the Showcase**:
   ```bash
   cd ECommShowcase.Web
   dotnet run
   # Or with hot reload:
   dotnet watch run
   ```

3. **Open your browser**:
   - Navigate to `https://localhost:5001`
   - Browse products, add to cart, and complete checkout

## Features

- **Home Page**: Featured products and category navigation
- **Product Catalog**: Browse products with pagination and category filtering
- **Product Detail**: View detailed product information
- **Search**: Find products by name or description
- **Shopping Cart**: Add, update, and remove items
- **Checkout**: Complete purchase with fake payment processing
- **Order Confirmation**: View order details and tracking number

## Project Structure

```
/ECommShowcase.Web/
  /Controllers/         # MVC controllers
  /Models/
    /DTOs/             # API data transfer objects
    /ViewModels/       # View-specific models
    /Configuration/    # Settings classes
  /Services/           # API client and business logic
  /Views/              # Razor views
  /wwwroot/            # Static assets (CSS, JS, images)
  appsettings.json     # Configuration
  Program.cs           # Application startup
```

## Configuration

Edit `appsettings.json` to configure API connection:

```json
{
  "ECommPlatform": {
    "BaseUrl": "http://localhost:5176/api/v1",
    "ApiKey": "sk_live_demo_key_12345",
    "TenantId": "demo-tenant",
    "MarketId": "market-1"
  }
}
```

## Fake Flows

### Fake Payment
When you click "Pay Now" in checkout:
1. Order is created with status "Pending"
2. 1-second delay simulates payment processing
3. Order status automatically updated to "Paid"
4. Fake tracking number generated
5. Redirects to confirmation page

### Fake Shipping
- All orders receive a tracking number: `TRACK-{orderId}`
- Shipping status is always "Processing"
- No actual shipping provider integration

## Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive project documentation, including:
- Architecture and design decisions
- API integration patterns
- Development guidelines
- Deployment instructions
- Future enhancements

## Next Steps

Once validated, this project should be moved to a separate repository for:
- Independent version control
- Separate deployment pipeline
- Client/partner access as reference implementation

## Related Projects

- **eCommerce SaaS Platform**: `../` (main platform repository)
- **Platform API Specs**: `../specs/` (feature specifications)

## License

[To be determined]
