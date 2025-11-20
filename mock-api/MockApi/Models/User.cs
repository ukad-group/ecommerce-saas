namespace MockApi.Models;

/// <summary>
/// User entity for authentication and authorization
/// Represents an admin user with role-based access
/// </summary>
public class User
{
    /// <summary>
    /// Unique identifier for the user
    /// </summary>
    public required string Id { get; set; }

    /// <summary>
    /// User's email address (used for login)
    /// </summary>
    public required string Email { get; set; }

    /// <summary>
    /// User's full display name
    /// </summary>
    public required string DisplayName { get; set; }

    /// <summary>
    /// Hashed password (using BCrypt)
    /// For prototype: simple bcrypt hash, production will use EntraID
    /// </summary>
    public required string PasswordHash { get; set; }

    /// <summary>
    /// User's role (SUPERADMIN, TENANT_ADMIN, TENANT_USER)
    /// </summary>
    public required string Role { get; set; }

    /// <summary>
    /// Tenant ID this user belongs to (null for superadmin)
    /// </summary>
    public string? TenantId { get; set; }

    /// <summary>
    /// Markets this user has access to (null/empty for superadmin and tenant admin)
    /// </summary>
    public List<string>? AssignedMarketIds { get; set; }

    /// <summary>
    /// Whether the user account is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When the user account was created
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Last time the user successfully logged in
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Who created this user account
    /// </summary>
    public string? CreatedBy { get; set; }
}
