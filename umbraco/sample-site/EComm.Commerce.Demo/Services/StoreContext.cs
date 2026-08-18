using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Extensions;

namespace EComm.Commerce.Demo.Services;

/// <summary>
/// Resolves which store (market) the shopper is in, and carries it across the requests that have
/// no content node to resolve from.
///
/// Reads come from the tree: a category/product page walks up to the nearest ancestor carrying
/// <c>storeId</c> - normally the store root. That mirrors the plugin's own
/// <c>CategoryPickerApiController.GetValueWithAncestorFallback</c>, so backoffice and storefront
/// agree on the store for a given node.
///
/// Writes (cart, checkout) can't do that: /cart and /checkout are reserved paths, routed outside
/// the content tree, so there is no current node and no ancestors. The store is therefore
/// remembered in a cookie alongside the existing <c>ecomm_session</c> cart cookie as the shopper
/// browses, and read back when the order is created. Without this an order always lands in the
/// globally configured market, whichever store the shopper actually shopped.
/// </summary>
public static class StoreContext
{
    public const string CookieName = "ecomm_store";

    private const string StoreIdPropertyAlias = "storeId";

    /// <summary>Nearest ancestor-or-self value of <c>storeId</c>, or null if nothing sets it.</summary>
    public static string? Resolve(IPublishedContent? content)
    {
        for (var node = content; node != null; node = node.Parent())
        {
            var storeId = node.Value<string>(StoreIdPropertyAlias);
            if (!string.IsNullOrWhiteSpace(storeId)) return storeId;
        }

        return null;
    }

    /// <summary>Resolves the store for this page and remembers it for the cart/checkout requests.</summary>
    public static string? ResolveAndRemember(IPublishedContent? content, HttpContext httpContext)
    {
        var storeId = Resolve(content);
        if (string.IsNullOrWhiteSpace(storeId)) return null;

        // Only rewrite the cookie when the store actually changes - avoids a Set-Cookie on
        // every catalogue page view.
        if (httpContext.Request.Cookies[CookieName] == storeId) return storeId;

        httpContext.Response.Cookies.Append(CookieName, storeId, new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(30)
        });

        return storeId;
    }

    /// <summary>The remembered store, for requests with no content node (cart, checkout).</summary>
    public static string? Current(HttpContext? httpContext)
        => httpContext?.Request.Cookies[CookieName];
}
