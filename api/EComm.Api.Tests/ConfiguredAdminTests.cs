using EComm.Data;
using EComm.Data.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// A deployment supplies its own admin via Admin:Email / Admin:Password (Admin__Email /
/// Admin__Password as env vars). This is the branch that decides whether the seeded "password123"
/// demo accounts can still log in, so it gets a test: getting it wrong either locks the operator out
/// or leaves a public superadmin on the cluster.
/// </summary>
public class ConfiguredAdminTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("", "")]
    [InlineData("   ", "   ")]
    [InlineData("admin@corp.com", "")]     // half-configured counts as not configured
    [InlineData("", "s3cret")]
    public void WithoutBothValues_TheDemoUsersAreLeftAlone(string? email, string? password)
    {
        using var connection = OpenSeeded();
        using var context = ContextOver(connection);

        Assert.False(DatabaseSeeder.ApplyConfiguredAdmin(context, email, password));

        var users = context.Users.ToList();
        Assert.Equal(3, users.Count);
        Assert.All(users, u => Assert.True(u.IsActive));
    }

    [Fact]
    public void ConfiguredCredentials_BecomeTheOnlyLoginThatWorks()
    {
        using var connection = OpenSeeded();
        using var context = ContextOver(connection);

        Assert.True(DatabaseSeeder.ApplyConfiguredAdmin(context, "owner@corp.com", "s3cret-pw"));

        var active = context.Users.Where(u => u.IsActive).ToList();
        var admin = Assert.Single(active);
        Assert.Equal("owner@corp.com", admin.Email);
        Assert.Equal("SUPERADMIN", admin.Role);
        Assert.Null(admin.TenantId);
        Assert.True(BCrypt.Net.BCrypt.Verify("s3cret-pw", admin.PasswordHash));

        // The seeded superadmin specifically: AuthController filters on IsActive, so this is what
        // stops admin@platform.com / password123 from logging in on a deployed instance.
        var demo = context.Users.Single(u => u.Email == "admin@platform.com");
        Assert.False(demo.IsActive);
        Assert.True(BCrypt.Net.BCrypt.Verify("password123", demo.PasswordHash)); // deactivated, not rewritten
    }

    [Fact]
    public void RotatingThePassword_TakesEffectOnTheNextStartup()
    {
        using var connection = OpenSeeded();
        using var context = ContextOver(connection);

        DatabaseSeeder.ApplyConfiguredAdmin(context, "owner@corp.com", "old-pw");
        DatabaseSeeder.ApplyConfiguredAdmin(context, "OWNER@corp.com", "new-pw"); // case-insensitive match

        var admin = Assert.Single(context.Users.Where(u => u.IsActive));
        Assert.Equal("owner@corp.com", admin.Email);              // no duplicate row for the new casing
        Assert.True(BCrypt.Net.BCrypt.Verify("new-pw", admin.PasswordHash));
        Assert.False(BCrypt.Net.BCrypt.Verify("old-pw", admin.PasswordHash));
    }

    [Fact]
    public void RemovingTheConfiguration_GivesTheDemoUsersBack()
    {
        // Otherwise a developer who once exported Admin__Email locks themselves out of their own
        // machine, with no UI to switch the seeded users back on.
        using var connection = OpenSeeded();
        using var context = ContextOver(connection);

        DatabaseSeeder.ApplyConfiguredAdmin(context, "owner@corp.com", "s3cret-pw");
        Assert.False(DatabaseSeeder.ApplyConfiguredAdmin(context, null, null));

        var seeded = context.Users.Where(u => u.CreatedBy == "system").ToList();
        Assert.Equal(3, seeded.Count);
        Assert.All(seeded, u => Assert.True(u.IsActive));

        // The previously configured admin keeps working. The k8s secret is mounted optional: true,
        // so absent config can mean "the secret went missing", and revoking the only real account
        // on that reading would lock an operator out of a live cluster. This branch only ever
        // switches accounts back on.
        Assert.True(context.Users.Single(u => u.Email == "owner@corp.com").IsActive);
    }

    /// <summary>An in-memory database holding the three seeded demo users.</summary>
    private static SqliteConnection OpenSeeded()
    {
        var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();

        using var context = ContextOver(connection);
        context.Database.EnsureCreated();
        context.Users.AddRange(
            DemoUser("user-1", "admin@platform.com", "SUPERADMIN", null),
            DemoUser("user-2", "admin@demostore.com", "TENANT_ADMIN", "tenant-a"),
            DemoUser("user-3", "catalog@demostore.com", "TENANT_USER", "tenant-a"));
        context.SaveChanges();

        return connection;
    }

    private static User DemoUser(string id, string email, string role, string? tenantId) => new()
    {
        Id = id,
        Email = email,
        DisplayName = id,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
        Role = role,
        TenantId = tenantId,
        IsActive = true,
        CreatedAt = new DateTime(2024, 1, 1),
        CreatedBy = "system"
    };

    private static ECommDbContext ContextOver(SqliteConnection connection)
        => new(new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options);
}
