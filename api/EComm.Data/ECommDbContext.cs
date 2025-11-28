using Microsoft.EntityFrameworkCore;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Product;
using EComm.Data.ValueObjects.Tenant;
using System.Text.Json;

namespace EComm.Data;

public class ECommDbContext : DbContext
{
    public ECommDbContext(DbContextOptions<ECommDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Market> Markets => Set<Market>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<OrderStatus> OrderStatuses => Set<OrderStatus>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Product entity
        modelBuilder.Entity<Product>(entity =>
        {
            // Use composite key (Id + Version) to support product versioning
            entity.HasKey(e => new { e.Id, e.Version });
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.TenantId).IsRequired();
            entity.Property(e => e.MarketId).IsRequired();
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.Price).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SalePrice).HasColumnType("decimal(18,2)");

            // Store complex types as JSON
            entity.Property(e => e.Images)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

            entity.Property(e => e.CategoryIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

            entity.Property(e => e.Metadata)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<Dictionary<string, object>>(v, (JsonSerializerOptions?)null));

            entity.Property(e => e.VariantOptions)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<List<VariantOption>>(v, (JsonSerializerOptions?)null));

            entity.Property(e => e.Variants)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<List<ProductVariant>>(v, (JsonSerializerOptions?)null));

            entity.Property(e => e.CustomProperties)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<List<CustomProperty>>(v, (JsonSerializerOptions?)null));

            // Ignore computed properties
            entity.Ignore(e => e.CategoryId);

            // Create indexes for common queries
            entity.HasIndex(e => new { e.TenantId, e.MarketId, e.IsCurrentVersion });
            entity.HasIndex(e => e.Status);
        });

        // Configure Category entity
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.TenantId).IsRequired();
            entity.Property(e => e.MarketId).IsRequired();
            entity.Property(e => e.Name).IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.MarketId });
        });

        // Configure Order entity
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.TenantId).IsRequired();
            entity.Property(e => e.MarketId).IsRequired();
            entity.Property(e => e.OrderNumber).IsRequired();
            entity.Property(e => e.Subtotal).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Tax).HasColumnType("decimal(18,2)");
            entity.Property(e => e.ShippingCost).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Total).HasColumnType("decimal(18,2)");

            // Store complex types as JSON
            entity.Property(e => e.Customer)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<CustomerInfo>(v, (JsonSerializerOptions?)null) ?? new CustomerInfo());

            entity.Property(e => e.ShippingAddress)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Address>(v, (JsonSerializerOptions?)null) ?? new Address());

            entity.Property(e => e.BillingAddress)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<Address>(v, (JsonSerializerOptions?)null));

            entity.Property(e => e.Items)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<OrderItem>>(v, (JsonSerializerOptions?)null) ?? new List<OrderItem>());

            entity.HasIndex(e => new { e.TenantId, e.MarketId });
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.OrderNumber);
        });

        // Configure Tenant entity
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.DisplayName).IsRequired();
            entity.Property(e => e.ContactEmail).IsRequired();

            entity.Property(e => e.Address)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<Address>(v, (JsonSerializerOptions?)null));

            entity.Property(e => e.Settings)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<TenantSettings>(v, (JsonSerializerOptions?)null));

            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Configure Market entity
        modelBuilder.Entity<Market>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.TenantId).IsRequired();
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.Code).IsRequired();

            entity.Property(e => e.Address)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<Address>(v, (JsonSerializerOptions?)null));

            entity.Property(e => e.Settings)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<MarketSettings>(v, (JsonSerializerOptions?)null));

            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        });

        // Configure ApiKey entity
        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.TenantId).IsRequired();
            entity.Property(e => e.MarketId).IsRequired();
            entity.Property(e => e.KeyHash).IsRequired();

            entity.HasIndex(e => new { e.TenantId, e.MarketId });
            entity.HasIndex(e => e.KeyHash);
            entity.HasIndex(e => e.Status);
        });

        // Configure OrderStatus entity
        modelBuilder.Entity<OrderStatus>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.TenantId).IsRequired();
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.Code).IsRequired();
            entity.Property(e => e.Color).IsRequired();

            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        });

        // Configure User entity
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).IsRequired();
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.DisplayName).IsRequired();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Role).IsRequired();

            // Store AssignedMarketIds as JSON
            entity.Property(e => e.AssignedMarketIds)
                .HasConversion(
                    v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => v == null ? null : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null));

            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.TenantId);
            entity.HasIndex(e => e.IsActive);
        });
    }
}
