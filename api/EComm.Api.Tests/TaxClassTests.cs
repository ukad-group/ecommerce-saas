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
