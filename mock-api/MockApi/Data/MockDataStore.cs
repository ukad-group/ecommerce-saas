using MockApi.Models;
using System.Collections.Concurrent;

namespace MockApi.Data;

public class MockDataStore
{
    private static readonly MockDataStore _instance = new();
    public static MockDataStore Instance => _instance;

    private readonly List<Product> _products = new();
    private readonly List<Category> _categories = new();
    private readonly List<Tenant> _tenants = new();
    private readonly List<Market> _markets = new();
    private readonly List<ApiKey> _apiKeys = new();
    private readonly ConcurrentDictionary<string, Cart> _carts = new();
    private readonly ConcurrentDictionary<string, Order> _orders = new();

    private MockDataStore()
    {
        SeedData();
    }

    private void SeedData()
    {
        // Seed Tenants
        _tenants.AddRange(new[]
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
        });

        // Seed Markets
        _markets.AddRange(new[]
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
        });

        // Seed Categories (hierarchical structure)
        _categories.AddRange(new[]
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
        });

        // Seed Products
        _products.AddRange(new[]
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
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            // Clothing
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
                    // Navy variants
                    new ProductVariant { Id = "var-9", Sku = "TSH-004-NV-S", Price = 21.99m, SalePrice = 19.99m, StockQuantity = 18, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Small" }, { "Color", "Navy" } }, Status = "active" },
                    new ProductVariant { Id = "var-10", Sku = "TSH-004-NV-M", Price = 21.99m, SalePrice = 19.99m, StockQuantity = 25, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Medium" }, { "Color", "Navy" } }, Status = "active" },
                    new ProductVariant { Id = "var-11", Sku = "TSH-004-NV-L", Price = 21.99m, SalePrice = 19.99m, StockQuantity = 22, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Large" }, { "Color", "Navy" } }, Status = "active" },
                    new ProductVariant { Id = "var-12", Sku = "TSH-004-NV-XL", Price = 21.99m, SalePrice = 19.99m, StockQuantity = 15, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "XL" }, { "Color", "Navy" } }, Status = "active" },
                    // Gray variants
                    new ProductVariant { Id = "var-13", Sku = "TSH-004-GR-S", Price = 19.99m, StockQuantity = 20, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Small" }, { "Color", "Gray" } }, Status = "active" },
                    new ProductVariant { Id = "var-14", Sku = "TSH-004-GR-M", Price = 19.99m, StockQuantity = 27, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Medium" }, { "Color", "Gray" } }, Status = "active" },
                    new ProductVariant { Id = "var-15", Sku = "TSH-004-GR-L", Price = 19.99m, StockQuantity = 24, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "Large" }, { "Color", "Gray" } }, Status = "active" },
                    new ProductVariant { Id = "var-16", Sku = "TSH-004-GR-XL", Price = 19.99m, StockQuantity = 16, LowStockThreshold = 5, Options = new Dictionary<string, string> { { "Size", "XL" }, { "Color", "Gray" } }, Status = "active" }
                },
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
                CreatedAt = DateTime.UtcNow.AddDays(-6),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            }
        });

        // Initialize versioning fields for all seeded products
        foreach (var product in _products)
        {
            product.Version = 1;
            product.IsCurrentVersion = true;
            product.VersionCreatedAt = product.CreatedAt;
            product.VersionCreatedBy = "system";
        }

        // Seed API Keys
        _apiKeys.AddRange(new[]
        {
            new ApiKey
            {
                Id = "key-1",
                TenantId = "tenant-a",
                MarketId = "market-1",
                Name = "Production API Key",
                KeyHash = "hash_of_sk_live_demo_key_12345", // Simplified for demo
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
        });

        // Seed Orders
        _orders.TryAdd("order-1", new Order
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
                new OrderItem { Id = "line-1", ProductId = "prod-1", ProductName = "Wireless Bluetooth Headphones", UnitPrice = 79.99m, Quantity = 2, Subtotal = 159.98m },
                new OrderItem { Id = "line-2", ProductId = "prod-2", ProductName = "Smart Watch Pro", UnitPrice = 199.99m, Quantity = 1, Subtotal = 199.99m }
            },
            CreatedAt = DateTime.UtcNow.AddDays(-3),
            UpdatedAt = DateTime.UtcNow.AddDays(-3)
        });

        _orders.TryAdd("order-2", new Order
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
                new OrderItem { Id = "line-3", ProductId = "prod-5", ProductName = "Denim Jeans - Slim Fit", UnitPrice = 59.99m, Quantity = 2, Subtotal = 119.98m },
                new OrderItem { Id = "line-4", ProductId = "prod-7", ProductName = "LED Desk Lamp", UnitPrice = 34.99m, Quantity = 2, Subtotal = 69.98m }
            },
            TrackingNumber = "TRACK-1234-5678",
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-2)
        });

        _orders.TryAdd("order-3", new Order
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
                new OrderItem { Id = "line-5", ProductId = "prod-2", ProductName = "Smart Watch Pro", UnitPrice = 199.99m, Quantity = 1, Subtotal = 199.99m },
                new OrderItem { Id = "line-6", ProductId = "prod-10", ProductName = "Camping Tent 4-Person", UnitPrice = 149.99m, Quantity = 1, Subtotal = 149.99m }
            },
            TrackingNumber = "TRACK-9876-5432",
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-7)
        });

        _orders.TryAdd("order-4", new Order
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
                new OrderItem { Id = "line-7", ProductId = "prod-4", ProductName = "Classic Cotton T-Shirt", UnitPrice = 19.99m, Quantity = 3, Subtotal = 59.97m },
                new OrderItem { Id = "line-8", ProductId = "prod-11", ProductName = "Programming Guide 2024", UnitPrice = 39.99m, Quantity = 1, Subtotal = 39.99m }
            },
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        });

        _orders.TryAdd("order-5", new Order
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
                new OrderItem { Id = "line-9", ProductId = "prod-6", ProductName = "Winter Jacket", UnitPrice = 129.99m, Quantity = 1, Subtotal = 129.99m }
            },
            TrackingNumber = "TRACK-AP-1111",
            CreatedAt = DateTime.UtcNow.AddDays(-4),
            UpdatedAt = DateTime.UtcNow.AddDays(-3)
        });

        _orders.TryAdd("order-6", new Order
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
                new OrderItem { Id = "line-10", ProductId = "prod-9", ProductName = "Yoga Mat Premium", UnitPrice = 29.99m, Quantity = 2, Subtotal = 59.98m }
            },
            TrackingNumber = "TRACK-WEB-2222",
            CreatedAt = DateTime.UtcNow.AddDays(-8),
            UpdatedAt = DateTime.UtcNow.AddDays(-6)
        });
    }

    // Products
    public List<Product> GetProducts() => _products;
    public Product? GetProduct(string id) => _products.FirstOrDefault(p => p.Id == id);

    public void AddProduct(Product product)
    {
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

        _products.Add(product);
    }

    public void UpdateProduct(Product product, string userId = "system", string? changeNotes = null)
    {
        var existingProduct = _products.FirstOrDefault(p => p.Id == product.Id && p.IsCurrentVersion);
        if (existingProduct == null) return;

        // Mark existing product as not current
        existingProduct.IsCurrentVersion = false;

        // Find the maximum version number for this product
        var maxVersion = _products
            .Where(p => p.Id == product.Id)
            .Max(p => p.Version);

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
            Images = product.Images,
            CategoryIds = product.CategoryIds,
            Metadata = product.Metadata,
            HasVariants = product.HasVariants,
            VariantOptions = product.VariantOptions,
            Variants = product.Variants,
            CustomProperties = product.CustomProperties,

            // Preserve original creation date
            CreatedAt = existingProduct.CreatedAt,
            UpdatedAt = DateTime.UtcNow,

            // Versioning fields - use max version + 1
            Version = maxVersion + 1,
            IsCurrentVersion = true,
            VersionCreatedAt = DateTime.UtcNow,
            VersionCreatedBy = userId,
            ChangeNotes = changeNotes
        };

        // Add new version to the list
        _products.Add(newVersion);
    }

    public void DeleteProduct(string id)
    {
        var index = _products.FindIndex(p => p.Id == id);
        if (index >= 0)
        {
            _products.RemoveAt(index);
        }
    }

    /// <summary>
    /// Get all versions of a product
    /// </summary>
    public List<Product> GetProductVersions(string productId)
    {
        return _products
            .Where(p => p.Id == productId)
            .OrderByDescending(p => p.Version)
            .ToList();
    }

    /// <summary>
    /// Get a specific version of a product
    /// </summary>
    public Product? GetProductVersion(string productId, int version)
    {
        return _products.FirstOrDefault(p => p.Id == productId && p.Version == version);
    }

    /// <summary>
    /// Restore a previous version by swapping IsCurrentVersion flags
    /// </summary>
    public Product? RestoreProductVersion(string productId, int versionToRestore, string userId = "system")
    {
        var oldVersion = GetProductVersion(productId, versionToRestore);
        if (oldVersion == null) return null;

        var currentVersion = _products.FirstOrDefault(p => p.Id == productId && p.IsCurrentVersion);
        if (currentVersion == null) return null;

        // Swap current flags
        currentVersion.IsCurrentVersion = false;
        oldVersion.IsCurrentVersion = true;

        // Add restore note to the restored version
        var existingNotes = string.IsNullOrEmpty(oldVersion.ChangeNotes) ? "" : oldVersion.ChangeNotes + " | ";
        oldVersion.ChangeNotes = $"{existingNotes}Restored by {userId} at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}";

        return oldVersion;
    }

    /// <summary>
    /// Update only stock quantity without creating a new version
    /// Used for automatic stock adjustments (e.g., from orders)
    /// </summary>
    public void UpdateProductStock(string productId, int newStockQuantity)
    {
        var currentProduct = _products.FirstOrDefault(p => p.Id == productId && p.IsCurrentVersion);
        if (currentProduct == null) return;

        // Update stock directly without creating new version
        currentProduct.StockQuantity = newStockQuantity;
        currentProduct.UpdatedAt = DateTime.UtcNow;
    }

    // Categories
    public List<Category> GetCategories() => _categories;
    public Category? GetCategory(string id) => _categories.FirstOrDefault(c => c.Id == id);

    /// <summary>
    /// Get all descendant category IDs (including the category itself and all subcategories recursively)
    /// </summary>
    public List<string> GetCategoryWithDescendants(string categoryId)
    {
        var result = new List<string> { categoryId };
        var children = _categories.Where(c => c.ParentId == categoryId).ToList();

        foreach (var child in children)
        {
            result.AddRange(GetCategoryWithDescendants(child.Id));
        }

        return result;
    }

    public void AddCategory(Category category)
    {
        category.CreatedAt = DateTime.UtcNow;
        category.UpdatedAt = DateTime.UtcNow;
        _categories.Add(category);
    }

    public void UpdateCategory(Category category)
    {
        var index = _categories.FindIndex(c => c.Id == category.Id);
        if (index >= 0)
        {
            category.UpdatedAt = DateTime.UtcNow;
            _categories[index] = category;
        }
    }

    public void DeleteCategory(string id)
    {
        var index = _categories.FindIndex(c => c.Id == id);
        if (index >= 0)
        {
            _categories.RemoveAt(index);
        }
    }

    // Carts
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
        // Find existing order for this session
        var existingOrder = _orders.Values.FirstOrDefault(o =>
            o.Id == $"cart-{cart.SessionId}" && o.Status == "new");

        // If cart is empty, delete the order
        if (cart.Items.Count == 0)
        {
            if (existingOrder != null)
            {
                _orders.TryRemove(existingOrder.Id, out _);
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
        order.Items = cart.Items.Select(ci =>
        {
            var product = GetProducts().FirstOrDefault(p => p.Id == ci.ProductId);
            return new OrderItem
            {
                Id = ci.Id,
                ProductId = ci.ProductId,
                ProductName = ci.ProductName,
                Sku = product?.Sku ?? "",
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
        _orders[order.Id] = order;
    }

    // Orders
    public void AddOrder(Order order)
    {
        _orders[order.Id] = order;
    }

    public Order? GetOrder(string id) => _orders.TryGetValue(id, out var order) ? order : null;

    public void UpdateOrder(Order order)
    {
        order.UpdatedAt = DateTime.UtcNow;
        _orders[order.Id] = order;
    }

    public List<Order> GetAllOrders() => _orders.Values.ToList();

    public void DeleteOrder(string orderId)
    {
        _orders.TryRemove(orderId, out _);
    }

    // Tenants
    public List<Tenant> GetTenants() => _tenants;
    public Tenant? GetTenant(string id) => _tenants.FirstOrDefault(t => t.Id == id);

    // Markets
    public List<Market> GetMarkets() => _markets;
    public Market? GetMarket(string id) => _markets.FirstOrDefault(m => m.Id == id);
    public List<Market> GetMarketsByTenant(string tenantId) => _markets.Where(m => m.TenantId == tenantId).ToList();

    public void UpdateMarket(Market market)
    {
        var index = _markets.FindIndex(m => m.Id == market.Id);
        if (index >= 0)
        {
            _markets[index] = market;
        }
    }

    // API Keys
    public List<ApiKey> GetApiKeysByMarket(string marketId) => _apiKeys.Where(k => k.MarketId == marketId).ToList();
    public ApiKey? GetApiKey(string id) => _apiKeys.FirstOrDefault(k => k.Id == id);

    public void AddApiKey(ApiKey apiKey)
    {
        _apiKeys.Add(apiKey);

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
        var index = _apiKeys.FindIndex(k => k.Id == apiKey.Id);
        if (index >= 0)
        {
            _apiKeys[index] = apiKey;
        }
    }

    public void RevokeApiKey(string keyId)
    {
        var apiKey = GetApiKey(keyId);
        if (apiKey != null && apiKey.Status == "active")
        {
            apiKey.Status = "revoked";
            apiKey.RevokedAt = DateTime.UtcNow;
            UpdateApiKey(apiKey);

            // Update market's API key count
            var market = GetMarket(apiKey.MarketId);
            if (market != null && market.ApiKeyCount > 0)
            {
                market.ApiKeyCount--;
                UpdateMarket(market);
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
