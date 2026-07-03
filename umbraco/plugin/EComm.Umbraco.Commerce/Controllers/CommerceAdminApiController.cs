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

    // ── Option Presets ────────────────────────────────────────────────────────

    [HttpPut("option-presets")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateOptionPresets([FromBody] UpdateOptionPresetsRequest request)
    {
        var ok = await _apiClient.UpdateOptionPresetsAsync(request.Presets);
        return ok ? Ok() : StatusCode(StatusCodes.Status502BadGateway, "Failed to update option presets");
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
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class UpdateOptionPresetsRequest
{
    public List<OptionPreset> Presets { get; set; } = new();
}

public class UpdatePropertyTemplatesRequest
{
    public List<PropertyTemplate> Templates { get; set; } = new();
}
