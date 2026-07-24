using EComm.Data.Entities;

namespace EComm.Payment;

/// <summary>Picks the <see cref="IPaymentProvider"/> to use for a request.</summary>
public interface IPaymentProviderResolver
{
    /// <summary>Descriptors for every registered provider — the catalog a UI offers when adding one.</summary>
    IReadOnlyCollection<PaymentProviderDescriptor> Descriptors { get; }

    /// <summary>
    /// Resolve by explicit alias. When <paramref name="alias"/> is null/empty, falls back to the
    /// configured default (<c>Payments:DefaultProvider</c>) or the sole registered provider.
    /// Returns <c>null</c> when the alias is unknown or no default can be determined.
    /// </summary>
    IPaymentProvider? Resolve(string? alias);

    /// <summary>Resolve for a market, using its <c>MarketSettings.PaymentProvider</c> alias.</summary>
    IPaymentProvider? ResolveForMarket(Market market);
}
