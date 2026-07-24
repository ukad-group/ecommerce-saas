namespace EComm.Payment;

/// <summary>
/// Registers the generic payment infrastructure. Concrete gateways register themselves via their
/// own <c>Add{Provider}PaymentProvider()</c> extension — this method knows about none of them.
/// </summary>
public static class PaymentProviderExtensions
{
    public static IServiceCollection AddPaymentProviders(this IServiceCollection services)
    {
        services.AddScoped<IPaymentProviderResolver, PaymentProviderResolver>();
        return services;
    }
}
