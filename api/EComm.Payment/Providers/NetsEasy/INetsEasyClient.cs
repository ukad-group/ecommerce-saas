namespace EComm.Payment.Providers.NetsEasy;

/// <summary>Low-level HTTP operations against the Nets Easy Payment API. Mockable for tests.</summary>
public interface INetsEasyClient
{
    Task<NetsCreatePaymentResult?> CreatePaymentAsync(string secretApiKey, bool testMode, NetsCreatePaymentRequest request);
    Task<NetsPaymentStatusResponse?> GetPaymentAsync(string secretApiKey, bool testMode, string paymentId);
    Task<NetsChargeResult?> ChargePaymentAsync(string secretApiKey, bool testMode, string paymentId, int amountMinorUnits);
}
