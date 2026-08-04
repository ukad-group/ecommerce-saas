using EComm.Api.Controllers;
using EComm.Api.DTOs.Requests.Markets;
using EComm.Data;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Tenant;
using EComm.Payment;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// A store's currencies and countries live in the MarketSettings JSON blob and are saved whole-list,
/// so what matters is that a PUT round-trips and that the write-time normalisation (ids, ISO casing,
/// "all countries" spelled one way) actually happens — a currency stored with an empty
/// CountryCodes list would read as "available nowhere" on any future consumer.
/// </summary>
[Collection("DataStore")]
public class MarketCurrenciesCountriesTests
{
    [Fact]
    public void Currencies_RoundTripAndAreNormalisedOnWrite()
    {
        using var connection = InitializeInMemoryDataStore();
        var marketId = AddMarket();

        var saved = Currencies(Controller().UpdateCurrencies(marketId, new UpdateCurrenciesRequest
        {
            Currencies = new List<Currency>
            {
                new() { Name = "Swedish krona", Code = "sek", Culture = "sv-SE", FormatTemplate = "{0:n0} kr" },
                new() { Id = "keep-me", Name = "Euro", Code = "EUR", CountryCodes = new List<string>() },
            }
        }));

        var sek = saved.Single(c => c.Code == "SEK");   // lowercased input was upper-cased
        Assert.False(string.IsNullOrEmpty(sek.Id));     // blank id filled in
        Assert.Equal("{0:n0} kr", sek.FormatTemplate);

        var eur = saved.Single(c => c.Code == "EUR");
        Assert.Equal("keep-me", eur.Id);                // a supplied id is left alone
        Assert.Null(eur.CountryCodes);                  // empty ⇒ "all countries", stored as null

        // Read back through a fresh controller: this is the persisted state, not the response echo.
        var reloaded = Currencies(Controller().GetCurrencies(marketId));
        Assert.Equal(new[] { "SEK", "EUR" }, reloaded.Select(c => c.Code));
        Assert.Equal("sv-SE", reloaded.Single(c => c.Code == "SEK").Culture);
    }

    [Fact]
    public void Countries_RoundTripWithTheirCheckoutDefaults()
    {
        using var connection = InitializeInMemoryDataStore();
        var marketId = AddMarket();

        Controller().UpdateMarketCountries(marketId, new UpdateMarketCountriesRequest
        {
            Countries = new List<MarketCountry>
            {
                new() { Name = "Sweden", Code = "se", DefaultCurrencyId = "cur-1",
                        DefaultShippingMethodId = "ship-1", DefaultPaymentProviderAlias = "nets-easy" },
            }
        });

        var stored = Assert.Single(MarketCountries(Controller().GetMarketCountries(marketId)));
        Assert.Equal("SE", stored.Code);
        Assert.False(string.IsNullOrEmpty(stored.Id));
        Assert.Equal("cur-1", stored.DefaultCurrencyId);
        Assert.Equal("ship-1", stored.DefaultShippingMethodId);
        Assert.Equal("nets-easy", stored.DefaultPaymentProviderAlias);
    }

    [Fact]
    public void RemovingACountry_PrunesItFromCurrencyAvailability()
    {
        using var connection = InitializeInMemoryDataStore();
        var marketId = AddMarket();

        Controller().UpdateMarketCountries(marketId, new UpdateMarketCountriesRequest
        {
            Countries = new List<MarketCountry>
            {
                new() { Name = "Sweden", Code = "SE" },
                new() { Name = "Norway", Code = "NO" },
            }
        });
        Controller().UpdateCurrencies(marketId, new UpdateCurrenciesRequest
        {
            Currencies = new List<Currency>
            {
                new() { Name = "Swedish krona", Code = "SEK", CountryCodes = new List<string> { "SE", "NO" } },
                new() { Name = "Euro", Code = "EUR" },                                    // null = all
                new() { Name = "Norwegian krone", Code = "NOK", CountryCodes = new List<string> { "NO" } },
            }
        });

        // Norway is dropped from the store.
        Controller().UpdateMarketCountries(marketId, new UpdateMarketCountriesRequest
        {
            Countries = new List<MarketCountry> { new() { Name = "Sweden", Code = "SE" } }
        });

        var stored = Currencies(Controller().GetCurrencies(marketId));
        Assert.Equal(new[] { "SE" }, stored.Single(c => c.Code == "SEK").CountryCodes);
        Assert.Null(stored.Single(c => c.Code == "EUR").CountryCodes);   // "all" is left alone
        // NOK listed only Norway: emptied ⇒ null ("all"), never an empty list meaning "nowhere".
        Assert.Null(stored.Single(c => c.Code == "NOK").CountryCodes);
    }

    [Fact]
    public void UnknownMarket_Is404()
    {
        using var connection = InitializeInMemoryDataStore();

        Assert.IsType<NotFoundResult>(Controller().GetCurrencies("no-such-market"));
        Assert.IsType<NotFoundResult>(Controller().GetMarketCountries("no-such-market"));
    }

    private static MarketsController Controller() => new(new PaymentProviderResolver(
        Array.Empty<IPaymentProvider>(),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build()));

    private static List<Currency> Currencies(ActionResult result) => Field<List<Currency>>(result, "currencies");
    private static List<MarketCountry> MarketCountries(ActionResult result) => Field<List<MarketCountry>>(result, "countries");

    /// <summary>The controllers answer with anonymous objects, which are internal to their assembly —
    /// so the envelope has to be read reflectively rather than via <c>dynamic</c>.</summary>
    private static T Field<T>(ActionResult result, string name)
    {
        var value = Assert.IsType<OkObjectResult>(result).Value!;
        return (T)value.GetType().GetProperty(name)!.GetValue(value)!;
    }

    internal static string AddMarket()
    {
        var marketId = $"market-{Guid.NewGuid()}";
        DataStore.Instance.AddMarket(new Market
        {
            Id = marketId, TenantId = "tenant-a", Name = "Test Market",
            Currency = "USD", Settings = new MarketSettings()
        });
        return marketId;
    }

    internal static SqliteConnection InitializeInMemoryDataStore()
    {
        var connection = new SqliteConnection("Filename=:memory:");
        connection.Open();
        var options = new DbContextOptionsBuilder<ECommDbContext>().UseSqlite(connection).Options;
        using (var context = new ECommDbContext(options))
            context.Database.EnsureCreated();
        DataStore.Instance.InitializeDatabase(options);
        return connection; // keep alive — closing it drops the in-memory db
    }
}

/// <summary>
/// The country list a market exposes used to be filtered by MarketSettings.ShippingZones, which was
/// seeded with US *state* codes — so the filter matched no ISO country and the endpoint answered an
/// empty list. It now reads the market's configured countries, and answers exactly those: asking for a
/// market means asking where that market sells, so "none configured" is an empty list, not the whole
/// world. The reference list is what you get by omitting marketId.
/// </summary>
[Collection("DataStore")]
public class CountriesControllerTests
{
    [Fact]
    public void GetCountries_NoMarketId_ReturnsTheFullIsoList()
    {
        using var connection = MarketCurrenciesCountriesTests.InitializeInMemoryDataStore();

        var all = Countries(new CountriesController().GetCountries());
        Assert.True(all.Count > 150);
        Assert.Contains(all, c => c.Code == "SE" && c.Name == "Sweden");
    }

    [Fact]
    public void GetCountries_MarketWithNoConfiguredCountries_IsEmpty()
    {
        using var connection = MarketCurrenciesCountriesTests.InitializeInMemoryDataStore();
        var marketId = MarketCurrenciesCountriesTests.AddMarket();

        // Not the full list: "where does this market sell" has the answer "nowhere yet", and standing
        // in the whole world would let a storefront offer countries the store never configured.
        Assert.Empty(Countries(new CountriesController().GetCountries(marketId)));
    }

    [Fact]
    public void GetCountries_UnknownMarket_IsEmptyRatherThanTheWholeWorld()
    {
        using var connection = MarketCurrenciesCountriesTests.InitializeInMemoryDataStore();

        Assert.Empty(Countries(new CountriesController().GetCountries("no-such-market")));
    }

    [Fact]
    public void GetCountries_MarketWithConfiguredCountries_ReturnsThoseByName()
    {
        using var connection = MarketCurrenciesCountriesTests.InitializeInMemoryDataStore();
        var marketId = MarketCurrenciesCountriesTests.AddMarket();

        var market = DataStore.Instance.GetMarket(marketId)!;
        market.Settings!.Countries = new List<MarketCountry>
        {
            new() { Id = "c1", Code = "SE", Name = "Sweden" },
            new() { Id = "c2", Code = "DK", Name = "Danmark" },   // renamed locally
        };
        DataStore.Instance.UpdateMarket(market);

        var listed = Countries(new CountriesController().GetCountries(marketId));
        Assert.Equal(new[] { "Danmark", "Sweden" }, listed.Select(c => c.Name));  // sorted by name
        Assert.Equal(new[] { "DK", "SE" }, listed.Select(c => c.Code));
    }

    private static List<Data.ValueObjects.Common.Country> Countries(
        ActionResult<List<Data.ValueObjects.Common.Country>> result)
    {
        if (result.Value != null) return result.Value;
        return (List<Data.ValueObjects.Common.Country>)Assert.IsType<OkObjectResult>(result.Result).Value!;
    }
}

/// <summary>
/// Currency and culture presets are generated from .NET's culture data. If ICU data were missing (or
/// the dedupe by ISO code broke) the editor's dropdowns would silently come up empty or duplicated.
/// </summary>
public class CurrencyPresetsTests
{
    [Fact]
    public void Presets_AreNonEmptyDedupedAndCarryAUsableCulture()
    {
        var value = Assert.IsType<OkObjectResult>(new CurrenciesController().GetPresets()).Value!;
        var currencies = (List<CurrenciesController.CurrencyPreset>)value.GetType().GetProperty("currencies")!.GetValue(value)!;
        var cultures = (List<CurrenciesController.CulturePreset>)value.GetType().GetProperty("cultures")!.GetValue(value)!;

        Assert.True(currencies.Count > 50);
        Assert.Equal(currencies.Count, currencies.Select(c => c.Code).Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.True(cultures.Count > 100);

        Assert.False(string.IsNullOrWhiteSpace(currencies.Single(c => c.Code == "SEK").Name));

        // The culture list is what the editor's dropdown offers, so it must contain the real ones a
        // store would pick and be ordered by the label the admin reads.
        Assert.Contains(cultures, c => c.Name == "sv-SE");
        Assert.Contains(cultures, c => c.Name == "en-GB");
        Assert.Equal(cultures.Select(c => c.DisplayName).OrderBy(n => n, StringComparer.OrdinalIgnoreCase),
                     cultures.Select(c => c.DisplayName));
    }
}
