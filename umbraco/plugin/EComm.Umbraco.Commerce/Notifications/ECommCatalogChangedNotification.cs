using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace EComm.Umbraco.Commerce.Notifications;

/// <summary>
/// Published when the EComm catalog changes (a product is created/updated/deleted) so consumers can drop
/// any catalog caches they hold. The plugin only announces the change; it does not know who caches what.
/// </summary>
public class ECommCatalogChangedNotification : INotification
{
    public ECommCatalogChangedNotification(string marketId, string? productId = null)
    {
        MarketId = marketId;
        ProductId = productId;
    }

    /// <summary>The market the change applies to (matches the market products are read under).</summary>
    public string MarketId { get; }

    /// <summary>The product that changed, when the change is scoped to one (null for bulk changes).</summary>
    public string? ProductId { get; }
}
