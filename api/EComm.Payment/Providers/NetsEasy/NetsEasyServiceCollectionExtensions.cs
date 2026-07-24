namespace EComm.Payment.Providers.NetsEasy;

/// <summary>
/// Self-registration for the Nets Easy provider. This is the only place Nets-specific DI lives —
/// call it from Program.cs after <c>AddPaymentProviders()</c> to enable Nets as a provider.
/// </summary>
public static class NetsEasyServiceCollectionExtensions
{
    public static IServiceCollection AddNetsEasyPaymentProvider(this IServiceCollection services)
    {
        // Typed client — HttpClientFactory manages handler pooling; no named-client magic string.
        services.AddHttpClient<INetsEasyClient, NetsEasyClient>();
        services.AddScoped<IPaymentProvider, NetsEasyPaymentProvider>();
        return services;
    }
}
