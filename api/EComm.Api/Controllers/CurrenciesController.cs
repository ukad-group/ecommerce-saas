using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Api.Controllers;

/// <summary>
/// Reference data for the currency editor: the ISO 4217 currencies and the cultures money can be
/// formatted with. Both come from .NET's own culture data rather than a hardcoded table, so they
/// stay correct without maintenance. Built once — this never changes at runtime.
/// </summary>
[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class CurrenciesController : ControllerBase
{
    /// <summary>
    /// No default culture on purpose. A currency code maps to many cultures (SEK ⇒ en-SE and sv-SE;
    /// GBP ⇒ en-GB, cy-GB, gd-GB) and .NET exposes no "primary language of this region" — every cheap
    /// rule picks something absurd for some currency (first-listed gives English (Sweden) for SEK;
    /// preferring a language's own default region gives Welsh for GBP and Asturian for EUR, since
    /// "en" belongs to en-US). So the preset fills name + code and the admin picks the culture from
    /// the full list, which is one click and never wrong.
    /// </summary>
    public record CurrencyPreset(string Code, string Name);
    public record CulturePreset(string Name, string DisplayName);

    private static readonly List<CurrencyPreset> Presets;
    private static readonly List<CulturePreset> Cultures;

    static CurrenciesController()
    {
        var currencies = new Dictionary<string, CurrencyPreset>(StringComparer.OrdinalIgnoreCase);
        var cultures = new List<CulturePreset>();

        foreach (var culture in CultureInfo.GetCultures(CultureTypes.SpecificCultures))
        {
            RegionInfo region;
            try
            {
                region = new RegionInfo(culture.Name);
            }
            catch (ArgumentException)
            {
                continue; // a specific culture without a region (rare, but it throws rather than returning null)
            }

            cultures.Add(new CulturePreset(culture.Name, culture.DisplayName));

            // CurrencyEnglishName is the same whichever culture of the region reports it, so
            // first-wins is safe here — unlike a culture default, see CurrencyPreset.
            if (!string.IsNullOrEmpty(region.ISOCurrencySymbol))
                currencies.TryAdd(region.ISOCurrencySymbol,
                    new CurrencyPreset(region.ISOCurrencySymbol, region.CurrencyEnglishName));
        }

        Presets = currencies.Values.OrderBy(c => c.Code, StringComparer.OrdinalIgnoreCase).ToList();
        Cultures = cultures.OrderBy(c => c.DisplayName, StringComparer.OrdinalIgnoreCase).ToList();
    }

    [HttpGet("presets")]
    public ActionResult GetPresets() => Ok(new { currencies = Presets, cultures = Cultures });
}
