using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EComm.Payment.Providers.NetsEasy;

/// <summary>
/// Direct HttpClient wrapper around Nets Easy's Payment API (no third-party SDK — Nets doesn't
/// publish an official .NET one, and their own docs recommend calling the REST API directly).
/// https://api.dibspayment.eu (live) / https://test.api.dibspayment.eu (test), auth via a raw
/// "Authorization: &lt;secretKey&gt;" header (no Bearer prefix).
///
/// The injected <see cref="HttpClient"/> is never mutated — base URL and the per-market auth header
/// vary per call, so each request is built as its own absolute-URI <see cref="HttpRequestMessage"/>.
/// That keeps the client safe to share as a typed client.
/// </summary>
public class NetsEasyClient : INetsEasyClient
{
    private static readonly Uri LiveBaseUri = new("https://api.dibspayment.eu");
    private static readonly Uri TestBaseUri = new("https://test.api.dibspayment.eu");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        // Omit null members (e.g. optional consumer sub-objects) — Nets rejects a bad/empty field.
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _http;
    private readonly ILogger<NetsEasyClient> _logger;

    public NetsEasyClient(HttpClient http, ILogger<NetsEasyClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    private static Uri Endpoint(bool testMode, string path) => new(testMode ? TestBaseUri : LiveBaseUri, path);

    private static HttpRequestMessage Build(HttpMethod method, bool testMode, string path, string secretApiKey, object? body = null)
    {
        var msg = new HttpRequestMessage(method, Endpoint(testMode, path));
        msg.Headers.TryAddWithoutValidation("Authorization", secretApiKey);
        if (body != null)
            msg.Content = JsonContent.Create(body, options: JsonOptions);
        return msg;
    }

    public async Task<NetsCreatePaymentResult?> CreatePaymentAsync(string secretApiKey, bool testMode, NetsCreatePaymentRequest request)
    {
        using var msg = Build(HttpMethod.Post, testMode, "/v1/payments", secretApiKey, request);

        // The outbound body is the only way to tell "Nets ignored our consumer prefill" apart from
        // "we never sent one" when the hosted page comes up with empty fields. Contains no secrets —
        // the key travels in the Authorization header, not the body.
        if (_logger.IsEnabled(LogLevel.Debug))
            _logger.LogDebug("Nets create-payment request: {Body}", JsonSerializer.Serialize(request, JsonOptions));

        var response = await _http.SendAsync(msg);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Nets create-payment failed: {Status} {Body}. Request was: {Request}",
                response.StatusCode,
                await response.Content.ReadAsStringAsync(),
                JsonSerializer.Serialize(request, JsonOptions));
            return null;
        }
        return await response.Content.ReadFromJsonAsync<NetsCreatePaymentResult>(JsonOptions);
    }

    public async Task<NetsPaymentStatusResponse?> GetPaymentAsync(string secretApiKey, bool testMode, string paymentId)
    {
        using var msg = Build(HttpMethod.Get, testMode, $"/v1/payments/{paymentId}", secretApiKey);
        var response = await _http.SendAsync(msg);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Nets get-payment failed for {PaymentId}: {Status}", paymentId, response.StatusCode);
            return null;
        }
        return await response.Content.ReadFromJsonAsync<NetsPaymentStatusResponse>(JsonOptions);
    }

    public async Task<NetsChargeResult?> ChargePaymentAsync(string secretApiKey, bool testMode, string paymentId, int amountMinorUnits)
    {
        using var msg = Build(HttpMethod.Post, testMode, $"/v1/payments/{paymentId}/charges", secretApiKey, new NetsChargeRequest { Amount = amountMinorUnits });
        var response = await _http.SendAsync(msg);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Nets charge failed for {PaymentId}: {Status} {Body}", paymentId, response.StatusCode, await response.Content.ReadAsStringAsync());
            return null;
        }
        return await response.Content.ReadFromJsonAsync<NetsChargeResult>(JsonOptions);
    }
}
