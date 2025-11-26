using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EComm.Api.Data;
using EComm.Api.Models;

namespace EComm.Api.Controllers;

/// <summary>
/// Authentication controller for login/logout operations
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ECommDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(ECommDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        // Validate request
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { error = "Email and password are required" });
        }

        // Find user by email
        var user = _context.Users.FirstOrDefault(u => u.Email == request.Email && u.IsActive);
        if (user == null)
        {
            return Unauthorized(new { error = "Invalid email or password" });
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { error = "Invalid email or password" });
        }

        // Update last login timestamp
        user.LastLoginAt = DateTime.UtcNow;
        _context.SaveChanges();

        // Generate JWT token
        var token = GenerateJwtToken(user);

        // Set httpOnly cookie
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true, // Not accessible via JavaScript (XSS protection)
            Secure = true, // Only sent over HTTPS in production
            SameSite = SameSiteMode.Strict, // CSRF protection
            Expires = DateTime.UtcNow.AddHours(1)
        };
        Response.Cookies.Append("auth-token", token, cookieOptions);

        // Return user info (without password hash)
        return Ok(new
        {
            user = new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role,
                user.TenantId,
                user.AssignedMarketIds
            },
            token // Also return token for clients that can't use cookies
        });
    }

    /// <summary>
    /// Logout - clears the auth cookie
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // Clear the cookie
        Response.Cookies.Delete("auth-token");

        return Ok(new { message = "Logged out successfully" });
    }

    /// <summary>
    /// Get current user info (verifies token is valid)
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public IActionResult GetCurrentUser()
    {
        // Get user ID from JWT claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Find user
        var user = _context.Users.FirstOrDefault(u => u.Id == userIdClaim && u.IsActive);
        if (user == null)
        {
            return Unauthorized(new { error = "User not found or inactive" });
        }

        // Return user info
        return Ok(new
        {
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role,
            user.TenantId,
            user.AssignedMarketIds,
            user.LastLoginAt
        });
    }

    /// <summary>
    /// Generate JWT token for user
    /// </summary>
    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"]!;
        var issuer = jwtSettings["Issuer"]!;
        var audience = jwtSettings["Audience"]!;
        var expiryMinutes = int.Parse(jwtSettings["ExpiryMinutes"]!);

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role)
        };

        // Add tenant claim if user belongs to a tenant
        if (!string.IsNullOrEmpty(user.TenantId))
        {
            claims.Add(new Claim("TenantId", user.TenantId));
        }

        // Add market IDs as claims (for easy access in controllers)
        if (user.AssignedMarketIds != null && user.AssignedMarketIds.Any())
        {
            foreach (var marketId in user.AssignedMarketIds)
            {
                claims.Add(new Claim("MarketId", marketId));
            }
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

/// <summary>
/// Login request model
/// </summary>
public class LoginRequest
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}
