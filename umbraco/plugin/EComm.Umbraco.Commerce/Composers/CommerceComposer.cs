using EComm.Umbraco.Commerce.ContentFinders;
using EComm.Umbraco.Commerce.Controllers;
using EComm.Umbraco.Commerce.Migrations;
using EComm.Umbraco.Commerce.Services;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Web.Common.ApplicationBuilder;

namespace EComm.Umbraco.Commerce.Composers;

/// <summary>
/// Registers eCommerce plugin services and components
/// </summary>
public class CommerceComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Register HTTP client
        builder.Services.AddHttpClient("ECommApi", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // Register services
        builder.Services.AddScoped<ICommerceSettingsService, CommerceSettingsService>();
        builder.Services.AddScoped<ICommerceApiClient, CommerceApiClient>();
        // Storefront image URL builder — applies the configured crop + focal point at render time
        builder.Services.AddScoped<IProductImageUrlHelper, ProductImageUrlHelper>();

        // Photo provider (external photo sources; one active at a time, resolved by settings key)
        builder.Services.AddScoped<PhotoProviderSettingsService>();
        builder.Services.AddSingleton<IPhotoStorageProvider, AzureBlobPhotoProvider>();

        // Note: API controllers with [MapToApi] attribute are automatically discovered by Umbraco
        // No manual registration needed

        // Register content finder for product URL routing
        // Note: ContentFinderByUrl is obsolete in Umbraco 17, using ContentFinderByUrlNew
        builder.ContentFinders()
            .InsertBefore<ContentFinderByUrlNew, ProductContentFinder>();

        // Grant the Commerce section to the Administrators group on first boot
        builder.AddNotificationAsyncHandler<UmbracoApplicationStartingNotification, CommerceMigrationHandler>();
    }
}
