using EComm.Data.ValueObjects.Tenant;
using Xunit;

namespace EComm.Api.Tests;

public class TaxClassTests
{
    private static readonly List<TaxClass> Classes = new()
    {
        new TaxClass
        {
            Id = "tc1",
            Name = "Standard",
            DefaultRate = 0.20m,
            CountryRates = new List<CountryTaxRate> { new() { CountryCode = "SE", Rate = 0.25m } }
        }
    };

    [Fact]
    public void ResolveRate_NoTaxClassId_ReturnsZero()
    {
        Assert.Equal(0m, TaxClass.ResolveRate(Classes, null, "SE"));
    }

    [Fact]
    public void ResolveRate_UnknownTaxClassId_ReturnsZero()
    {
        Assert.Equal(0m, TaxClass.ResolveRate(Classes, "does-not-exist", "SE"));
    }

    [Fact]
    public void ResolveRate_NoCountryOverride_ReturnsDefaultRate()
    {
        Assert.Equal(0.20m, TaxClass.ResolveRate(Classes, "tc1", "US"));
    }

    [Fact]
    public void ResolveRate_MatchingCountryOverride_ReturnsOverrideRate()
    {
        Assert.Equal(0.25m, TaxClass.ResolveRate(Classes, "tc1", "SE"));
    }

    [Fact]
    public void ResolveRate_CountryOverride_IsCaseInsensitive()
    {
        Assert.Equal(0.25m, TaxClass.ResolveRate(Classes, "tc1", "se"));
    }

    [Fact]
    public void ResolveRate_NoCountryCode_FallsBackToDefaultRate()
    {
        Assert.Equal(0.20m, TaxClass.ResolveRate(Classes, "tc1", null));
    }

}

/// <summary>
/// Goods tax comes from the tax class named by the ACTIVE provider's surcharge, falling back to the
/// flat store rate. These pin the fallback edges, because every one of them silently changes what a
/// shopper is charged.
/// </summary>
public class GoodsTaxRateTests
{
    private static MarketSettings Settings(string? activeAlias, string? surchargeTaxClassId) => new()
    {
        TaxRate = 0.10m,
        PaymentProvider = activeAlias,
        TaxClasses =
        [
            new()
            {
                Id = "tc1",
                Name = "Standard",
                DefaultRate = 0.20m,
                CountryRates = [new() { CountryCode = "SE", Rate = 0.25m }]
            }
        ],
        PaymentSurcharges = surchargeTaxClassId == null
            ? null
            : new Dictionary<string, PaymentSurcharge>
            {
                ["nets-easy"] = new() { TaxClassId = surchargeTaxClassId, Amount = 5m }
            }
    };

    [Fact]
    public void UsesTheActiveProvidersTaxClass()
    {
        Assert.Equal(0.20m, Settings("nets-easy", "tc1").ResolveGoodsTaxRate());
    }

    [Fact]
    public void HonoursPerCountryRate_WhenTheOrderKnowsItsCountry()
    {
        Assert.Equal(0.25m, Settings("nets-easy", "tc1").ResolveGoodsTaxRate("SE"));
        Assert.Equal(0.20m, Settings("nets-easy", "tc1").ResolveGoodsTaxRate("NO")); // no override → default
    }

    [Fact]
    public void FallsBackToStoreRate_WhenNoProviderIsActive()
    {
        Assert.Equal(0.10m, Settings(null, "tc1").ResolveGoodsTaxRate());
    }

    [Fact]
    public void FallsBackToStoreRate_WhenTheActiveProviderHasNoSurcharge()
    {
        Assert.Equal(0.10m, Settings("nets-easy", null).ResolveGoodsTaxRate());
    }

    [Fact]
    public void FallsBackToStoreRate_WhenTheSurchargeNamesNoTaxClass()
    {
        Assert.Equal(0.10m, Settings("nets-easy", "").ResolveGoodsTaxRate());
    }

    // A deleted tax class must not quietly ship untaxed orders — ResolveRate alone would answer 0m.
    [Fact]
    public void FallsBackToStoreRate_WhenTheNamedTaxClassWasDeleted()
    {
        Assert.Equal(0.10m, Settings("nets-easy", "since-deleted").ResolveGoodsTaxRate("SE"));
    }

    // The surcharge belongs to a DIFFERENT provider than the active one, so it must not apply.
    [Fact]
    public void IgnoresSurchargesBelongingToInactiveProviders()
    {
        var settings = Settings("other-provider", "tc1");
        Assert.Equal(0.10m, settings.ResolveGoodsTaxRate());
    }
}
