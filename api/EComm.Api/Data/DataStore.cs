using EComm.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace EComm.Api.Data;

/// <summary>
/// EF Core-based data store with SQLite persistence.
/// Uses a DbContext factory to create scoped contexts per operation for thread safety.
/// </summary>
public class DataStore
{
    private static readonly DataStore _instance = new();
    public static DataStore Instance => _instance;

    private DbContextOptions<ECommDbContext>? _dbOptions;
    private readonly ConcurrentDictionary<string, Cart> _carts = new(); // Carts still in memory for now (can be migrated later)

    private DataStore()
    {
        // Options will be initialized by Program.cs via InitializeDatabase
    }

    /// <summary>
    /// Initialize the database options. Called from Program.cs during startup.
    /// </summary>
    public void InitializeDatabase(DbContextOptions<ECommDbContext> options)
    {
        _dbOptions = options;
    }

    /// <summary>
    /// Create a new scoped DbContext for each operation (thread-safe)
    /// </summary>
    private ECommDbContext CreateContext()
    {
        if (_dbOptions == null)
            throw new InvalidOperationException("Database not initialized. Call InitializeDatabase first.");
        return new ECommDbContext(_dbOptions);
    }

    // Products
    public List<Product> GetProducts()
    {
        using var context = CreateContext();
        return context.Products.AsNoTracking().Where(p => p.IsCurrentVersion).ToList();
    }

    public Product? GetProduct(string id)
    {
        using var context = CreateContext();
        return context.Products.AsNoTracking().FirstOrDefault(p => p.Id == id && p.IsCurrentVersion);
    }

    public void AddProduct(Product product)
    {
        using var context = CreateContext();
        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;

        // Initialize versioning fields
        product.Version = 1;
        product.IsCurrentVersion = true;
        product.VersionCreatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(product.VersionCreatedBy))
        {
            product.VersionCreatedBy = "system";
        }

        context.Products.Add(product);
        context.SaveChanges();
    }

    public void UpdateProduct(Product product, string userId = "system", string? changeNotes = null)
    {
        using var context = CreateContext();

        var existingProduct = context.Products.FirstOrDefault(p => p.Id == product.Id && p.IsCurrentVersion);
        if (existingProduct == null) return;

        // Preserve creation date
        var createdAt = existingProduct.CreatedAt;

        // Find the maximum version number for this product
        var maxVersion = context.Products
            .Where(p => p.Id == product.Id)
            .Max(p => p.Version);

        // Update existing product's IsCurrentVersion flag directly in DB
        existingProduct.IsCurrentVersion = false;
        context.SaveChanges();

        // Detach to avoid tracking conflicts when adding new version
        context.Entry(existingProduct).State = EntityState.Detached;

        // Create new version
        var newVersion = new Product
        {
            // Copy all fields from the updated product
            Id = product.Id,
            TenantId = product.TenantId,
            MarketId = product.MarketId,
            Name = product.Name,
            Description = product.Description,
            Sku = product.Sku,
            Price = product.Price,
            SalePrice = product.SalePrice,
            Status = product.Status,
            StockQuantity = product.StockQuantity,
            LowStockThreshold = product.LowStockThreshold,
            Currency = product.Currency,
            Images = product.Images ?? new List<string>(),
            CategoryIds = product.CategoryIds ?? new List<string>(),
            Metadata = product.Metadata,
            HasVariants = product.HasVariants,
            VariantOptions = product.VariantOptions,
            Variants = product.Variants,
            CustomProperties = product.CustomProperties,

            // Preserve original creation date
            CreatedAt = createdAt,
            UpdatedAt = DateTime.UtcNow,

            // Versioning fields - use max version + 1
            Version = maxVersion + 1,
            IsCurrentVersion = true,
            VersionCreatedAt = DateTime.UtcNow,
            VersionCreatedBy = userId,
            ChangeNotes = changeNotes
        };

        // Add new version to the database
        context.Products.Add(newVersion);
        context.SaveChanges();
    }

    public void DeleteProduct(string id)
    {
        using var context = CreateContext();
        // Delete ALL versions of the product
        var products = context.Products.Where(p => p.Id == id).ToList();
        if (products.Any())
        {
            context.Products.RemoveRange(products);
            context.SaveChanges();
        }
    }

    /// <summary>
    /// Get all versions of a product
    /// </summary>
    public List<Product> GetProductVersions(string productId)
    {
        using var context = CreateContext();
        return context.Products
            .AsNoTracking()
            .Where(p => p.Id == productId)
            .OrderByDescending(p => p.Version)
            .ToList();
    }

    /// <summary>
    /// Get a specific version of a product
    /// </summary>
    public Product? GetProductVersion(string productId, int version)
    {
        using var context = CreateContext();
        return context.Products.AsNoTracking().FirstOrDefault(p => p.Id == productId && p.Version == version);
    }

    /// <summary>
    /// Restore a previous version by swapping IsCurrentVersion flags
    /// </summary>
    public Product? RestoreProductVersion(string productId, int versionToRestore, string userId = "system")
    {
        using var context = CreateContext();

        var oldVersion = context.Products.FirstOrDefault(p => p.Id == productId && p.Version == versionToRestore);
        if (oldVersion == null) return null;

        var currentVersion = context.Products.FirstOrDefault(p => p.Id == productId && p.IsCurrentVersion);
        if (currentVersion == null) return null;

        // Swap current flags
        currentVersion.IsCurrentVersion = false;
        oldVersion.IsCurrentVersion = true;

        // Add restore note to the restored version
        var existingNotes = string.IsNullOrEmpty(oldVersion.ChangeNotes) ? "" : oldVersion.ChangeNotes + " | ";
        oldVersion.ChangeNotes = $"{existingNotes}Restored by {userId} at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}";

        context.SaveChanges();
        return oldVersion;
    }

    /// <summary>
    /// Update only stock quantity without creating a new version
    /// Used for automatic stock adjustments (e.g., from orders)
    /// </summary>
    public void UpdateProductStock(string productId, int newStockQuantity)
    {
        using var context = CreateContext();
        var currentProduct = context.Products.FirstOrDefault(p => p.Id == productId && p.IsCurrentVersion);
        if (currentProduct == null) return;

        // Update stock directly without creating new version
        currentProduct.StockQuantity = newStockQuantity;
        currentProduct.UpdatedAt = DateTime.UtcNow;
        context.SaveChanges();
    }

    /// <summary>
    /// Update variant stock quantity without creating a new version
    /// Used for automatic stock adjustments (e.g., from orders)
    /// </summary>
    public void UpdateVariantStock(string productId, string variantId, int quantityChange, bool decrease = true)
    {
        using var context = CreateContext();
        var currentProduct = context.Products.FirstOrDefault(p => p.Id == productId && p.IsCurrentVersion);
        if (currentProduct == null || currentProduct.Variants == null) return;

        var variant = currentProduct.Variants.FirstOrDefault(v => v.Id == variantId);
        if (variant == null) return;

        // Update variant stock
        if (decrease)
        {
            variant.StockQuantity = Math.Max(0, variant.StockQuantity - quantityChange);
        }
        else
        {
            variant.StockQuantity += quantityChange;
        }

        currentProduct.UpdatedAt = DateTime.UtcNow;

        // CRITICAL: Mark the Variants property as modified so EF Core saves the JSON changes
        // Without this, changes to the Variants collection are not persisted!
        context.Entry(currentProduct).Property(p => p.Variants).IsModified = true;

        context.SaveChanges();
    }

    // Categories
    public List<Category> GetCategories()
    {
        using var context = CreateContext();
        return context.Categories.AsNoTracking().ToList();
    }

    public Category? GetCategory(string id)
    {
        using var context = CreateContext();
        return context.Categories.AsNoTracking().FirstOrDefault(c => c.Id == id);
    }

    /// <summary>
    /// Get all descendant category IDs (including the category itself and all subcategories recursively)
    /// </summary>
    public List<string> GetCategoryWithDescendants(string categoryId)
    {
        using var context = CreateContext();
        var result = new List<string> { categoryId };
        var children = context.Categories.AsNoTracking().Where(c => c.ParentId == categoryId).ToList();

        foreach (var child in children)
        {
            result.AddRange(GetCategoryWithDescendants(child.Id));
        }

        return result;
    }

    public void AddCategory(Category category)
    {
        using var context = CreateContext();
        category.CreatedAt = DateTime.UtcNow;
        category.UpdatedAt = DateTime.UtcNow;
        context.Categories.Add(category);
        context.SaveChanges();
    }

    public void UpdateCategory(Category category)
    {
        using var context = CreateContext();
        var existing = context.Categories.FirstOrDefault(c => c.Id == category.Id);
        if (existing != null)
        {
            category.UpdatedAt = DateTime.UtcNow;
            context.Entry(existing).CurrentValues.SetValues(category);
            context.SaveChanges();
        }
    }

    public void DeleteCategory(string id)
    {
        using var context = CreateContext();
        var category = context.Categories.FirstOrDefault(c => c.Id == id);
        if (category != null)
        {
            context.Categories.Remove(category);
            context.SaveChanges();
        }
    }

    // Carts (still in-memory for simplicity - can be migrated to DB later if needed)
    public Cart GetOrCreateCart(string sessionId, string tenantId, string marketId)
    {
        return _carts.GetOrAdd(sessionId, _ => new Cart
        {
            Id = Guid.NewGuid().ToString(),
            SessionId = sessionId,
            TenantId = tenantId,
            MarketId = marketId,
            Items = new List<CartItem>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
    }

    public void UpdateCart(Cart cart)
    {
        cart.UpdatedAt = DateTime.UtcNow;
        cart.Subtotal = cart.Items.Sum(i => i.Subtotal);
        cart.Tax = cart.Subtotal * 0.08m; // 8% tax
        cart.Total = cart.Subtotal + cart.Tax;
        _carts[cart.SessionId] = cart;
    }

    public void ClearCart(string sessionId)
    {
        _carts.TryRemove(sessionId, out _);
    }

    /// <summary>
    /// Syncs a cart to an order with status "new" (displays as "Cart" in admin UI)
    /// Creates or updates an order matching the cart's session ID
    /// If cart is empty, deletes the corresponding order
    /// </summary>
    public void SyncCartToOrder(Cart cart)
    {
        using var context = CreateContext();

        // Find existing order for this session
        var existingOrder = context.Orders.FirstOrDefault(o =>
            o.Id == $"cart-{cart.SessionId}" && o.Status == "new");

        // If cart is empty, delete the order
        if (cart.Items.Count == 0)
        {
            if (existingOrder != null)
            {
                context.Orders.Remove(existingOrder);
                context.SaveChanges();
            }
            return;
        }

        // Create or update order
        var order = existingOrder ?? new Order
        {
            Id = $"cart-{cart.SessionId}",
            TenantId = cart.TenantId,
            MarketId = cart.MarketId,
            OrderNumber = $"CART-{cart.SessionId.Substring(0, Math.Min(8, cart.SessionId.Length)).ToUpper()}",
            Status = "new",
            CreatedAt = cart.CreatedAt
        };

        // Update order details from cart
        order.Subtotal = cart.Subtotal;
        order.Tax = cart.Tax;
        order.ShippingCost = 0m;
        order.Total = cart.Total;
        order.UpdatedAt = cart.UpdatedAt;

        // Convert cart items to order items
        var products = GetProducts(); // Get all products for lookup
        order.Items = cart.Items.Select(ci =>
        {
            var product = products.FirstOrDefault(p => p.Id == ci.ProductId);
            string sku = "";
            if (!string.IsNullOrEmpty(ci.VariantId))
            {
                var variant = product?.Variants?.FirstOrDefault(v => v.Id == ci.VariantId);
                sku = variant?.Sku ?? "";
            }
            else
            {
                sku = product?.Sku ?? "";
            }

            return new OrderItem
            {
                Id = ci.Id,
                ProductId = ci.ProductId,
                VariantId = ci.VariantId,
                ProductName = ci.ProductName,
                Sku = sku,
                ProductImageUrl = ci.ProductImageUrl,
                UnitPrice = ci.UnitPrice,
                Quantity = ci.Quantity,
                Subtotal = ci.Subtotal,
                Currency = "USD"
            };
        }).ToList();

        // Add placeholder customer info (cart doesn't have customer yet)
        order.Customer = new CustomerInfo
        {
            FullName = "Guest",
            Email = ""
        };

        // Save order
        if (existingOrder == null)
        {
            context.Orders.Add(order);
        }
        context.SaveChanges();
    }

    // Orders
    public void AddOrder(Order order)
    {
        using var context = CreateContext();
        context.Orders.Add(order);
        context.SaveChanges();
    }

    public Order? GetOrder(string id)
    {
        using var context = CreateContext();
        return context.Orders.AsNoTracking().FirstOrDefault(o => o.Id == id);
    }

    public void UpdateOrder(Order order)
    {
        using var context = CreateContext();
        var existing = context.Orders.FirstOrDefault(o => o.Id == order.Id);
        if (existing != null)
        {
            order.UpdatedAt = DateTime.UtcNow;
            context.Entry(existing).CurrentValues.SetValues(order);

            // Handle complex properties that SetValues doesn't handle
            existing.Customer = order.Customer;
            existing.ShippingAddress = order.ShippingAddress;
            existing.BillingAddress = order.BillingAddress;
            existing.Items = order.Items;

            context.SaveChanges();
        }
    }

    public List<Order> GetAllOrders()
    {
        using var context = CreateContext();
        return context.Orders.AsNoTracking().ToList();
    }

    public void DeleteOrder(string orderId)
    {
        using var context = CreateContext();
        var order = context.Orders.FirstOrDefault(o => o.Id == orderId);
        if (order != null)
        {
            context.Orders.Remove(order);
            context.SaveChanges();
        }
    }

    // Tenants
    public List<Tenant> GetTenants()
    {
        using var context = CreateContext();
        return context.Tenants.AsNoTracking().ToList();
    }

    public Tenant? GetTenant(string id)
    {
        using var context = CreateContext();
        return context.Tenants.AsNoTracking().FirstOrDefault(t => t.Id == id);
    }

    public void UpdateTenant(Tenant tenant)
    {
        using var context = CreateContext();
        var existing = context.Tenants.FirstOrDefault(t => t.Id == tenant.Id);
        if (existing != null)
        {
            context.Entry(existing).CurrentValues.SetValues(tenant);

            // Handle complex properties
            existing.Address = tenant.Address;
            existing.Settings = tenant.Settings;

            context.SaveChanges();
        }
    }

    // Markets
    public List<Market> GetMarkets()
    {
        using var context = CreateContext();
        return context.Markets.AsNoTracking().ToList();
    }

    public Market? GetMarket(string id)
    {
        using var context = CreateContext();
        return context.Markets.AsNoTracking().FirstOrDefault(m => m.Id == id);
    }

    public List<Market> GetMarketsByTenant(string tenantId)
    {
        using var context = CreateContext();
        return context.Markets.AsNoTracking().Where(m => m.TenantId == tenantId).ToList();
    }

    public void UpdateMarket(Market market)
    {
        using var context = CreateContext();
        var existing = context.Markets.FirstOrDefault(m => m.Id == market.Id);
        if (existing != null)
        {
            context.Entry(existing).CurrentValues.SetValues(market);

            // Handle complex properties
            existing.Address = market.Address;
            existing.Settings = market.Settings;

            context.SaveChanges();
        }
    }

    // API Keys
    public List<ApiKey> GetApiKeysByMarket(string marketId)
    {
        using var context = CreateContext();
        return context.ApiKeys.AsNoTracking().Where(k => k.MarketId == marketId).ToList();
    }

    public ApiKey? GetApiKey(string id)
    {
        using var context = CreateContext();
        return context.ApiKeys.AsNoTracking().FirstOrDefault(k => k.Id == id);
    }

    public void AddApiKey(ApiKey apiKey)
    {
        using var context = CreateContext();
        context.ApiKeys.Add(apiKey);
        context.SaveChanges();

        // Update market's API key count
        var market = GetMarket(apiKey.MarketId);
        if (market != null)
        {
            market.ApiKeyCount++;
            UpdateMarket(market);
        }
    }

    public void UpdateApiKey(ApiKey apiKey)
    {
        using var context = CreateContext();
        var existing = context.ApiKeys.FirstOrDefault(k => k.Id == apiKey.Id);
        if (existing != null)
        {
            context.Entry(existing).CurrentValues.SetValues(apiKey);
            context.SaveChanges();
        }
    }

    public void RevokeApiKey(string keyId)
    {
        var apiKey = GetApiKey(keyId);
        if (apiKey != null && apiKey.Status == "active")
        {
            using var context = CreateContext();
            var existing = context.ApiKeys.FirstOrDefault(k => k.Id == keyId);
            if (existing != null)
            {
                existing.Status = "revoked";
                existing.RevokedAt = DateTime.UtcNow;
                context.SaveChanges();

                // Update market's API key count
                var market = GetMarket(apiKey.MarketId);
                if (market != null && market.ApiKeyCount > 0)
                {
                    market.ApiKeyCount--;
                    UpdateMarket(market);
                }
            }
        }
    }

    // Helper: Generate API Key
    public static string GenerateApiKey()
    {
        const string prefix = "sk_live_";
        var randomBytes = new byte[32];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        var hexString = BitConverter.ToString(randomBytes).Replace("-", "").ToLower();
        return prefix + hexString;
    }

    // Helper: Hash API Key (simplified for demo)
    public static string HashApiKey(string key)
    {
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            var hashBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(key));
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }
    }

    // Helper: Get last 4 chars
    public static string GetLastFourChars(string key)
    {
        return key.Length >= 4 ? key.Substring(key.Length - 4) : key;
    }
}
