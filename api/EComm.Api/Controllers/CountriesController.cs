using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EComm.Data;
using EComm.Data.ValueObjects.Common;
using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class CountriesController : ControllerBase
{
    private readonly DataStore _store = DataStore.Instance;

    // Static ISO 3166-1 alpha-2 reference list — never mutated, no CRUD, no DB table needed.
    private static readonly List<Country> All = new()
    {
        new() { Code = "AD", Name = "Andorra" }, new() { Code = "AE", Name = "United Arab Emirates" },
        new() { Code = "AF", Name = "Afghanistan" }, new() { Code = "AG", Name = "Antigua and Barbuda" },
        new() { Code = "AI", Name = "Anguilla" }, new() { Code = "AL", Name = "Albania" },
        new() { Code = "AM", Name = "Armenia" }, new() { Code = "AO", Name = "Angola" },
        new() { Code = "AR", Name = "Argentina" }, new() { Code = "AT", Name = "Austria" },
        new() { Code = "AU", Name = "Australia" }, new() { Code = "AZ", Name = "Azerbaijan" },
        new() { Code = "BA", Name = "Bosnia and Herzegovina" }, new() { Code = "BB", Name = "Barbados" },
        new() { Code = "BD", Name = "Bangladesh" }, new() { Code = "BE", Name = "Belgium" },
        new() { Code = "BF", Name = "Burkina Faso" }, new() { Code = "BG", Name = "Bulgaria" },
        new() { Code = "BH", Name = "Bahrain" }, new() { Code = "BI", Name = "Burundi" },
        new() { Code = "BJ", Name = "Benin" }, new() { Code = "BN", Name = "Brunei" },
        new() { Code = "BO", Name = "Bolivia" }, new() { Code = "BR", Name = "Brazil" },
        new() { Code = "BS", Name = "Bahamas" }, new() { Code = "BT", Name = "Bhutan" },
        new() { Code = "BW", Name = "Botswana" }, new() { Code = "BY", Name = "Belarus" },
        new() { Code = "BZ", Name = "Belize" }, new() { Code = "CA", Name = "Canada" },
        new() { Code = "CD", Name = "Congo (DRC)" }, new() { Code = "CF", Name = "Central African Republic" },
        new() { Code = "CG", Name = "Congo" }, new() { Code = "CH", Name = "Switzerland" },
        new() { Code = "CI", Name = "Côte d'Ivoire" }, new() { Code = "CL", Name = "Chile" },
        new() { Code = "CM", Name = "Cameroon" }, new() { Code = "CN", Name = "China" },
        new() { Code = "CO", Name = "Colombia" }, new() { Code = "CR", Name = "Costa Rica" },
        new() { Code = "CU", Name = "Cuba" }, new() { Code = "CV", Name = "Cabo Verde" },
        new() { Code = "CY", Name = "Cyprus" }, new() { Code = "CZ", Name = "Czechia" },
        new() { Code = "DE", Name = "Germany" }, new() { Code = "DJ", Name = "Djibouti" },
        new() { Code = "DK", Name = "Denmark" }, new() { Code = "DM", Name = "Dominica" },
        new() { Code = "DO", Name = "Dominican Republic" }, new() { Code = "DZ", Name = "Algeria" },
        new() { Code = "EC", Name = "Ecuador" }, new() { Code = "EE", Name = "Estonia" },
        new() { Code = "EG", Name = "Egypt" }, new() { Code = "ER", Name = "Eritrea" },
        new() { Code = "ES", Name = "Spain" }, new() { Code = "ET", Name = "Ethiopia" },
        new() { Code = "FI", Name = "Finland" }, new() { Code = "FJ", Name = "Fiji" },
        new() { Code = "FM", Name = "Micronesia" }, new() { Code = "FO", Name = "Faroe Islands" },
        new() { Code = "FR", Name = "France" }, new() { Code = "GA", Name = "Gabon" },
        new() { Code = "GB", Name = "United Kingdom" }, new() { Code = "GD", Name = "Grenada" },
        new() { Code = "GE", Name = "Georgia" }, new() { Code = "GH", Name = "Ghana" },
        new() { Code = "GL", Name = "Greenland" }, new() { Code = "GM", Name = "Gambia" },
        new() { Code = "GN", Name = "Guinea" }, new() { Code = "GQ", Name = "Equatorial Guinea" },
        new() { Code = "GR", Name = "Greece" }, new() { Code = "GT", Name = "Guatemala" },
        new() { Code = "GW", Name = "Guinea-Bissau" }, new() { Code = "GY", Name = "Guyana" },
        new() { Code = "HN", Name = "Honduras" }, new() { Code = "HR", Name = "Croatia" },
        new() { Code = "HT", Name = "Haiti" }, new() { Code = "HU", Name = "Hungary" },
        new() { Code = "ID", Name = "Indonesia" }, new() { Code = "IE", Name = "Ireland" },
        new() { Code = "IL", Name = "Israel" }, new() { Code = "IN", Name = "India" },
        new() { Code = "IQ", Name = "Iraq" }, new() { Code = "IR", Name = "Iran" },
        new() { Code = "IS", Name = "Iceland" }, new() { Code = "IT", Name = "Italy" },
        new() { Code = "JM", Name = "Jamaica" }, new() { Code = "JO", Name = "Jordan" },
        new() { Code = "JP", Name = "Japan" }, new() { Code = "KE", Name = "Kenya" },
        new() { Code = "KG", Name = "Kyrgyzstan" }, new() { Code = "KH", Name = "Cambodia" },
        new() { Code = "KI", Name = "Kiribati" }, new() { Code = "KM", Name = "Comoros" },
        new() { Code = "KN", Name = "Saint Kitts and Nevis" }, new() { Code = "KP", Name = "North Korea" },
        new() { Code = "KR", Name = "South Korea" }, new() { Code = "KW", Name = "Kuwait" },
        new() { Code = "KZ", Name = "Kazakhstan" }, new() { Code = "LA", Name = "Laos" },
        new() { Code = "LB", Name = "Lebanon" }, new() { Code = "LC", Name = "Saint Lucia" },
        new() { Code = "LI", Name = "Liechtenstein" }, new() { Code = "LK", Name = "Sri Lanka" },
        new() { Code = "LR", Name = "Liberia" }, new() { Code = "LS", Name = "Lesotho" },
        new() { Code = "LT", Name = "Lithuania" }, new() { Code = "LU", Name = "Luxembourg" },
        new() { Code = "LV", Name = "Latvia" }, new() { Code = "LY", Name = "Libya" },
        new() { Code = "MA", Name = "Morocco" }, new() { Code = "MC", Name = "Monaco" },
        new() { Code = "MD", Name = "Moldova" }, new() { Code = "ME", Name = "Montenegro" },
        new() { Code = "MG", Name = "Madagascar" }, new() { Code = "MH", Name = "Marshall Islands" },
        new() { Code = "MK", Name = "North Macedonia" }, new() { Code = "ML", Name = "Mali" },
        new() { Code = "MM", Name = "Myanmar" }, new() { Code = "MN", Name = "Mongolia" },
        new() { Code = "MR", Name = "Mauritania" }, new() { Code = "MT", Name = "Malta" },
        new() { Code = "MU", Name = "Mauritius" }, new() { Code = "MV", Name = "Maldives" },
        new() { Code = "MW", Name = "Malawi" }, new() { Code = "MX", Name = "Mexico" },
        new() { Code = "MY", Name = "Malaysia" }, new() { Code = "MZ", Name = "Mozambique" },
        new() { Code = "NA", Name = "Namibia" }, new() { Code = "NE", Name = "Niger" },
        new() { Code = "NG", Name = "Nigeria" }, new() { Code = "NI", Name = "Nicaragua" },
        new() { Code = "NL", Name = "Netherlands" }, new() { Code = "NO", Name = "Norway" },
        new() { Code = "NP", Name = "Nepal" }, new() { Code = "NR", Name = "Nauru" },
        new() { Code = "NZ", Name = "New Zealand" }, new() { Code = "OM", Name = "Oman" },
        new() { Code = "PA", Name = "Panama" }, new() { Code = "PE", Name = "Peru" },
        new() { Code = "PG", Name = "Papua New Guinea" }, new() { Code = "PH", Name = "Philippines" },
        new() { Code = "PK", Name = "Pakistan" }, new() { Code = "PL", Name = "Poland" },
        new() { Code = "PT", Name = "Portugal" }, new() { Code = "PW", Name = "Palau" },
        new() { Code = "PY", Name = "Paraguay" }, new() { Code = "QA", Name = "Qatar" },
        new() { Code = "RO", Name = "Romania" }, new() { Code = "RS", Name = "Serbia" },
        new() { Code = "RU", Name = "Russia" }, new() { Code = "RW", Name = "Rwanda" },
        new() { Code = "SA", Name = "Saudi Arabia" }, new() { Code = "SB", Name = "Solomon Islands" },
        new() { Code = "SC", Name = "Seychelles" }, new() { Code = "SD", Name = "Sudan" },
        new() { Code = "SE", Name = "Sweden" }, new() { Code = "SG", Name = "Singapore" },
        new() { Code = "SI", Name = "Slovenia" }, new() { Code = "SK", Name = "Slovakia" },
        new() { Code = "SL", Name = "Sierra Leone" }, new() { Code = "SM", Name = "San Marino" },
        new() { Code = "SN", Name = "Senegal" }, new() { Code = "SO", Name = "Somalia" },
        new() { Code = "SR", Name = "Suriname" }, new() { Code = "SS", Name = "South Sudan" },
        new() { Code = "ST", Name = "Sao Tome and Principe" }, new() { Code = "SV", Name = "El Salvador" },
        new() { Code = "SY", Name = "Syria" }, new() { Code = "SZ", Name = "Eswatini" },
        new() { Code = "TD", Name = "Chad" }, new() { Code = "TG", Name = "Togo" },
        new() { Code = "TH", Name = "Thailand" }, new() { Code = "TJ", Name = "Tajikistan" },
        new() { Code = "TL", Name = "Timor-Leste" }, new() { Code = "TM", Name = "Turkmenistan" },
        new() { Code = "TN", Name = "Tunisia" }, new() { Code = "TO", Name = "Tonga" },
        new() { Code = "TR", Name = "Turkey" }, new() { Code = "TT", Name = "Trinidad and Tobago" },
        new() { Code = "TV", Name = "Tuvalu" }, new() { Code = "TW", Name = "Taiwan" },
        new() { Code = "TZ", Name = "Tanzania" }, new() { Code = "UA", Name = "Ukraine" },
        new() { Code = "UG", Name = "Uganda" }, new() { Code = "US", Name = "United States" },
        new() { Code = "UY", Name = "Uruguay" }, new() { Code = "UZ", Name = "Uzbekistan" },
        new() { Code = "VA", Name = "Vatican City" }, new() { Code = "VC", Name = "Saint Vincent and the Grenadines" },
        new() { Code = "VE", Name = "Venezuela" }, new() { Code = "VN", Name = "Vietnam" },
        new() { Code = "VU", Name = "Vanuatu" }, new() { Code = "WS", Name = "Samoa" },
        new() { Code = "YE", Name = "Yemen" }, new() { Code = "ZA", Name = "South Africa" },
        new() { Code = "ZM", Name = "Zambia" }, new() { Code = "ZW", Name = "Zimbabwe" },
    };

    /// <summary>
    /// Without marketId: the full ISO 3166 reference list — what countries are created from
    /// (Commerce → Options → Countries) and what a tax-rate override is picked from.
    /// <para>
    /// With marketId: exactly the countries that market sells to, so a market with none configured
    /// answers an empty list rather than silently standing in the whole world. Callers that want the
    /// reference list must ask for it by omitting marketId.
    /// </para>
    /// </summary>
    [HttpGet]
    public ActionResult<List<Country>> GetCountries([FromQuery] string? marketId = null)
    {
        if (string.IsNullOrEmpty(marketId))
            return Ok(All);

        var configured = _store.GetMarket(marketId)?.Settings?.Countries ?? new List<MarketCountry>();

        // Names come from the market's own records — an admin may have renamed a country.
        return Ok(configured
            .Select(c => new Country { Code = c.Code, Name = c.Name })
            .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .ToList());
    }
}
