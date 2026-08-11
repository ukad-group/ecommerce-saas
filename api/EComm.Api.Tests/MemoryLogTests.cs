using EComm.Api.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>
/// The in-memory log buffer behind <c>GET /api/v1/admin/logs</c>: it must stay bounded, filter the way
/// the endpoint's query parameters promise, and — the part that is easy to get wrong — respect the
/// <c>Logging:Memory</c> configuration section, since that is what decides whether the payment
/// providers' Debug-level request bodies reach the buffer at all.
/// </summary>
public class MemoryLogStoreTests
{
    [Fact]
    public void DropsTheOldestLineOnceFull()
    {
        var store = new MemoryLogStore(capacity: 3);
        for (var i = 1; i <= 5; i++)
            store.Add(DateTime.UtcNow, LogLevel.Information, "EComm.Api", $"line {i}", null);

        var entries = store.Read(take: 100);

        Assert.Equal(3, entries.Count);
        Assert.Equal(["line 3", "line 4", "line 5"], entries.Select(e => e.Message));
        Assert.Equal(5, store.LastSequence); // sequence keeps counting past evictions
    }

    [Fact]
    public void ReadReturnsTheNewestLinesInChronologicalOrder()
    {
        var store = new MemoryLogStore();
        for (var i = 1; i <= 10; i++)
            store.Add(DateTime.UtcNow, LogLevel.Information, "EComm.Api", $"line {i}", null);

        var entries = store.Read(take: 3);

        Assert.Equal(["line 8", "line 9", "line 10"], entries.Select(e => e.Message));
    }

    [Fact]
    public void FiltersByLevelCategorySearchAndSequence()
    {
        var store = new MemoryLogStore();
        store.Add(DateTime.UtcNow, LogLevel.Debug, "EComm.Payment.Providers.NetsEasy.NetsEasyClient", "create-payment request: {...}", null);
        store.Add(DateTime.UtcNow, LogLevel.Error, "EComm.Payment.Providers.NetsEasy.NetsEasyClient", "create-payment failed: 401", null);
        store.Add(DateTime.UtcNow, LogLevel.Information, "EComm.Api.Controllers.OrdersController", "order created", null);

        Assert.Equal(2, store.Read(minLevel: LogLevel.Information).Count);            // the Debug line drops out
        Assert.Equal(2, store.Read(category: "netseasy").Count);                      // category match is case-insensitive
        Assert.Single(store.Read(search: "401"));
        Assert.Single(store.Read(category: "NetsEasy", minLevel: LogLevel.Error));

        var all = store.Read();
        Assert.Equal(2, store.Read(after: all[0].Sequence).Count);                    // tailing skips what was seen
        Assert.Empty(store.Read(after: store.LastSequence));
    }

    [Fact]
    public void CapturesExceptionText()
    {
        var store = new MemoryLogStore();
        store.Add(DateTime.UtcNow, LogLevel.Error, "EComm.Api", "boom", new InvalidOperationException("gateway timeout"));

        Assert.Contains("gateway timeout", store.Read()[0].Exception);
    }

    /// <summary>
    /// The provider is registered under the <c>Memory</c> alias, so <c>Logging:Memory:LogLevel</c>
    /// governs it independently of the console's own levels. Without this, the appsettings entry that
    /// raises <c>EComm.Payment</c> to Debug would silently do nothing.
    /// </summary>
    [Fact]
    public void HonoursTheMemoryAliasLogLevels()
    {
        var store = Capture(new Dictionary<string, string?>
        {
            ["Logging:LogLevel:Default"] = "Information",
            ["Logging:Memory:LogLevel:Default"] = "Information",
            ["Logging:Memory:LogLevel:EComm.Payment"] = "Debug"
        });

        var messages = store.Read().Select(e => e.Message).ToList();

        Assert.Contains("nets request body", messages);      // raised to Debug by category
        Assert.Contains("controller warning", messages);
        Assert.DoesNotContain("controller chatter", messages); // still Information+ everywhere else
    }

    /// <summary>
    /// With no <c>Logging:Memory:LogLevel</c> section the buffer would otherwise inherit the console's
    /// Information default and drop the Debug diagnostics it exists to serve — so an unconfigured
    /// buffer captures Debug, whatever the general levels say.
    /// </summary>
    [Fact]
    public void CapturesDebugWhenTheMemorySectionConfiguresNoLevels()
    {
        var store = Capture(new Dictionary<string, string?>
        {
            ["Logging:LogLevel:Default"] = "Information",
            ["Logging:Memory:Capacity"] = "50" // a Memory section, but nothing about levels
        });

        var messages = store.Read().Select(e => e.Message).ToList();

        Assert.Equal(50, store.Capacity);
        Assert.Contains("nets request body", messages);
        Assert.Contains("controller chatter", messages); // Debug everywhere, not just EComm.Payment
        Assert.Contains("controller warning", messages);
    }

    [Fact]
    public void CapturesDebugWhenThereIsNoMemorySectionAtAll()
    {
        var store = Capture(new Dictionary<string, string?> { ["Logging:LogLevel:Default"] = "Warning" });

        Assert.Contains("controller chatter", store.Read().Select(e => e.Message));
        Assert.Equal(MemoryLogStore.DefaultCapacity, store.Capacity);
    }

    /// <summary>Builds a logger factory over <paramref name="settings"/>, logs one line per level of
    /// interest, and hands back the buffer they landed in (or didn't).</summary>
    private static MemoryLogStore Capture(Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();

        var services = new ServiceCollection()
            .AddLogging(logging =>
            {
                logging.AddConfiguration(configuration.GetSection("Logging"));
                logging.AddMemoryLogger(configuration.GetSection("Logging:Memory"));
            })
            .BuildServiceProvider();

        var factory = services.GetRequiredService<ILoggerFactory>();
        factory.CreateLogger("EComm.Payment.Providers.NetsEasy.NetsEasyClient").LogDebug("nets request body");
        factory.CreateLogger("EComm.Api.Controllers.OrdersController").LogDebug("controller chatter");
        factory.CreateLogger("EComm.Api.Controllers.OrdersController").LogWarning("controller warning");

        return services.GetRequiredService<MemoryLogStore>();
    }
}
