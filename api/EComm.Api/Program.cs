using EComm.Data;
using EComm.Api.Authentication;
using EComm.Api.Logging;
using EComm.Payment;
using EComm.Payment.Providers.NetsEasy;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Keep the most recent log lines in memory so GET /api/v1/admin/logs can serve them to an operator
// who has no console — what reaches the buffer is configured separately under Logging:Memory.
builder.Logging.AddMemoryLogger(builder.Configuration.GetSection("Logging:Memory"));

// Add DbContext
builder.Services.AddDbContext<ECommDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"]!;
var issuer = jwtSettings["Issuer"]!;
var audience = jwtSettings["Audience"]!;

// Configure dual authentication: JWT (for admin) + API Key (for showcase/integrations)
builder.Services.AddAuthentication(options =>
{
    // Default to JWT for admin endpoints
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero // Remove default 5 minute clock skew
    };

    // Support cookies for JWT token
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Check if token is in cookie
            if (context.Request.Cookies.ContainsKey("auth-token"))
            {
                context.Token = context.Request.Cookies["auth-token"];
            }
            return Task.CompletedTask;
        }
    };
})
.AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
    ApiKeyAuthenticationDefaults.AuthenticationScheme,
    options => { });

// Configure authorization policies
builder.Services.AddAuthorization(options =>
{
    // Default policy: require either JWT or API Key
    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, ApiKeyAuthenticationDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();

    // Admin-only policy: require JWT (not API keys)
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme);
        policy.RequireAuthenticatedUser();
    });

    // Admin backoffice OR a valid API key — for endpoints the Umbraco plugin manages via its
    // API key (which AdminOnly rejects, being JWT-only). Requires an authenticated caller.
    options.AddPolicy("AdminOrApiKey", policy =>
    {
        policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, ApiKeyAuthenticationDefaults.AuthenticationScheme);
        policy.RequireAuthenticatedUser();
    });
});

// Add services to the container
builder.Services.AddControllers();

// Payments: generic provider infrastructure + the concrete providers we ship. Each provider
// self-registers its own dependencies; add a line here to enable another one.
builder.Services.AddPaymentProviders();
builder.Services.AddNetsEasyPaymentProvider();

// Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "eCommerce API",
        Version = "v1",
        Description = "API server for eCommerce SaaS Platform. " +
                      "Provides endpoints for products, categories, cart, orders, tenants, markets, and admin operations.",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "UKAD Development Team"
        }
    });

    // Include XML comments for better documentation
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// Add CORS (Cors:AllowedOrigins in config / Cors__AllowedOrigins__N in env)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ??
    [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5025",
        "http://localhost:8640"
    ];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ECommDbContext>();

    // Ensure database is created
    context.Database.EnsureCreated();

    // Additive column upgrades for an already-existing ecomm.db (EnsureCreated is a no-op there)
    SchemaUpgrader.EnsureOrderPaymentFeeColumns(context);
    SchemaUpgrader.EnsurePaymentWebhookSchema(context);
    SchemaUpgrader.EnsureCartSchema(context);

    // Seed data
    DatabaseSeeder.SeedDatabase(context);
}

// Initialize DataStore with DbContextOptions (factory pattern for thread safety)
var dbContextOptions = new DbContextOptionsBuilder<ECommDbContext>()
    .UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
    .Options;
DataStore.Instance.InitializeDatabase(dbContextOptions);

// Configure the HTTP request pipeline

// Deployed, TLS is terminated at the ingress and this process is handed plain HTTP, so Request.Scheme
// reads "http" for a request the client made over https — and anything built from it comes out on a
// scheme the caller can't use. That matters most for the payment webhook callback URL, which a
// gateway will refuse if it isn't https. Trust the proxy's X-Forwarded-Proto so the scheme reflects
// how the client actually connected.
// The scheme only: the original Host header arrives intact, and not honouring X-Forwarded-Host means
// a request that reaches this container directly can't talk us into generating URLs for someone
// else's host. The known-proxy lists are cleared because the ingress's pod IP isn't predictable —
// safe while this container is reachable only through the ingress (a ClusterIP service).
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto,
    KnownNetworks = { },
    KnownProxies = { }
});

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "eCommerce API v1");
    options.RoutePrefix = "swagger"; // Serve Swagger UI at /swagger
    options.DocumentTitle = "eCommerce API - Swagger UI";
});

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

var uploadPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadPath))
{
    Directory.CreateDirectory(uploadPath);
}

// Enable static file serving for uploaded images with caching
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadPath),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        // Cache images for 7 days (604800 seconds)
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=604800");
        ctx.Context.Response.Headers.Append("Expires", DateTime.UtcNow.AddDays(7).ToString("R"));
    }
});

app.MapControllers();

app.Run();
