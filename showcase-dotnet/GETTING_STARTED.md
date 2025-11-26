# Getting Started with eCommerce Showcase Website

This guide will help you get the showcase website up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **.NET 9.0 SDK** or later ([Download](https://dotnet.microsoft.com/download))
- **Node.js** and **npm** (for running the platform backend)
- **Git** (optional, for version control)
- A code editor like **Visual Studio**, **VS Code**, or **Rider**

## Quick Start (5 Minutes)

### Step 1: Start the Platform Backend

The showcase website needs the eCommerce SaaS Platform APIs to be running. Navigate to the platform frontend and start the dev server:

```bash
# From the eComm repository root
cd frontend
npm install  # First time only
npm run dev
```

The admin panel will start at `http://localhost:5173`.

### Step 2: Run the Showcase Website

Open a new terminal and navigate to the showcase project:

```bash
# From the eComm repository root
cd showcase-dotnet/ECommShowcase.Web
dotnet run
```

Or for hot reload during development:

```bash
dotnet watch run
```

The showcase website will start at:
- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000`

### Step 3: Browse the Website

Open your browser and navigate to `https://localhost:5001`. You should see:

1. **Home Page**: Featured products and categories
2. **Products Page**: Browse all products with filtering
3. **Product Details**: Click any product to see details
4. **Shopping Cart**: Add items to cart
5. **Checkout**: Complete fake payment flow
6. **Order Confirmation**: View order details with tracking number

## Configuration

### API Connection Settings

Edit `appsettings.json` to configure the platform API connection:

```json
{
  "ECommPlatform": {
    "BaseUrl": "http://localhost:5176/api/v1",
    "ApiKey": "sk_live_demo_key_12345",
    "TenantId": "demo-tenant",
    "MarketId": "market-1",
    "Timeout": 30
  }
}
```

**What these settings mean:**

- **BaseUrl**: The URL where the platform APIs are running
- **ApiKey**: Authentication key for API access (demo key for development)
- **TenantId**: Which tenant's data to access (demo-tenant has sample products)
- **MarketId**: Which market within the tenant (market-1 is the main demo market)
- **Timeout**: HTTP request timeout in seconds

### Showcase Settings

Customize the storefront appearance:

```json
{
  "Showcase": {
    "StoreName": "Demo Shop",
    "Currency": "USD",
    "CurrencySymbol": "$",
    "FeaturedProductCount": 8,
    "ProductsPerPage": 12
  }
}
```

## Features Tour

### 1. Home Page (`/`)

**What you'll see:**
- Hero section with "Shop Now" call-to-action
- Category navigation cards
- Featured products grid (8 products)
- Trust badges (Free Shipping, Secure Payment, Easy Returns)

**Try this:**
- Click "Add to Cart" on any product
- Click a category to filter products
- Click "Shop Now" or "View All" to see all products

### 2. Products Page (`/products`)

**What you'll see:**
- Sidebar with category filters
- Product grid (12 products per page)
- Pagination (if more than 12 products)
- Stock status badges

**Try this:**
- Filter by category
- Use search bar in navigation
- Add products to cart from the list
- Click product to view details

### 3. Product Details (`/products/{id}`)

**What you'll see:**
- Large product image
- Price and stock status
- Full product description
- Product information (SKU, status)
- Quantity selector and "Add to Cart" button
- Breadcrumb navigation

**Try this:**
- Change quantity before adding to cart
- View different products
- Use breadcrumbs to navigate back

### 4. Shopping Cart (`/cart`)

**What you'll see:**
- Cart items table with images
- Quantity update controls
- Remove item buttons
- Order summary (subtotal, tax, total)
- "Proceed to Checkout" button

**Try this:**
- Update item quantities
- Remove items
- Notice cart count badge in navigation updates
- Proceed to checkout when ready

### 5. Checkout (`/checkout`)

**What you'll see:**
- Customer information form
- Shipping address form
- Fake payment notice
- Order summary sidebar
- Form validation

**Try this:**
- Fill out the form (all fields marked with * are required)
- Leave a field empty and submit to see validation
- Complete the form and click "Place Order"
- Payment will be simulated (no real transaction)

### 6. Order Confirmation (`/checkout/confirmation/{orderId}`)

**What you'll see:**
- Success message with checkmark
- Order number and tracking number
- Customer and shipping information
- Order items table with totals
- Order status badge ("PAID")

**Try this:**
- Take note of the order number
- Print the page (notice clean print layout)
- Click "Continue Shopping" to shop more
- Notice cart has been cleared

## Testing Fake Payment Flow

The checkout uses a simulated payment system:

1. **Fill out checkout form** with any valid information
2. **Click "Place Order"**
3. **Order is created** with status "Pending"
4. **1-second delay** simulates payment processing
5. **Order status updated** to "Paid" automatically
6. **Tracking number generated**: `TRACK-{orderId}`
7. **Redirect to confirmation** page

**No real payment is processed!** This is for demonstration purposes only.

## Development Tips

### Hot Reload

Use `dotnet watch run` for automatic recompilation when you change code:

```bash
cd ECommShowcase.Web
dotnet watch run
```

Changes to `.cs` files will trigger recompilation. Changes to `.cshtml` views will refresh automatically.

### Debugging

**Visual Studio:**
1. Open `ECommShowcase.sln`
2. Press F5 to start debugging
3. Set breakpoints in controllers

**VS Code:**
1. Open the `showcase-dotnet` folder
2. Install C# Dev Kit extension
3. Press F5 to start debugging

**Rider:**
1. Open `ECommShowcase.sln`
2. Press F5 to start debugging

### Viewing Logs

Application logs appear in the console. You'll see:
- HTTP requests and responses
- API calls to platform
- Errors and warnings

Example log output:
```
info: ECommShowcase.Web.Services.ECommApiClient[0]
      Fetching products: page=1, pageSize=8
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET https://localhost:5001/
```

## Common Issues

### Issue: "Cannot connect to API"

**Symptom:** Products don't load, cart operations fail

**Solution:**
1. Verify platform backend is running at `http://localhost:5176`
2. Check `appsettings.json` has correct `BaseUrl`
3. Test platform API directly: `http://localhost:5176/api/v1/products`

### Issue: "Port already in use"

**Symptom:** Error when starting: "Failed to bind to address https://localhost:5001"

**Solution:**
1. Stop other applications using port 5001
2. Or change port in `Properties/launchSettings.json`:
   ```json
   "applicationUrl": "https://localhost:5002;http://localhost:5003"
   ```

### Issue: "Products have no images"

**Symptom:** Placeholder images shown for all products

**Solution:** This is expected! The mock data doesn't include real product images. Placeholder images are generated automatically with the product name.

### Issue: "Cart count not updating"

**Symptom:** Badge in navigation doesn't show item count

**Solution:**
1. Check browser console for JavaScript errors
2. Verify jQuery is loaded (view page source)
3. Hard refresh the page (Ctrl+F5)

## Next Steps

### Customize the Storefront

1. **Change branding:**
   - Edit `appsettings.json` → `Showcase.StoreName`
   - Update `_Layout.cshtml` navbar brand

2. **Add real product images:**
   - Update mock data in platform to include `ImageUrl` values
   - Or modify views to use different placeholder service

3. **Change color scheme:**
   - Edit `wwwroot/css/site.css`
   - Bootstrap primary color can be customized with CSS variables

### Connect to Real Backend

When the .NET backend is ready:

1. Update `appsettings.json`:
   ```json
   {
     "ECommPlatform": {
       "BaseUrl": "https://your-backend-api.com/api/v1",
       "ApiKey": "your-real-api-key"
     }
   }
   ```

2. Obtain API key from platform admin UI

3. Test all flows against real backend

### Deploy to Production

See [CLAUDE.md](./CLAUDE.md) for deployment instructions:
- Azure App Service
- IIS (On-Premises)
- Docker containers

## Learning Resources

- **ASP.NET Core MVC Tutorial**: https://learn.microsoft.com/aspnet/core/tutorials/first-mvc-app/
- **Bootstrap 5 Documentation**: https://getbootstrap.com/docs/5.3/
- **Project Documentation**: See [CLAUDE.md](./CLAUDE.md) for full technical details
- **Platform Documentation**: See `../CLAUDE.md` for platform API documentation

## Getting Help

If you encounter issues:

1. **Check the logs** in the console for error messages
2. **Verify platform is running** at `http://localhost:5176`
3. **Review CLAUDE.md** for detailed technical information
4. **Check appsettings.json** for correct configuration

## What's Next?

You now have a fully functional eCommerce showcase website! Here are some ideas:

- **Add more products** in the platform backend
- **Customize the design** to match your brand
- **Add user authentication** for order history
- **Integrate real payment** gateway (Stripe, PayPal)
- **Deploy to production** for live demonstrations

Happy coding! 🚀
