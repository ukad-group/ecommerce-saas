using EComm.Commerce.Demo.Services;
using OpenIddict.Server.AspNetCore;
using Umbraco.Cms.Core.Configuration.Models;


WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Enable static web assets from referenced projects (required for plugin files)
builder.WebHost.UseStaticWebAssets();

// Register cart/checkout service for the demo site
builder.Services.AddScoped<StoreCartService>();

// Reserve /cart and /checkout so Umbraco's content routing skips them
builder.Services.PostConfigure<GlobalSettings>(settings =>
{
    if (!settings.ReservedPaths.Contains("~/cart"))
        settings.ReservedPaths = settings.ReservedPaths.TrimEnd(',') + ",~/cart,~/checkout";
});

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .Build();

// Allow HTTP for local development (no trusted dev cert required)
if (builder.Environment.IsDevelopment())
{
    builder.Services.Configure<OpenIddictServerAspNetCoreOptions>(options =>
    {
        options.DisableTransportSecurityRequirement = true;
    });
}

WebApplication app = builder.Build();

await app.BootUmbracoAsync();

// Enable static files middleware BEFORE Umbraco middleware to serve plugin files
app.UseStaticFiles();

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

// Register routes for Cart and Checkout controllers (reserved from Umbraco routing above)
app.MapControllerRoute("Cart", "cart/{action=Index}/{id?}", new { controller = "Cart" });
app.MapControllerRoute("Checkout", "checkout/{action=Index}/{id?}", new { controller = "Checkout" });
app.MapControllerRoute("CheckoutConfirmation", "checkout/confirmation/{id}", new { controller = "Checkout", action = "Confirmation" });

await app.RunAsync();
