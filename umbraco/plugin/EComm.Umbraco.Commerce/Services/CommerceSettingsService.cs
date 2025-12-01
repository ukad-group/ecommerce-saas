using System.Text.Json;
using EComm.Umbraco.Commerce.Models;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Services;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Manages eCommerce settings stored in Umbraco's key-value store
/// </summary>
public class CommerceSettingsService : ICommerceSettingsService
{
    private readonly IKeyValueService _keyValueService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CommerceSettingsService> _logger;

    private const string SettingsKeyPrefix = "EComm.Commerce.";

    public CommerceSettingsService(
        IKeyValueService keyValueService,
        IHttpClientFactory httpClientFactory,
        ILogger<CommerceSettingsService> logger)
    {
        _keyValueService = keyValueService;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public Task<CommerceSettings?> GetSettingsAsync()
    {
        var apiBaseUrl = _keyValueService.GetValue($"{SettingsKeyPrefix}ApiBaseUrl");
        var tenantId = _keyValueService.GetValue($"{SettingsKeyPrefix}TenantId");
        var marketId = _keyValueService.GetValue($"{SettingsKeyPrefix}MarketId");
        var apiKey = _keyValueService.GetValue($"{SettingsKeyPrefix}ApiKey");

        if (string.IsNullOrEmpty(apiBaseUrl))
        {
            return Task.FromResult<CommerceSettings?>(null);
        }

        return Task.FromResult<CommerceSettings?>(new CommerceSettings
        {
            ApiBaseUrl = apiBaseUrl,
            TenantId = tenantId ?? string.Empty,
            MarketId = marketId ?? string.Empty,
            ApiKey = apiKey ?? string.Empty
        });
    }

    public Task SaveSettingsAsync(CommerceSettings settings)
    {
        _keyValueService.SetValue($"{SettingsKeyPrefix}ApiBaseUrl", settings.ApiBaseUrl);
        _keyValueService.SetValue($"{SettingsKeyPrefix}TenantId", settings.TenantId);
        _keyValueService.SetValue($"{SettingsKeyPrefix}MarketId", settings.MarketId);
        _keyValueService.SetValue($"{SettingsKeyPrefix}ApiKey", settings.ApiKey);

        _logger.LogInformation("Commerce settings saved successfully");

        return Task.CompletedTask;
    }

    public async Task<ConnectionTestResult> TestConnectionAsync(CommerceSettings settings)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("ECommApi");

            // Build the API URL
            var baseUrl = settings.ApiBaseUrl.TrimEnd('/');
            var marketsUrl = $"{baseUrl}/tenants/{settings.TenantId}/markets";

            var request = new HttpRequestMessage(HttpMethod.Get, marketsUrl);

            // Add API key header if provided
            if (!string.IsNullOrEmpty(settings.ApiKey))
            {
                request.Headers.Add("X-API-Key", settings.ApiKey);
            }

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var markets = JsonSerializer.Deserialize<List<MarketInfo>>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return new ConnectionTestResult
                {
                    Success = true,
                    Message = $"Connection successful! Found {markets?.Count ?? 0} market(s).",
                    Markets = markets
                };
            }

            return new ConnectionTestResult
            {
                Success = false,
                Message = $"API returned {(int)response.StatusCode} {response.ReasonPhrase}"
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to connect to eCommerce API");
            return new ConnectionTestResult
            {
                Success = false,
                Message = $"Connection failed: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error testing eCommerce API connection");
            return new ConnectionTestResult
            {
                Success = false,
                Message = $"Unexpected error: {ex.Message}"
            };
        }
    }
}
