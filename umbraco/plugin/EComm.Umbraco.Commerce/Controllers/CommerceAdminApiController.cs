using EComm.Umbraco.Commerce.Models;
using EComm.Umbraco.Commerce.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Web.Common.Authorization;

namespace EComm.Umbraco.Commerce.Controllers;

[ApiController]
[MapToApi("ecomm-commerce")]
[Route("umbraco/management/api/ecomm-commerce")]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
public class CommerceAdminApiController : ManagementApiControllerBase
{
    private readonly ICommerceApiClient _apiClient;

    public CommerceAdminApiController(ICommerceApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    // ── Markets ───────────────────────────────────────────────────────────────

    [HttpGet("markets")]
    [ProducesResponseType(typeof(List<MarketInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMarkets()
    {
        var markets = await _apiClient.GetMarketsAsync();
        return Ok(markets);
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    [HttpGet("orders")]
    [ProducesResponseType(typeof(OrderListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] string? marketId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _apiClient.GetOrdersAsync(status, page, pageSize, search, marketId);
        return Ok(result);
    }

    [HttpGet("orders/{orderId}")]
    [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOrder(string orderId)
    {
        var order = await _apiClient.GetOrderAsync(orderId);
        if (order == null)
            return NotFound();
        return Ok(order);
    }

    [HttpPut("orders/{orderId}/status")]
    [ProducesResponseType(typeof(Order), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var updated = await _apiClient.UpdateOrderStatusAsync(orderId, request.Status, request.Notes);
        if (updated == null)
            return NotFound();
        return Ok(updated);
    }

    // ── Carts ─────────────────────────────────────────────────────────────────

    [HttpGet("carts")]
    [ProducesResponseType(typeof(CartListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCarts(
        [FromQuery] string? search = null,
        [FromQuery] string? marketId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _apiClient.GetCartsAsync(page, pageSize, search, marketId);
        return Ok(result);
    }

    // Statuses belong to a store, so every one of these takes the store the dashboard has selected.
    [HttpGet("order-statuses")]
    [ProducesResponseType(typeof(List<OrderStatusDefinition>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrderStatuses([FromQuery] string? marketId = null)
    {
        var statuses = await _apiClient.GetOrderStatusDefinitionsAsync(marketId);
        return Ok(statuses);
    }

    [HttpPost("order-statuses")]
    [ProducesResponseType(typeof(OrderStatusDefinition), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateOrderStatus([FromBody] OrderStatusDefinition status, [FromQuery] string? marketId = null)
    {
        var (created, error) = await _apiClient.CreateOrderStatusDefinitionAsync(status, marketId);
        return created != null ? Ok(created) : BadRequest(error);
    }

    [HttpPut("order-statuses/{id}")]
    [ProducesResponseType(typeof(OrderStatusDefinition), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] OrderStatusDefinition status, [FromQuery] string? marketId = null)
    {
        var (updated, error) = await _apiClient.UpdateOrderStatusDefinitionAsync(id, status, marketId);
        return updated != null ? Ok(updated) : BadRequest(error);
    }

    [HttpDelete("order-statuses/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteOrderStatus(string id, [FromQuery] string? marketId = null)
    {
        var error = await _apiClient.DeleteOrderStatusDefinitionAsync(id, marketId);
        return error == null ? NoContent() : BadRequest(error);
    }

    // ── Property Templates ────────────────────────────────────────────────────

    [HttpGet("property-templates")]
    [ProducesResponseType(typeof(List<PropertyTemplate>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPropertyTemplates([FromQuery] string? marketId = null)
    {
        var templates = await _apiClient.GetPropertyTemplatesAsync(marketId);
        return Ok(templates);
    }

    [HttpPut("property-templates")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePropertyTemplates([FromQuery] string marketId, [FromBody] UpdatePropertyTemplatesRequest request)
    {
        var ok = await _apiClient.UpdatePropertyTemplatesAsync(marketId, request.Templates);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update property templates");
    }

    // ── Product Attributes + presets ───────────────────────────────────────────

    [HttpGet("attributes")]
    [ProducesResponseType(typeof(List<ProductAttribute>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAttributes([FromQuery] string? marketId = null)
    {
        var attributes = await _apiClient.GetAttributesAsync(marketId);
        return Ok(attributes);
    }

    [HttpPut("attributes")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateAttributes([FromQuery] string? marketId, [FromBody] UpdateAttributesRequest request)
    {
        var ok = await _apiClient.UpdateAttributesAsync(marketId, request.Attributes);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update attributes");
    }

    [HttpGet("attribute-presets")]
    [ProducesResponseType(typeof(List<ProductAttributePreset>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAttributePresets([FromQuery] string? marketId = null)
    {
        var presets = await _apiClient.GetAttributePresetsAsync(marketId);
        return Ok(presets);
    }

    [HttpPut("attribute-presets")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateAttributePresets([FromQuery] string? marketId, [FromBody] UpdateAttributePresetsRequest request)
    {
        var ok = await _apiClient.UpdateAttributePresetsAsync(marketId, request.Presets);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update attribute presets");
    }

    // ── Discounts ─────────────────────────────────────────────────────────────

    [HttpGet("discounts")]
    [ProducesResponseType(typeof(List<Discount>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDiscounts([FromQuery] string? marketId = null)
    {
        var discounts = await _apiClient.GetDiscountsAsync(marketId);
        return Ok(discounts);
    }

    [HttpPost("discounts")]
    [ProducesResponseType(typeof(Discount), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateDiscount([FromBody] Discount discount)
    {
        var created = await _apiClient.CreateDiscountAsync(discount);
        if (created == null)
            return StatusCode(StatusCodes.Status502BadGateway, "Failed to create discount");
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("discounts/{id}")]
    [ProducesResponseType(typeof(Discount), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDiscount(string id, [FromBody] Discount discount)
    {
        var updated = await _apiClient.UpdateDiscountAsync(id, discount);
        if (updated == null)
            return NotFound();
        return Ok(updated);
    }

    [HttpDelete("discounts/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteDiscount(string id)
    {
        var ok = await _apiClient.DeleteDiscountAsync(id);
        return ok ? NoContent() : StatusCode(StatusCodes.Status502BadGateway, "Failed to delete discount");
    }

    // ── Payment providers ───────────────────────────────────────────────────────

    [HttpGet("payment-providers/catalog")]
    public async Task<IActionResult> GetPaymentProviderCatalog()
        => Ok(await _apiClient.GetPaymentProviderCatalogAsync());

    [HttpGet("payment-providers")]
    public async Task<IActionResult> GetMarketPaymentProviders([FromQuery] string marketId)
        => Ok(await _apiClient.GetMarketPaymentProvidersAsync(marketId));

    [HttpPut("payment-providers/{alias}")]
    public async Task<IActionResult> UpsertPaymentProvider(string alias, [FromQuery] string marketId, [FromBody] System.Text.Json.JsonElement settings)
        => Ok(await _apiClient.UpsertMarketPaymentProviderAsync(marketId, alias, settings));

    [HttpDelete("payment-providers/{alias}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeletePaymentProvider(string alias, [FromQuery] string marketId)
    {
        var ok = await _apiClient.DeleteMarketPaymentProviderAsync(marketId, alias);
        return ok ? NoContent() : StatusCode(StatusCodes.Status502BadGateway, "Failed to delete payment provider");
    }

    [HttpGet("payment-providers/{alias}/secrets/{key}")]
    public async Task<IActionResult> GetPaymentProviderSecret(string alias, string key, [FromQuery] string marketId)
        => Ok(await _apiClient.GetPaymentProviderSecretAsync(marketId, alias, key));

    [HttpPut("active-payment-provider")]
    public async Task<IActionResult> SetActivePaymentProvider([FromQuery] string marketId, [FromBody] SetActivePaymentProviderRequest request)
        => Ok(await _apiClient.SetActivePaymentProviderAsync(marketId, request.Alias));

    [HttpPut("order-status-after-payment")]
    public async Task<IActionResult> SetOrderStatusAfterPayment([FromQuery] string marketId, [FromBody] SetOrderStatusAfterPaymentRequest request)
        => Ok(await _apiClient.SetOrderStatusAfterPaymentAsync(marketId, request.Code));

    [HttpPut("payment-providers/{alias}/surcharge")]
    public async Task<IActionResult> SetPaymentSurcharge(string alias, [FromQuery] string marketId, [FromBody] System.Text.Json.JsonElement surcharge)
        => Ok(await _apiClient.SetPaymentSurchargeAsync(marketId, alias, surcharge));

    [HttpDelete("payment-providers/{alias}/surcharge")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeletePaymentSurcharge(string alias, [FromQuery] string marketId)
    {
        var ok = await _apiClient.DeletePaymentSurchargeAsync(marketId, alias);
        return ok ? NoContent() : StatusCode(StatusCodes.Status502BadGateway, "Failed to delete surcharge");
    }

    // ── Countries ────────────────────────────────────────────────────────────────

    /// <summary>The full ISO country reference list — unfiltered on purpose, since a tax-rate
    /// override is a country/tax-law concept independent of which countries a market ships to.</summary>
    [HttpGet("countries")]
    [ProducesResponseType(typeof(List<Country>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCountries()
        => Ok(await _apiClient.GetCountriesAsync());

    // ── Tax Classes ──────────────────────────────────────────────────────────────

    [HttpGet("tax-classes")]
    [ProducesResponseType(typeof(TaxClassesResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTaxClasses([FromQuery] string? marketId = null)
    {
        return Ok(await _apiClient.GetTaxClassesAsync(marketId));
    }

    [HttpPut("tax-classes")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateTaxClasses([FromQuery] string? marketId, [FromBody] UpdateTaxClassesRequest request)
    {
        var ok = await _apiClient.UpdateTaxClassesAsync(marketId, request.TaxClasses, request.TaxRate);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update tax classes");
    }

    // ── Currencies + store countries ──────────────────────────────────────────────

    [HttpGet("currencies")]
    [ProducesResponseType(typeof(CurrenciesResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrencies([FromQuery] string? marketId = null)
        => Ok(await _apiClient.GetCurrenciesAsync(marketId));

    [HttpPut("currencies")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateCurrencies([FromQuery] string? marketId, [FromBody] UpdateCurrenciesRequest request)
    {
        var ok = await _apiClient.UpdateCurrenciesAsync(marketId, request.Currencies);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update currencies");
    }

    /// <summary>The countries configured for this store — distinct from <c>countries</c> above, which
    /// is the ISO reference list the presets are created from.</summary>
    [HttpGet("market-countries")]
    [ProducesResponseType(typeof(MarketCountriesResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMarketCountries([FromQuery] string? marketId = null)
        => Ok(await _apiClient.GetMarketCountriesAsync(marketId));

    [HttpPut("market-countries")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateMarketCountries([FromQuery] string? marketId, [FromBody] UpdateMarketCountriesRequest request)
    {
        var ok = await _apiClient.UpdateMarketCountriesAsync(marketId, request.Countries);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update countries");
    }

    [HttpGet("currency-presets")]
    [ProducesResponseType(typeof(CurrencyPresetsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrencyPresets()
        => Ok(await _apiClient.GetCurrencyPresetsAsync());

    /// <summary>Delivery options for the store — the country editor's Default Shipping Method list.</summary>
    [HttpGet("shipping-methods")]
    [ProducesResponseType(typeof(List<ShippingMethod>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetShippingMethods([FromQuery] string? marketId = null)
        => Ok(await _apiClient.GetShippingMethodsAsync(marketId));
}

public class SetActivePaymentProviderRequest
{
    public string? Alias { get; set; }
}

public class SetOrderStatusAfterPaymentRequest
{
    public string? Code { get; set; }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class UpdatePropertyTemplatesRequest
{
    public List<PropertyTemplate> Templates { get; set; } = new();
}

public class UpdateTaxClassesRequest
{
    public List<TaxClass> TaxClasses { get; set; } = new();

    /// <summary>Null leaves the market's stored fallback rate untouched.</summary>
    public decimal? TaxRate { get; set; }
}

public class UpdateAttributesRequest
{
    public List<ProductAttribute> Attributes { get; set; } = new();
}

public class UpdateAttributePresetsRequest
{
    public List<ProductAttributePreset> Presets { get; set; } = new();
}

public class UpdateCurrenciesRequest
{
    public List<Currency> Currencies { get; set; } = new();
}

public class UpdateMarketCountriesRequest
{
    public List<MarketCountry> Countries { get; set; } = new();
}
