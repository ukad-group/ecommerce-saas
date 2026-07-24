using EComm.Data.Entities;

namespace EComm.Payment;

/// <summary>
/// Indexes every registered <see cref="IPaymentProvider"/> by alias. Selection is data/config
/// driven — there is no hardcoded provider here.
/// </summary>
public class PaymentProviderResolver : IPaymentProviderResolver
{
    private readonly IReadOnlyDictionary<string, IPaymentProvider> _providers;
    private readonly string? _defaultAlias;

    public PaymentProviderResolver(IEnumerable<IPaymentProvider> providers, IConfiguration configuration)
    {
        _providers = providers.ToDictionary(p => p.Alias, StringComparer.OrdinalIgnoreCase);
        _defaultAlias = configuration["Payments:DefaultProvider"];
    }

    public IPaymentProvider? Resolve(string? alias)
    {
        if (!string.IsNullOrWhiteSpace(alias))
            return _providers.TryGetValue(alias, out var provider) ? provider : null;

        // No alias given: use the configured default, else the sole registered provider.
        if (!string.IsNullOrWhiteSpace(_defaultAlias) && _providers.TryGetValue(_defaultAlias, out var fallback))
            return fallback;

        return _providers.Count == 1 ? _providers.Values.First() : null;
    }

    public IPaymentProvider? ResolveForMarket(Market market)
        => Resolve(market.Settings?.PaymentProvider);
}
