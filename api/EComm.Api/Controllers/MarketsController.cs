using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Tenant;
using EComm.Api.DTOs.Requests.Markets;
using EComm.Payment;

namespace EComm.Api.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/v1/admin/[controller]")]
public class MarketsController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;
    private readonly IPaymentProviderResolver _paymentProviders;

    public MarketsController(IPaymentProviderResolver paymentProviders)
    {
        _paymentProviders = paymentProviders;
    }

    [HttpGet]
    public ActionResult GetMarkets(
        [FromQuery] string? tenantId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10)
    {
        var markets = string.IsNullOrEmpty(tenantId)
            ? _store.GetMarkets()
            : _store.GetMarketsByTenant(tenantId);

        // Apply filters
        if (!string.IsNullOrEmpty(search))
        {
            markets = markets.Where(m =>
                m.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                m.Code.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(status))
        {
            markets = markets.Where(m => m.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrEmpty(type))
        {
            markets = markets.Where(m => m.Type.Equals(type, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        // Pagination
        var total = markets.Count;
        var paginatedMarkets = markets
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return Ok(new
        {
            data = paginatedMarkets,
            total = total,
            page = page,
            limit = limit
        });
    }

    [HttpGet("{id}")]
    public ActionResult<Market> GetMarket(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }
        return Ok(market);
    }

    [HttpPost]
    public ActionResult<Market> CreateMarket([FromBody] Market market)
    {
        if (string.IsNullOrEmpty(market.Id))
        {
            market.Id = $"market-{Guid.NewGuid().ToString().Substring(0, 8)}";
        }

        if (string.IsNullOrEmpty(market.TenantId) || string.IsNullOrEmpty(market.Name) || string.IsNullOrEmpty(market.Code))
        {
            return BadRequest(new { message = "TenantId, Name and Code are required" });
        }

        _store.AddMarket(market);
        return CreatedAtAction(nameof(GetMarket), new { id = market.Id }, market);
    }

    [HttpPut("{id}")]
    public ActionResult<Market> UpdateMarket(string id, [FromBody] UpdateMarketRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        // Update market properties
        if (!string.IsNullOrEmpty(request.Name))
        {
            market.Name = request.Name;
        }

        if (!string.IsNullOrEmpty(request.Code))
        {
            market.Code = request.Code;
        }

        if (!string.IsNullOrEmpty(request.Type))
        {
            market.Type = request.Type;
        }

        if (!string.IsNullOrEmpty(request.Currency))
        {
            market.Currency = request.Currency;
        }

        if (!string.IsNullOrEmpty(request.Timezone))
        {
            market.Timezone = request.Timezone;
        }

        market.UpdatedAt = DateTime.UtcNow;

        _store.UpdateMarket(market);

        return Ok(market);
    }

    [HttpDelete("{id}")]
    public IActionResult DeactivateMarket(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        market.Status = "inactive";
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public ActionResult<Market> ReactivateMarket(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        market.Status = "active";
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(market);
    }

    [HttpGet("{id}/property-templates")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetPropertyTemplates(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        var templates = market.Settings?.CustomPropertyTemplates ?? new List<CustomPropertyTemplate>();
        return Ok(new { templates });
    }

    [HttpPut("{id}/property-templates")]
    public ActionResult UpdatePropertyTemplates(string id, [FromBody] UpdatePropertyTemplatesRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        // Initialize Settings if null
        market.Settings ??= new MarketSettings();

        // Update property templates
        market.Settings.CustomPropertyTemplates = request.Templates;
        market.UpdatedAt = DateTime.UtcNow;

        _store.UpdateMarket(market);

        return Ok(new { templates = market.Settings.CustomPropertyTemplates });
    }

    [HttpGet("{id}/shipping-methods")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetShippingMethods(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        var methods = market.Settings?.ShippingMethods ?? new List<ShippingMethod>();
        return Ok(new { methods });
    }

    [HttpPut("{id}/shipping-methods")]
    public ActionResult UpdateShippingMethods(string id, [FromBody] UpdateShippingMethodsRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        market.Settings ??= new MarketSettings();
        market.Settings.ShippingMethods = request.Methods;
        market.UpdatedAt = DateTime.UtcNow;

        _store.UpdateMarket(market);

        return Ok(new { methods = market.Settings.ShippingMethods });
    }

    [HttpGet("{id}/leasing-periods")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetLeasingPeriods(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        var periods = market.Settings?.LeasingPeriods ?? new List<LeasingPeriod>();
        var defaultLeasingFactor = market.Settings?.DefaultLeasingFactor;
        return Ok(new { periods, defaultLeasingFactor });
    }

    [HttpPut("{id}/leasing-periods")]
    public ActionResult UpdateLeasingPeriods(string id, [FromBody] UpdateLeasingPeriodsRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null)
        {
            return NotFound();
        }

        market.Settings ??= new MarketSettings();
        market.Settings.LeasingPeriods = request.Periods;
        market.UpdatedAt = DateTime.UtcNow;

        _store.UpdateMarket(market);

        return Ok(new { periods = market.Settings.LeasingPeriods });
    }

    // ----- Payment providers (per-market, secrets masked) -----

    [HttpGet("{id}/payment-providers")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult GetPaymentProviders(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var bag = market.Settings?.PaymentProviders ?? new();
        var providers = bag.Select(kv =>
        {
            var descriptor = _paymentProviders.Resolve(kv.Key)?.Descriptor;
            return new
            {
                alias = kv.Key,
                displayName = descriptor?.DisplayName ?? kv.Key,
                known = descriptor != null,
                settings = descriptor != null ? PaymentSettings.Mask(descriptor, kv.Value) : JsonObject.Create(kv.Value)
            };
        }).ToList();

        return Ok(new
        {
            active = market.Settings?.PaymentProvider,
            orderStatusAfterPayment = market.Settings?.OrderStatusAfterPayment,
            providers,
            surcharges = market.Settings?.PaymentSurcharges ?? new Dictionary<string, PaymentSurcharge>()
        });
    }

    [HttpPut("{id}/payment-providers/{alias}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult UpsertPaymentProvider(string id, string alias, [FromBody] JsonElement settings)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var provider = _paymentProviders.Resolve(alias);
        if (provider == null) return BadRequest(new { message = $"Unknown payment provider '{alias}'" });

        market.Settings ??= new MarketSettings();
        market.Settings.PaymentProviders ??= new();

        var incoming = settings.ValueKind == JsonValueKind.Object ? JsonObject.Create(settings) ?? new() : new JsonObject();
        JsonElement? existing = market.Settings.PaymentProviders.TryGetValue(alias, out var current) ? current : null;
        var merged = PaymentSettings.Merge(provider.Descriptor, existing, incoming);

        market.Settings.PaymentProviders[alias] = JsonSerializer.SerializeToElement(merged);
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new
        {
            alias,
            displayName = provider.Descriptor.DisplayName,
            settings = PaymentSettings.Mask(provider.Descriptor, market.Settings.PaymentProviders[alias])
        });
    }

    /// <summary>
    /// The real value of one <see cref="PaymentFieldType.Secret"/> setting, for an admin who needs to
    /// check which key is actually stored — everything else masks secrets to
    /// <see cref="PaymentSettings.SecretMask"/>. Deliberately one field per request and never part of
    /// the list response, so a secret only leaves the server when someone asks for that one by name.
    /// </summary>
    [HttpGet("{id}/payment-providers/{alias}/secrets/{key}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult GetPaymentProviderSecret(string id, string alias, string key)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var descriptor = _paymentProviders.Resolve(alias)?.Descriptor;
        var field = descriptor?.Fields.FirstOrDefault(f =>
            f.Key.Equals(key, StringComparison.OrdinalIgnoreCase) && f.Type == PaymentFieldType.Secret);
        if (field == null) return NotFound();

        var stored = market.Settings?.PaymentProviders is { } bag && bag.TryGetValue(alias, out var element)
            ? element
            : (JsonElement?)null;

        var value = stored is { ValueKind: JsonValueKind.Object } settings
            && settings.TryGetProperty(field.Key, out var secret)
            && secret.ValueKind == JsonValueKind.String
                ? secret.GetString() ?? ""
                : "";

        return Ok(new { key = field.Key, value });
    }

    [HttpDelete("{id}/payment-providers/{alias}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult DeletePaymentProvider(string id, string alias)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        if (market.Settings?.PaymentProviders?.Remove(alias) == true)
        {
            // If we removed the active provider, clear the active selection too.
            if (string.Equals(market.Settings.PaymentProvider, alias, StringComparison.OrdinalIgnoreCase))
                market.Settings.PaymentProvider = null;
            market.Settings.PaymentSurcharges?.Remove(alias);
            market.UpdatedAt = DateTime.UtcNow;
            _store.UpdateMarket(market);
        }

        return NoContent();
    }

    [HttpPut("{id}/active-payment-provider")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult SetActivePaymentProvider(string id, [FromBody] SetActivePaymentProviderRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        if (!string.IsNullOrEmpty(request.Alias))
        {
            if (_paymentProviders.Resolve(request.Alias) == null)
                return BadRequest(new { message = $"Unknown payment provider '{request.Alias}'" });
            if (market.Settings?.PaymentProviders?.ContainsKey(request.Alias) != true)
                return BadRequest(new { message = $"Provider '{request.Alias}' is not configured for this market" });
        }

        market.Settings ??= new MarketSettings();
        market.Settings.PaymentProvider = string.IsNullOrEmpty(request.Alias) ? null : request.Alias;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { active = market.Settings.PaymentProvider });
    }

    [HttpPut("{id}/order-status-after-payment")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult SetOrderStatusAfterPayment(string id, [FromBody] SetOrderStatusAfterPaymentRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings ??= new MarketSettings();
        market.Settings.OrderStatusAfterPayment = string.IsNullOrEmpty(request.Code) ? null : request.Code;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { orderStatusAfterPayment = market.Settings.OrderStatusAfterPayment });
    }

    [HttpPut("{id}/payment-providers/{alias}/surcharge")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult SetPaymentSurcharge(string id, string alias, [FromBody] PaymentSurcharge surcharge)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        if (_paymentProviders.Resolve(alias) == null)
            return BadRequest(new { message = $"Unknown payment provider '{alias}'" });

        market.Settings ??= new MarketSettings();
        market.Settings.PaymentSurcharges ??= new();

        // An entirely blank surcharge means "none" — store nothing rather than an empty husk. Note a
        // zero amount is NOT blank: a tax class chosen before the amount is worth keeping, and a
        // 0 amount costs the shopper nothing (OrdersController skips the fee and its tax unless > 0).
        if (IsBlank(surcharge))
            market.Settings.PaymentSurcharges.Remove(alias);
        else
            market.Settings.PaymentSurcharges[alias] = surcharge;

        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(surcharge);
    }

    [HttpDelete("{id}/payment-providers/{alias}/surcharge")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult DeletePaymentSurcharge(string id, string alias)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings?.PaymentSurcharges?.Remove(alias);
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return NoContent();
    }

    /// <summary>Nothing filled in at all — no tax class, no amount.</summary>
    private static bool IsBlank(PaymentSurcharge s) =>
        string.IsNullOrWhiteSpace(s.TaxClassId) && s.Amount == 0;

    // ----- Tax Classes (market-scoped; drives the goods rate and the surcharge fee's tax) -----
    // taxRate rides along with the classes: it's the fallback for the same lookup, so both admins
    // edit tax in one screen instead of hunting for a rate hidden in the market form.

    [HttpGet("{id}/tax-classes")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetTaxClasses(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var taxClasses = market.Settings?.TaxClasses ?? new List<TaxClass>();
        return Ok(new { taxClasses, taxRate = market.Settings?.TaxRate ?? 0m });
    }

    [HttpPut("{id}/tax-classes")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult UpdateTaxClasses(string id, [FromBody] UpdateTaxClassesRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings ??= new MarketSettings();
        market.Settings.TaxClasses = request.TaxClasses;
        if (request.TaxRate.HasValue)
            market.Settings.TaxRate = request.TaxRate.Value;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { taxClasses = market.Settings.TaxClasses, taxRate = market.Settings.TaxRate });
    }

    // ----- Currencies + Countries (market-scoped; whole-list PUT like tax classes) -----

    [HttpGet("{id}/currencies")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetCurrencies(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var currencies = market.Settings?.Currencies ?? new List<Currency>();
        return Ok(new { currencies, activeCode = market.Currency });
    }

    [HttpPut("{id}/currencies")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult UpdateCurrencies(string id, [FromBody] UpdateCurrenciesRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        foreach (var currency in request.Currencies)
        {
            if (string.IsNullOrEmpty(currency.Id)) currency.Id = Guid.NewGuid().ToString();
            currency.Code = currency.Code?.Trim().ToUpperInvariant() ?? string.Empty;
            // Empty means "all countries" — store null so the two spellings can't diverge.
            if (currency.CountryCodes?.Count == 0) currency.CountryCodes = null;
        }

        market.Settings ??= new MarketSettings();
        market.Settings.Currencies = request.Currencies;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { currencies = market.Settings.Currencies, activeCode = market.Currency });
    }

    [HttpGet("{id}/countries")]
    [AllowAnonymous] // Allow all authenticated users to read
    public ActionResult GetMarketCountries(string id)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var countries = market.Settings?.Countries ?? new List<MarketCountry>();
        return Ok(new { countries });
    }

    [HttpPut("{id}/countries")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult UpdateMarketCountries(string id, [FromBody] UpdateMarketCountriesRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        foreach (var country in request.Countries)
        {
            if (string.IsNullOrEmpty(country.Id)) country.Id = Guid.NewGuid().ToString();
            country.Code = country.Code?.Trim().ToUpperInvariant() ?? string.Empty;
        }

        market.Settings ??= new MarketSettings();
        market.Settings.Countries = request.Countries;

        // Drop currency availability for countries the store no longer sells to. Left behind, such a
        // code is invisible in the editor (which only lists the store's countries) yet still counted,
        // so a currency would claim "2 countries" with one of them unselectable.
        var live = request.Countries.Select(c => c.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var currency in market.Settings.Currencies ?? new List<Currency>())
        {
            if (currency.CountryCodes == null) continue;   // null = all countries, nothing to prune
            currency.CountryCodes = currency.CountryCodes.Where(live.Contains).ToList();
            // An emptied list would read as "available nowhere"; "all" is the safer reading, and it
            // matches what the editor shows once every named country is gone.
            if (currency.CountryCodes.Count == 0) currency.CountryCodes = null;
        }

        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { countries = market.Settings.Countries });
    }

    // ----- Product Attributes (market-scoped variant-axis library) -----

    [HttpGet("{id}/attributes")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult GetAttributes(
        string id,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var all = market.Settings?.Attributes ?? new List<ProductAttribute>();

        var filtered = string.IsNullOrWhiteSpace(search)
            ? all
            : all.Where(a =>
                a.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                a.Alias.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();

        var total = filtered.Count;
        var attributes = pageSize > 0
            ? filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList()
            : filtered;

        return Ok(new { attributes, total, page, pageSize });
    }

    // A product attribute's values must be unique — dedupe by Name (case-insensitive, keep first).
    private static ProductAttribute DedupeAttributeValues(ProductAttribute attribute)
    {
        if (attribute?.Values == null) return attribute;
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        attribute.Values = attribute.Values
            .Where(v => v?.Name != null && seen.Add(v.Name.Trim()))
            .ToList();
        return attribute;
    }

    [HttpPost("{id}/attributes")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult AddAttribute(string id, [FromBody] ProductAttribute attribute)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings ??= new MarketSettings();
        market.Settings.Attributes ??= new List<ProductAttribute>();

        if (string.IsNullOrEmpty(attribute.Id)) attribute.Id = Guid.NewGuid().ToString();
        DedupeAttributeValues(attribute);
        market.Settings.Attributes.Add(attribute);
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return StatusCode(201, attribute);
    }

    [HttpPut("{id}/attributes/{attributeId}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult UpdateSingleAttribute(string id, string attributeId, [FromBody] ProductAttribute attribute)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var list = market.Settings?.Attributes ?? new List<ProductAttribute>();
        var idx = list.FindIndex(a => a.Id == attributeId);
        if (idx < 0) return NotFound();

        attribute.Id = attributeId;
        DedupeAttributeValues(attribute);
        list[idx] = attribute;
        market.Settings!.Attributes = list;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(attribute);
    }

    [HttpDelete("{id}/attributes/{attributeId}")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult DeleteAttribute(string id, string attributeId)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var list = market.Settings?.Attributes ?? new List<ProductAttribute>();
        var removed = list.RemoveAll(a => a.Id == attributeId);
        if (removed == 0) return NotFound();

        market.Settings!.Attributes = list;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return NoContent();
    }

    [HttpPut("{id}/attributes")]
    [Authorize(Policy = "AdminOrApiKey")]
    public ActionResult UpdateAttributes(string id, [FromBody] UpdateAttributesRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings ??= new MarketSettings();
        market.Settings.Attributes = (request.Attributes ?? new List<ProductAttribute>())
            .Select(DedupeAttributeValues).ToList();
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { attributes = market.Settings.Attributes });
    }

    // ----- Product Attribute Presets (named bundles of attributes) -----

    [HttpGet("{id}/attribute-presets")]
    [AllowAnonymous]
    public ActionResult GetAttributePresets(
        string id,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var all = market.Settings?.AttributePresets ?? new List<ProductAttributePreset>();

        var filtered = string.IsNullOrWhiteSpace(search)
            ? all
            : all.Where(p =>
                p.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                p.Alias.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();

        var total = filtered.Count;
        var presets = pageSize > 0
            ? filtered.Skip((page - 1) * pageSize).Take(pageSize).ToList()
            : filtered;

        return Ok(new { presets, total, page, pageSize });
    }

    [HttpPost("{id}/attribute-presets")]
    public ActionResult AddAttributePreset(string id, [FromBody] ProductAttributePreset preset)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings ??= new MarketSettings();
        market.Settings.AttributePresets ??= new List<ProductAttributePreset>();

        if (string.IsNullOrEmpty(preset.Id)) preset.Id = Guid.NewGuid().ToString();
        market.Settings.AttributePresets.Add(preset);
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return StatusCode(201, preset);
    }

    [HttpPut("{id}/attribute-presets/{presetId}")]
    public ActionResult UpdateSingleAttributePreset(string id, string presetId, [FromBody] ProductAttributePreset preset)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var list = market.Settings?.AttributePresets ?? new List<ProductAttributePreset>();
        var idx = list.FindIndex(p => p.Id == presetId);
        if (idx < 0) return NotFound();

        preset.Id = presetId;
        list[idx] = preset;
        market.Settings!.AttributePresets = list;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(preset);
    }

    [HttpDelete("{id}/attribute-presets/{presetId}")]
    public ActionResult DeleteAttributePreset(string id, string presetId)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        var list = market.Settings?.AttributePresets ?? new List<ProductAttributePreset>();
        var removed = list.RemoveAll(p => p.Id == presetId);
        if (removed == 0) return NotFound();

        market.Settings!.AttributePresets = list;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return NoContent();
    }

    [HttpPut("{id}/attribute-presets")]
    public ActionResult UpdateAttributePresets(string id, [FromBody] UpdateAttributePresetsRequest request)
    {
        var market = _store.GetMarket(id);
        if (market == null) return NotFound();

        market.Settings ??= new MarketSettings();
        market.Settings.AttributePresets = request.Presets;
        market.UpdatedAt = DateTime.UtcNow;
        _store.UpdateMarket(market);

        return Ok(new { presets = market.Settings.AttributePresets });
    }
}
