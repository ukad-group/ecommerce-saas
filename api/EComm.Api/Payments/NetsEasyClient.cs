using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace EComm.Api.Payments;

/// <summary>
/// Direct HttpClient wrapper around Nets Easy's Payment API (no third-party SDK — Nets doesn't
/// publish an official .NET one, and their own docs recommend calling the REST API directly).
/// https://api.dibspayment.eu (live) / https://test.api.dibspayment.eu (test), auth via a raw
/// "Authorization: &lt;secretKey&gt;" header (no Bearer prefix).
/// </summary>
public class NetsEasyClient
{
    private static readonly Uri LiveBaseUri = new("https://api.dibspayment.eu");
    private static readonly Uri TestBaseUri = new("https://test.api.dibspayment.eu");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NetsEasyClient> _logger;

    public NetsEasyClient(IHttpClientFactory httpClientFactory, ILogger<NetsEasyClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private HttpClient CreateClient(string secretApiKey, bool testMode)
    {
        var client = _httpClientFactory.CreateClient("NetsEasy");
        client.BaseAddress = testMode ? TestBaseUri : LiveBaseUri;
        client.DefaultRequestHeaders.Authorization = null;
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", secretApiKey);
        return client;
    }

    public async Task<NetsCreatePaymentResult?> CreatePaymentAsync(string secretApiKey, bool testMode, NetsCreatePaymentRequest request)
    {
        var client = CreateClient(secretApiKey, testMode);
        var response = await client.PostAsJsonAsync("/v1/payments", request, JsonOptions);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Nets create-payment failed: {Status} {Body}", response.StatusCode, await response.Content.ReadAsStringAsync());
            return null;
        }
        return await response.Content.ReadFromJsonAsync<NetsCreatePaymentResult>(JsonOptions);
    }

    public async Task<NetsPaymentStatusResponse?> GetPaymentAsync(string secretApiKey, bool testMode, string paymentId)
    {
        var client = CreateClient(secretApiKey, testMode);
        var response = await client.GetAsync($"/v1/payments/{paymentId}");
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Nets get-payment failed for {PaymentId}: {Status}", paymentId, response.StatusCode);
            return null;
        }
        return await response.Content.ReadFromJsonAsync<NetsPaymentStatusResponse>(JsonOptions);
    }

    public async Task<NetsChargeResult?> ChargePaymentAsync(string secretApiKey, bool testMode, string paymentId, int amountMinorUnits)
    {
        var client = CreateClient(secretApiKey, testMode);
        var response = await client.PostAsJsonAsync($"/v1/payments/{paymentId}/charges", new NetsChargeRequest { Amount = amountMinorUnits }, JsonOptions);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Nets charge failed for {PaymentId}: {Status} {Body}", paymentId, response.StatusCode, await response.Content.ReadAsStringAsync());
            return null;
        }
        return await response.Content.ReadFromJsonAsync<NetsChargeResult>(JsonOptions);
    }
}
