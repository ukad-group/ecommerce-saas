var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();

// Add Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "eCommerce Mock API",
        Version = "v1",
        Description = "Mock API server for eCommerce SaaS Platform development and testing. " +
                      "This API provides mock endpoints for products, categories, cart, orders, tenants, markets, and admin operations.",
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

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "eCommerce Mock API v1");
    options.RoutePrefix = string.Empty; // Serve Swagger UI at root (http://localhost:5180/)
    options.DocumentTitle = "eCommerce Mock API - Swagger UI";
});

app.UseCors();
app.MapControllers();

app.Run();
