using EComm.Api.Models;

namespace EComm.Api.Data;

/// <summary>
/// Seeds the database with initial mock data
/// </summary>
public static class DatabaseSeeder
{
    public static void SeedDatabase(ECommDbContext context)
    {
        // Check if database is already seeded
        if (context.Tenants.Any())
        {
            return; // Database already has data
        }

        // Seed Users (before tenants, as we'll reference tenant IDs)
        // Password for all test users: "password123" (hashed with BCrypt)
        var users = new[]
        {
            new User
            {
                Id = "user-1",
                Email = "admin@platform.com",
                DisplayName = "Super Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Role = "SUPERADMIN",
                TenantId = null, // Superadmin has access to all tenants
                AssignedMarketIds = null,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1),
                CreatedBy = "system"
            },
            new User
            {
                Id = "user-2",
                Email = "admin@demostore.com",
                DisplayName = "Admin (Demo Store)",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Role = "TENANT_ADMIN",
                TenantId = "tenant-a",
                AssignedMarketIds = null, // Tenant admin has access to all markets in tenant
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1),
                CreatedBy = "system"
            },
            new User
            {
                Id = "user-3",
                Email = "catalog@demostore.com",
                DisplayName = "Catalog Manager (Demo Store)",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Role = "TENANT_USER",
                TenantId = "tenant-a",
                AssignedMarketIds = new List<string> { "market-1" },
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1),
                CreatedBy = "system"
            }
        };
        context.Users.AddRange(users);

        // Seed Tenants
        var tenants = new[]
        {
            new Tenant
            {
                Id = "tenant-a",
                Name = "demo-retail-group",
                DisplayName = "Demo Retail Group",
                Status = "active",
                ContactEmail = "admin@demoretail.com",
                ContactPhone = "+1-555-0100",
                Address = new Address
                {
                    Street = "123 Business Ave",
                    City = "New York",
                    State = "NY",
                    PostalCode = "10001",
                    Country = "USA"
                },
                Settings = new TenantSettings
                {
                    MaxMarkets = 10,
                    MaxUsers = 50,
                    Features = new List<string> { "inventory", "analytics", "api_access" }
                },
                MarketCount = 3,
                CreatedAt = new DateTime(2024, 1, 1),
                UpdatedAt = new DateTime(2024, 10, 28)
            },
            new Tenant
            {
                Id = "tenant-b",
                Name = "test-retail-chain",
                DisplayName = "Test Retail Chain",
                Status = "active",
                ContactEmail = "contact@testretail.com",
                ContactPhone = "+1-555-0200",
                Address = new Address
                {
                    Street = "456 Commerce St",
                    City = "Chicago",
                    State = "IL",
                    PostalCode = "60601",
                    Country = "USA"
                },
                Settings = new TenantSettings
                {
                    MaxMarkets = 5,
                    MaxUsers = 25,
                    Features = new List<string> { "inventory", "api_access" }
                },
                MarketCount = 2,
                CreatedAt = new DateTime(2024, 2, 15),
                UpdatedAt = new DateTime(2024, 10, 25)
            },
            new Tenant
            {
                Id = "tenant-c",
                Name = "sample-corp",
                DisplayName = "Sample Corp",
                Status = "active",
                ContactEmail = "info@samplecorp.com",
                Settings = new TenantSettings
                {
                    MaxMarkets = 3,
                    MaxUsers = 10,
                    Features = new List<string> { "api_access" }
                },
                MarketCount = 2,
                CreatedAt = new DateTime(2024, 3, 20),
                UpdatedAt = new DateTime(2024, 10, 26)
            }
        };
        context.Tenants.AddRange(tenants);

        // Seed Order Statuses for all tenants
        var orderStatuses = new List<OrderStatus>();
        foreach (var tenant in tenants)
        {
            var defaults = DefaultOrderStatuses.GetDefaults();
            foreach (var (name, code, color, sortOrder) in defaults)
            {
                orderStatuses.Add(new OrderStatus
                {
                    Id = $"status-{tenant.Id}-{code}",
                    TenantId = tenant.Id,
                    Name = name,
                    Code = code,
                    Color = color,
                    SortOrder = sortOrder,
                    IsSystemDefault = true,
                    IsActive = true,
                    CreatedAt = tenant.CreatedAt
                });
            }
        }
        context.OrderStatuses.AddRange(orderStatuses);

        // Seed Markets
        var markets = new[]
        {
            // Tenant A markets
            new Market
            {
                Id = "market-1",
                TenantId = "tenant-a",
                Name = "Downtown Store",
                Code = "DT-001",
                Type = "physical",
                Status = "active",
                Currency = "USD",
                Timezone = "America/New_York",
                Address = new Address
                {
                    Street = "123 Main Street",
                    City = "New York",
                    State = "NY",
                    PostalCode = "10001",
                    Country = "USA"
                },
                Settings = new MarketSettings
                {
                    OrderPrefix = "DT",
                    TaxRate = 0.0875m,
                    ShippingZones = new List<string> { "NY", "NJ", "CT" }
                },
                ApiKeyCount = 2,
                CreatedAt = new DateTime(2024, 1, 15),
                UpdatedAt = new DateTime(2024, 10, 20)
            },
            new Market
            {
                Id = "market-2",
                TenantId = "tenant-a",
                Name = "Airport Location",
                Code = "AP-001",
                Type = "physical",
                Status = "active",
                Currency = "USD",
                Timezone = "America/New_York",
                Address = new Address
                {
                    Street = "JFK Airport Terminal 4",
                    City = "New York",
                    State = "NY",
                    PostalCode = "11430",
                    Country = "USA"
                },
                Settings = new MarketSettings
                {
                    OrderPrefix = "AP",
                    TaxRate = 0.0875m,
                    ShippingZones = new List<string> { "NY" }
                },
                ApiKeyCount = 1,
                CreatedAt = new DateTime(2024, 3, 10),
                UpdatedAt = new DateTime(2024, 10, 18)
            },
            new Market
            {
                Id = "market-3",
                TenantId = "tenant-a",
                Name = "Online Store",
                Code = "ONL-001",
                Type = "online",
                Status = "active",
                Currency = "USD",
                Timezone = "America/New_York",
                Settings = new MarketSettings
                {
                    OrderPrefix = "WEB",
                    TaxRate = 0m,
                    ShippingZones = new List<string> { "US", "CA", "MX" }
                },
                ApiKeyCount = 3,
                CreatedAt = new DateTime(2024, 2, 1),
                UpdatedAt = new DateTime(2024, 10, 25)
            },
            // Tenant B markets
            new Market
            {
                Id = "market-4",
                TenantId = "tenant-b",
                Name = "Mall Store",
                Code = "MALL-001",
                Type = "physical",
                Status = "active",
                Currency = "USD",
                Timezone = "America/Chicago",
                Address = new Address
                {
                    Street = "Westfield Mall, Unit 205",
                    City = "Chicago",
                    State = "IL",
                    PostalCode = "60601",
                    Country = "USA"
                },
                Settings = new MarketSettings
                {
                    OrderPrefix = "ML",
                    TaxRate = 0.1025m,
                    ShippingZones = new List<string> { "IL", "WI", "IN" }
                },
                ApiKeyCount = 1,
                CreatedAt = new DateTime(2024, 4, 5),
                UpdatedAt = new DateTime(2024, 10, 22)
            },
            new Market
            {
                Id = "market-5",
                TenantId = "tenant-b",
                Name = "Outlet Store",
                Code = "OUT-001",
                Type = "physical",
                Status = "active",
                Currency = "USD",
                Timezone = "America/Chicago",
                Address = new Address
                {
                    Street = "Premium Outlets, Store 42",
                    City = "Aurora",
                    State = "IL",
                    PostalCode = "60502",
                    Country = "USA"
                },
                Settings = new MarketSettings
                {
                    OrderPrefix = "OT",
                    TaxRate = 0.0625m,
                    ShippingZones = new List<string> { "IL" }
                },
                ApiKeyCount = 0,
                CreatedAt = new DateTime(2024, 6, 15),
                UpdatedAt = new DateTime(2024, 10, 20)
            },
            // Tenant C markets
            new Market
            {
                Id = "market-6",
                TenantId = "tenant-c",
                Name = "Online Store",
                Code = "WEB-001",
                Type = "online",
                Status = "active",
                Currency = "USD",
                Timezone = "America/Los_Angeles",
                Settings = new MarketSettings
                {
                    OrderPrefix = "SC",
                    TaxRate = 0m,
                    ShippingZones = new List<string> { "US" }
                },
                ApiKeyCount = 2,
                CreatedAt = new DateTime(2024, 5, 1),
                UpdatedAt = new DateTime(2024, 10, 26)
            },
            new Market
            {
                Id = "market-7",
                TenantId = "tenant-c",
                Name = "Pop-up Store",
                Code = "POP-001",
                Type = "physical",
                Status = "inactive",
                Currency = "USD",
                Timezone = "America/Los_Angeles",
                Address = new Address
                {
                    Street = "Venice Beach Boardwalk",
                    City = "Los Angeles",
                    State = "CA",
                    PostalCode = "90291",
                    Country = "USA"
                },
                Settings = new MarketSettings
                {
                    OrderPrefix = "POP",
                    TaxRate = 0.095m,
                    ShippingZones = new List<string> { "CA" }
                },
                ApiKeyCount = 0,
                CreatedAt = new DateTime(2024, 7, 1),
                UpdatedAt = new DateTime(2024, 9, 15)
            }
        };
        context.Markets.AddRange(markets);

        // Seed Categories (hierarchical structure)
        var categories = new[]
        {
            // Top-level: Electronics
            new Category
            {
                Id = "cat-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Electronics",
                Description = "Electronic devices and accessories",
                DisplayOrder = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            // Subcategories of Electronics
            new Category
            {
                Id = "cat-1-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Small Electronics",
                Description = "Portable electronic devices",
                ParentId = "cat-1",
                DisplayOrder = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new Category
            {
                Id = "cat-1-1-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Watches",
                Description = "Smart watches and wearables",
                ParentId = "cat-1-1",
                DisplayOrder = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new Category
            {
                Id = "cat-1-1-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Headphones",
                Description = "Wireless and wired headphones",
                ParentId = "cat-1-1",
                DisplayOrder = 2,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new Category
            {
                Id = "cat-1-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Computer Accessories",
                Description = "Peripherals and accessories for computers",
                ParentId = "cat-1",
                DisplayOrder = 2,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            // Top-level: Clothing
            new Category
            {
                Id = "cat-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Clothing",
                Description = "Fashion and apparel",
                DisplayOrder = 2,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            // Subcategories of Clothing
            new Category
            {
                Id = "cat-2-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Men's Clothing",
                Description = "Clothing for men",
                ParentId = "cat-2",
                DisplayOrder = 1,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new Category
            {
                Id = "cat-2-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Women's Clothing",
                Description = "Clothing for women",
                ParentId = "cat-2",
                DisplayOrder = 2,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            // Top-level: Home & Garden
            new Category
            {
                Id = "cat-3",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Home & Garden",
                Description = "Home improvement and garden supplies",
                DisplayOrder = 3,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            // Top-level: Sports & Outdoors
            new Category
            {
                Id = "cat-4",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Sports & Outdoors",
                Description = "Sports equipment and outdoor gear",
                DisplayOrder = 4,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            // Top-level: Books
            new Category
            {
                Id = "cat-5",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Books",
                Description = "Books and magazines",
                DisplayOrder = 5,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            }
        };
        context.Categories.AddRange(categories);

        // Seed Products (truncated for brevity - showing first few products)
        var products = new[]
        {
            // Electronics -> Small Electronics -> Headphones
            new Product
            {
                Id = "prod-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Wireless Bluetooth Headphones",
                Description = "Premium noise-cancelling wireless headphones with 30-hour battery life",
                Sku = "WBH-001",
                Price = 79.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/4A5568/fff.png&text=Headphones" },
                CategoryIds = new List<string> { "cat-1-1-2" },
                Status = "active",
                StockQuantity = 50,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-20),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            // Electronics -> Small Electronics -> Watches
            new Product
            {
                Id = "prod-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Smart Watch Pro",
                Description = "Feature-rich smartwatch with fitness tracking and heart rate monitor",
                Sku = "SWP-002",
                Price = 199.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/3B82F6/fff.png&text=Smart+Watch" },
                CategoryIds = new List<string> { "cat-1-1-1" },
                Status = "active",
                StockQuantity = 30,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-18),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-18),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },
            // Electronics -> Computer Accessories
            new Product
            {
                Id = "prod-3",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "4K Webcam",
                Description = "Ultra HD webcam with auto-focus and built-in microphone",
                Sku = "WEB-003",
                Price = 89.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/6366F1/fff.png&text=4K+Webcam" },
                CategoryIds = new List<string> { "cat-1-2" },
                Status = "active",
                StockQuantity = 25,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-15),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            // Clothing with variants
            new Product
            {
                Id = "prod-4",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Classic Cotton T-Shirt",
                Description = "Comfortable 100% cotton t-shirt available in multiple colors and sizes",
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/10B981/fff.png&text=T-Shirt" },
                CategoryIds = new List<string> { "cat-2" },
                Status = "active",
                HasVariants = true,
                VariantOptions = new List<VariantOption>
                {
                    new VariantOption { Name = "Size", Values = new List<string> { "Small", "Medium", "Large", "XL" } },
                    new VariantOption { Name = "Color", Values = new List<string> { "White", "Black", "Navy", "Gray" } }
                },
                Variants = new List<ProductVariant>
                {
                    // White variants
                    new ProductVariant { Id = "var-1", Sku = "TSH-004-WH-S", Price = 19.99m, StockQuantity = 25, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Small" }, { "Color", "White" } }, Status = "active" },
                    new ProductVariant { Id = "var-2", Sku = "TSH-004-WH-M", Price = 19.99m, StockQuantity = 30, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Medium" }, { "Color", "White" } }, Status = "active" },
                    new ProductVariant { Id = "var-3", Sku = "TSH-004-WH-L", Price = 19.99m, StockQuantity = 28, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Large" }, { "Color", "White" } }, Status = "active" },
                    new ProductVariant { Id = "var-4", Sku = "TSH-004-WH-XL", Price = 19.99m, StockQuantity = 20, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "XL" }, { "Color", "White" } }, Status = "active" },
                    // Black variants
                    new ProductVariant { Id = "var-5", Sku = "TSH-004-BK-S", Price = 19.99m, StockQuantity = 22, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Small" }, { "Color", "Black" } }, Status = "active" },
                    new ProductVariant { Id = "var-6", Sku = "TSH-004-BK-M", Price = 19.99m, StockQuantity = 35, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Medium" }, { "Color", "Black" } }, Status = "active" },
                    new ProductVariant { Id = "var-7", Sku = "TSH-004-BK-L", Price = 19.99m, StockQuantity = 32, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Large" }, { "Color", "Black" } }, Status = "active" },
                    new ProductVariant { Id = "var-8", Sku = "TSH-004-BK-XL", Price = 19.99m, StockQuantity = 18, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "XL" }, { "Color", "Black" } }, Status = "active" },
                },
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-25),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow.AddDays(-4)
            },
            new Product
            {
                Id = "prod-5",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Denim Jeans - Slim Fit",
                Description = "Premium denim jeans with modern slim fit design",
                Sku = "JNS-005",
                Price = 59.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/2563EB/fff.png&text=Jeans" },
                CategoryIds = new List<string> { "cat-2" },
                Status = "active",
                StockQuantity = 75,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-22),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-22),
                UpdatedAt = DateTime.UtcNow.AddDays(-6)
            },
            new Product
            {
                Id = "prod-6",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Winter Jacket",
                Description = "Warm and waterproof winter jacket with insulated lining",
                Sku = "JKT-006",
                Price = 129.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/DC2626/fff.png&text=Winter+Jacket" },
                CategoryIds = new List<string> { "cat-2" },
                Status = "active",
                StockQuantity = 40,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-19),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-19),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            // Home & Garden
            new Product
            {
                Id = "prod-7",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "LED Desk Lamp",
                Description = "Adjustable LED desk lamp with touch control and USB charging port",
                Sku = "LMP-007",
                Price = 34.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/F59E0B/fff.png&text=Desk+Lamp" },
                CategoryIds = new List<string> { "cat-3" },
                Status = "active",
                StockQuantity = 60,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-17),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-17),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new Product
            {
                Id = "prod-8",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Garden Tool Set",
                Description = "Complete 10-piece garden tool set with carrying case",
                Sku = "GTS-008",
                Price = 49.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/059669/fff.png&text=Garden+Tools" },
                CategoryIds = new List<string> { "cat-3" },
                Status = "active",
                StockQuantity = 35,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-14),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-14),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            // Sports & Outdoors
            new Product
            {
                Id = "prod-9",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Yoga Mat Premium",
                Description = "Extra thick yoga mat with non-slip surface and carrying strap",
                Sku = "YGA-009",
                Price = 29.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/8B5CF6/fff.png&text=Yoga+Mat" },
                CategoryIds = new List<string> { "cat-4" },
                Status = "active",
                StockQuantity = 80,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-12),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-12),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Product
            {
                Id = "prod-10",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Camping Tent 4-Person",
                Description = "Waterproof camping tent with easy setup, fits 4 people comfortably",
                Sku = "TNT-010",
                Price = 149.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/16A34A/fff.png&text=Camping+Tent" },
                CategoryIds = new List<string> { "cat-4" },
                Status = "active",
                StockQuantity = 20,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-10),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            // Books
            new Product
            {
                Id = "prod-11",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Programming Guide 2024",
                Description = "Comprehensive guide to modern programming practices and patterns",
                Sku = "BK-011",
                Price = 39.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/0EA5E9/fff.png&text=Programming+Book" },
                CategoryIds = new List<string> { "cat-5" },
                Status = "active",
                StockQuantity = 45,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-8),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-8),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Product
            {
                Id = "prod-12",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Cookbook Collection",
                Description = "100+ delicious recipes for home chefs",
                Sku = "BK-012",
                Price = 24.99m,
                Currency = "USD",
                Images = new List<string> { "https://dummyimage.com/300x300/EC4899/fff.png&text=Cookbook" },
                CategoryIds = new List<string> { "cat-5" },
                Status = "active",
                StockQuantity = 55,
                LowStockThreshold = 10,
                HasVariants = false,
                Version = 1,
                IsCurrentVersion = true,
                VersionCreatedAt = DateTime.UtcNow.AddDays(-6),
                VersionCreatedBy = "system",
                CreatedAt = DateTime.UtcNow.AddDays(-6),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };
        context.Products.AddRange(products);

        // Seed API Keys
        var apiKeys = new[]
        {
            new ApiKey
            {
                Id = "key-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Production API Key",
                KeyHash = "hash_of_sk_live_demo_key_12345",
                LastFourChars = "2345",
                Status = "active",
                CreatedAt = new DateTime(2024, 1, 20),
                LastUsedAt = DateTime.UtcNow.AddHours(-2),
                CreatedBy = "admin@demoretail.com"
            },
            new ApiKey
            {
                Id = "key-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Development API Key",
                KeyHash = "hash_of_sk_dev_test_67890",
                LastFourChars = "7890",
                Status = "active",
                CreatedAt = new DateTime(2024, 2, 10),
                LastUsedAt = DateTime.UtcNow.AddDays(-1),
                CreatedBy = "admin@demoretail.com"
            },
            new ApiKey
            {
                Id = "key-3",
                TenantId = "tenant-a",
                MarketId = "market-2",
                Name = "Airport Store Key",
                KeyHash = "hash_of_sk_live_airport_11111",
                LastFourChars = "1111",
                Status = "active",
                CreatedAt = new DateTime(2024, 3, 15),
                CreatedBy = "admin@demoretail.com"
            },
            new ApiKey
            {
                Id = "key-4",
                TenantId = "tenant-a",
                MarketId = "market-3",
                Name = "Online Store - Main",
                KeyHash = "hash_of_sk_live_online_22222",
                LastFourChars = "2222",
                Status = "active",
                CreatedAt = new DateTime(2024, 2, 5),
                LastUsedAt = DateTime.UtcNow.AddMinutes(-30),
                CreatedBy = "admin@demoretail.com"
            },
            new ApiKey
            {
                Id = "key-5",
                TenantId = "tenant-a",
                MarketId = "market-3",
                Name = "Online Store - Backup",
                KeyHash = "hash_of_sk_live_online_backup_33333",
                LastFourChars = "3333",
                Status = "active",
                CreatedAt = new DateTime(2024, 2, 6),
                CreatedBy = "admin@demoretail.com"
            },
            new ApiKey
            {
                Id = "key-6",
                TenantId = "tenant-a",
                MarketId = "market-3",
                Name = "Online Store - Testing",
                KeyHash = "hash_of_sk_test_online_44444",
                LastFourChars = "4444",
                Status = "revoked",
                CreatedAt = new DateTime(2024, 1, 10),
                RevokedAt = new DateTime(2024, 3, 1),
                RevokedBy = "admin@demoretail.com"
            },
            new ApiKey
            {
                Id = "key-7",
                TenantId = "tenant-b",
                MarketId = "market-4",
                Name = "Mall Store API",
                KeyHash = "hash_of_sk_live_mall_55555",
                LastFourChars = "5555",
                Status = "active",
                CreatedAt = new DateTime(2024, 4, 10),
                LastUsedAt = DateTime.UtcNow.AddHours(-6),
                CreatedBy = "contact@testretail.com"
            },
            new ApiKey
            {
                Id = "key-8",
                TenantId = "tenant-c",
                MarketId = "market-6",
                Name = "Sample Corp - Production",
                KeyHash = "hash_of_sk_live_sample_66666",
                LastFourChars = "6666",
                Status = "active",
                CreatedAt = new DateTime(2024, 5, 5),
                LastUsedAt = DateTime.UtcNow.AddDays(-2),
                CreatedBy = "info@samplecorp.com"
            },
            new ApiKey
            {
                Id = "key-9",
                TenantId = "tenant-c",
                MarketId = "market-6",
                Name = "Sample Corp - Development",
                KeyHash = "hash_of_sk_dev_sample_77777",
                LastFourChars = "7777",
                Status = "active",
                CreatedAt = new DateTime(2024, 5, 6),
                CreatedBy = "info@samplecorp.com"
            }
        };
        context.ApiKeys.AddRange(apiKeys);

        // Seed Orders
        var orders = new[]
        {
            new Order
            {
                Id = "order-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                OrderNumber = "ORD-2025-1001",
                Status = "submitted",
                Subtotal = 269.97m,
                Tax = 24.30m,
                ShippingCost = 9.99m,
                Total = 304.26m,
                Customer = new CustomerInfo
                {
                    FullName = "John Doe",
                    Email = "john.doe@example.com",
                    Phone = "+1-555-0101"
                },
                ShippingAddress = new Address
                {
                    Street = "123 Main Street",
                    Street2 = "Apt 4B",
                    City = "New York",
                    State = "NY",
                    PostalCode = "10001",
                    Country = "USA"
                },
                Items = new List<OrderItem>
                {
                    new OrderItem { Id = "line-1", ProductId = "prod-1", ProductName = "Wireless Bluetooth Headphones", Sku = "WBH-001", UnitPrice = 79.99m, Quantity = 2, Subtotal = 159.98m, Currency = "USD" },
                    new OrderItem { Id = "line-2", ProductId = "prod-2", ProductName = "Smart Watch Pro", Sku = "SWP-002", UnitPrice = 199.99m, Quantity = 1, Subtotal = 199.99m, Currency = "USD" }
                },
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new Order
            {
                Id = "order-2",
                TenantId = "tenant-a",
                MarketId = "market-1",
                OrderNumber = "ORD-2025-1002",
                Status = "paid",
                Subtotal = 189.98m,
                Tax = 17.10m,
                ShippingCost = 8.50m,
                Total = 215.58m,
                Customer = new CustomerInfo
                {
                    FullName = "Jane Smith",
                    Email = "jane.smith@example.com",
                    Phone = "+1-555-0102"
                },
                ShippingAddress = new Address
                {
                    Street = "456 Oak Avenue",
                    City = "Los Angeles",
                    State = "CA",
                    PostalCode = "90001",
                    Country = "USA"
                },
                Items = new List<OrderItem>
                {
                    new OrderItem { Id = "line-3", ProductId = "prod-5", ProductName = "Denim Jeans - Slim Fit", Sku = "JNS-005", UnitPrice = 59.99m, Quantity = 2, Subtotal = 119.98m, Currency = "USD" },
                    new OrderItem { Id = "line-4", ProductId = "prod-7", ProductName = "LED Desk Lamp", Sku = "LMP-007", UnitPrice = 34.99m, Quantity = 2, Subtotal = 69.98m, Currency = "USD" }
                },
                TrackingNumber = "TRACK-1234-5678",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Order
            {
                Id = "order-3",
                TenantId = "tenant-a",
                MarketId = "market-1",
                OrderNumber = "ORD-2025-1003",
                Status = "completed",
                Subtotal = 349.96m,
                Tax = 31.50m,
                ShippingCost = 0m,
                Total = 381.46m,
                Customer = new CustomerInfo
                {
                    FullName = "Michael Johnson",
                    Email = "michael.j@example.com",
                    Phone = "+1-555-0103"
                },
                ShippingAddress = new Address
                {
                    Street = "789 Pine Road",
                    City = "Chicago",
                    State = "IL",
                    PostalCode = "60601",
                    Country = "USA"
                },
                Items = new List<OrderItem>
                {
                    new OrderItem { Id = "line-5", ProductId = "prod-2", ProductName = "Smart Watch Pro", Sku = "SWP-002", UnitPrice = 199.99m, Quantity = 1, Subtotal = 199.99m, Currency = "USD" },
                    new OrderItem { Id = "line-6", ProductId = "prod-10", ProductName = "Camping Tent 4-Person", Sku = "TNT-010", UnitPrice = 149.99m, Quantity = 1, Subtotal = 149.99m, Currency = "USD" }
                },
                TrackingNumber = "TRACK-9876-5432",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-7)
            },
            new Order
            {
                Id = "order-4",
                TenantId = "tenant-a",
                MarketId = "market-1",
                OrderNumber = "ORD-2025-1004",
                Status = "processing",
                Subtotal = 99.97m,
                Tax = 9.00m,
                ShippingCost = 5.99m,
                Total = 114.96m,
                Customer = new CustomerInfo
                {
                    FullName = "Sarah Williams",
                    Email = "sarah.w@example.com",
                    Phone = "+1-555-0105"
                },
                ShippingAddress = new Address
                {
                    Street = "654 Maple Lane",
                    City = "Phoenix",
                    State = "AZ",
                    PostalCode = "85001",
                    Country = "USA"
                },
                Items = new List<OrderItem>
                {
                    new OrderItem { Id = "line-7", ProductId = "prod-4", ProductName = "Classic Cotton T-Shirt", Sku = "TSH-004-WH-S", UnitPrice = 19.99m, Quantity = 3, Subtotal = 59.97m, Currency = "USD" },
                    new OrderItem { Id = "line-8", ProductId = "prod-11", ProductName = "Programming Guide 2024", Sku = "BK-011", UnitPrice = 39.99m, Quantity = 1, Subtotal = 39.99m, Currency = "USD" }
                },
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new Order
            {
                Id = "order-5",
                TenantId = "tenant-a",
                MarketId = "market-2",
                OrderNumber = "ORD-2025-2001",
                Status = "paid",
                Subtotal = 129.99m,
                Tax = 11.70m,
                ShippingCost = 0m,
                Total = 141.69m,
                Customer = new CustomerInfo
                {
                    FullName = "Robert Brown",
                    Email = "rob.brown@example.com",
                    Phone = "+1-555-0106"
                },
                ShippingAddress = new Address
                {
                    Street = "321 Airport Blvd",
                    City = "New York",
                    State = "NY",
                    PostalCode = "11430",
                    Country = "USA"
                },
                Items = new List<OrderItem>
                {
                    new OrderItem { Id = "line-9", ProductId = "prod-6", ProductName = "Winter Jacket", Sku = "JKT-006", UnitPrice = 129.99m, Quantity = 1, Subtotal = 129.99m, Currency = "USD" }
                },
                TrackingNumber = "TRACK-AP-1111",
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new Order
            {
                Id = "order-6",
                TenantId = "tenant-a",
                MarketId = "market-3",
                OrderNumber = "ORD-2025-3001",
                Status = "completed",
                Subtotal = 59.98m,
                Tax = 5.40m,
                ShippingCost = 7.99m,
                Total = 73.37m,
                Customer = new CustomerInfo
                {
                    FullName = "Emily Davis",
                    Email = "emily.d@example.com",
                    Phone = "+1-555-0107"
                },
                ShippingAddress = new Address
                {
                    Street = "987 Web Street",
                    City = "Austin",
                    State = "TX",
                    PostalCode = "78701",
                    Country = "USA"
                },
                Items = new List<OrderItem>
                {
                    new OrderItem { Id = "line-10", ProductId = "prod-9", ProductName = "Yoga Mat Premium", Sku = "YGA-009", UnitPrice = 29.99m, Quantity = 2, Subtotal = 59.98m, Currency = "USD" }
                },
                TrackingNumber = "TRACK-WEB-2222",
                CreatedAt = DateTime.UtcNow.AddDays(-8),
                UpdatedAt = DateTime.UtcNow.AddDays(-6)
            }
        };
        context.Orders.AddRange(orders);

        // Save all changes
        context.SaveChanges();
    }
}
