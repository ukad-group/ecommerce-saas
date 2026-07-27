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

    [HttpGet("order-statuses")]
    [ProducesResponseType(typeof(List<OrderStatusDefinition>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrderStatuses()
    {
        var statuses = await _apiClient.GetOrderStatusDefinitionsAsync();
        return Ok(statuses);
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
    [ProducesResponseType(typeof(List<TaxClass>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTaxClasses([FromQuery] string? marketId = null)
    {
        var taxClasses = await _apiClient.GetTaxClassesAsync(marketId);
        return Ok(taxClasses);
    }

    [HttpPut("tax-classes")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateTaxClasses([FromQuery] string? marketId, [FromBody] UpdateTaxClassesRequest request)
    {
        var ok = await _apiClient.UpdateTaxClassesAsync(marketId, request.TaxClasses);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update tax classes");
    }
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
}

public class UpdateAttributesRequest
{
    public List<ProductAttribute> Attributes { get; set; } = new();
}

public class UpdateAttributePresetsRequest
{
    public List<ProductAttributePreset> Presets { get; set; } = new();
}
