using EComm.Umbraco.Commerce.ContentFinders;
using EComm.Umbraco.Commerce.Services;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Routing;

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

        // Register content finder for product URL routing
        // Note: ContentFinderByUrl is obsolete in Umbraco 17, using ContentFinderByUrlNew
        builder.ContentFinders()
            .InsertBefore<ContentFinderByUrlNew, ProductContentFinder>();
    }
}
