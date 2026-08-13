using EComm.Api.DTOs.Requests.Orders;
using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;
using EComm.Data.ValueObjects.Product;
using Xunit;

namespace EComm.Api.Tests;

/// <summary>Filters the order list in memory, so these run against a plain List&lt;Order&gt; — no
/// DataStore, no database, no collection fixture.</summary>
public class OrderFilterTests
{
    private static Order MakeOrder(
        string number, string fullName, string email, DateTime createdAt,
        (string Sku, string Name)[]? lines = null,
        (string Name, string Value)[]? properties = null,
        string? paymentStatus = null) => new()
    {
        Id = number,
        OrderNumber = number,
        CreatedAt = createdAt,
        PaymentStatus = paymentStatus,
        Customer = new CustomerInfo { FullName = fullName, Email = email },
        Items = (lines ?? []).Select(l => new OrderItem { Sku = l.Sku, ProductName = l.Name }).ToList(),
        CustomProperties = properties?.Select(p => new CustomProperty { Name = p.Name, Value = p.Value }).ToList(),
    };

    private static List<Order> Sample() =>
    [
        MakeOrder("ORDER-01888", "Felix Andersson", "felix@example.com", new DateTime(2026, 3, 3, 12, 17, 0),
            lines: [("TRL-100", "Trailer A")], properties: [("leasingPeriodId", "36"), ("message", "Call me")],
            paymentStatus: "Captured"),
        MakeOrder("ORDER-01880", "Felix Nyman", "felix.nyman@other.test", new DateTime(2026, 2, 22, 14, 18, 0),
            lines: [("ACC-200", "Strap")], properties: [("leasingPeriodId", "12")],
            paymentStatus: "Initialized"),
        // No payment at all — an invoiced or imported order, which is most of the real data.
        MakeOrder("ORDER-01867", "Karl Andersson", "karl@example.com", new DateTime(2026, 1, 9, 16, 53, 0),
            lines: [("TRL-100", "Trailer A"), ("ACC-200", "Strap")]),
    ];

    private static List<string> Filtered(OrderFilterRequest filter) =>
        filter.Apply(Sample()).Select(o => o.OrderNumber).ToList();

    [Fact]
    public void EmptyFilterKeepsEveryOrder()
    {
        var filter = new OrderFilterRequest();
        Assert.True(filter.IsEmpty);
        Assert.Equal(3, Filtered(filter).Count);
    }

    [Fact]
    public void FirstAndLastNameBothNarrowTheSameFullName()
    {
        // Each name field alone is a partial match on FullName; together they must AND, or "Felix" +
        // "Andersson" would return every Felix and every Andersson.
        Assert.Equal(2, Filtered(new OrderFilterRequest { FirstName = "felix" }).Count);
        Assert.Equal(2, Filtered(new OrderFilterRequest { LastName = "andersson" }).Count);
        Assert.Equal(["ORDER-01888"], Filtered(new OrderFilterRequest { FirstName = "Felix", LastName = "Andersson" }));
    }

    [Fact]
    public void EmailAndOrderNumberMatchPartially()
    {
        Assert.Equal(2, Filtered(new OrderFilterRequest { Email = "EXAMPLE.COM" }).Count);
        Assert.Equal(["ORDER-01867"], Filtered(new OrderFilterRequest { OrderNumber = "1867" }));
    }

    [Fact]
    public void PlacedBeforeIncludesOrdersFromThatSameDay()
    {
        // What <input type="date"> sends: midnight. Comparing raw would drop the whole day.
        var sameDay = Filtered(new OrderFilterRequest { PlacedBefore = new DateTime(2026, 3, 3) });
        Assert.Contains("ORDER-01888", sameDay);
        Assert.Equal(3, sameDay.Count);

        // An explicit time is honoured as given.
        Assert.DoesNotContain("ORDER-01888",
            Filtered(new OrderFilterRequest { PlacedBefore = new DateTime(2026, 3, 3, 6, 0, 0) }));
    }

    [Fact]
    public void DateRangeBoundsCombine()
    {
        Assert.Equal(["ORDER-01880"], Filtered(new OrderFilterRequest
        {
            PlacedAfter = new DateTime(2026, 2, 1),
            PlacedBefore = new DateTime(2026, 2, 28),
        }));
    }

    [Fact]
    public void SkusMatchAnyLineAndOrTogether()
    {
        Assert.Equal(["ORDER-01888", "ORDER-01867"], Filtered(new OrderFilterRequest { Skus = "trl-100" }));
        Assert.Equal(3, Filtered(new OrderFilterRequest { Skus = "TRL-100, ACC-200" }).Count);
        Assert.Empty(Filtered(new OrderFilterRequest { Skus = "NOPE-1" }));

        // Equality, not a partial match — a SKU prefix must not drag in its siblings.
        Assert.Empty(Filtered(new OrderFilterRequest { Skus = "TRL" }));
    }

    [Fact]
    public void PropertyPairsMatchNameExactlyAndValuePartially()
    {
        Assert.Equal(["ORDER-01888"], Filtered(new OrderFilterRequest { Properties = "leasingPeriodId:36" }));
        Assert.Equal(["ORDER-01888"], Filtered(new OrderFilterRequest { Properties = "message:call" }));

        // Every pair must match, and an order without the property is excluded.
        Assert.Equal(["ORDER-01888"], Filtered(new OrderFilterRequest { Properties = "leasingPeriodId:36,message:me" }));
        Assert.Empty(Filtered(new OrderFilterRequest { Properties = "leasingPeriodId:36,message:absent" }));
        Assert.Empty(Filtered(new OrderFilterRequest { Properties = "unknownAlias:x" }));
    }

    [Fact]
    public void BarePropertyAliasOnlyRequiresPresence()
    {
        Assert.Equal(["ORDER-01888", "ORDER-01880"], Filtered(new OrderFilterRequest { Properties = "leasingPeriodId" }));
        Assert.Equal(["ORDER-01888"], Filtered(new OrderFilterRequest { Properties = "message" }));
    }

    [Fact]
    public void PaymentStatusMatchesTheStoredStateExactly()
    {
        Assert.Equal(["ORDER-01888"], Filtered(new OrderFilterRequest { PaymentStatus = "captured" }));
        Assert.Equal(["ORDER-01880"], Filtered(new OrderFilterRequest { PaymentStatus = "Initialized" }));
        Assert.Empty(Filtered(new OrderFilterRequest { PaymentStatus = "Refunded" }));
    }

    [Fact]
    public void PaymentStatusNoneSelectsOrdersWithNoPayment()
    {
        // Most real orders have never had a payment; "none" is the only way to ask for them, and it
        // must not be confused with "no filter".
        Assert.Equal(["ORDER-01867"], Filtered(new OrderFilterRequest { PaymentStatus = "none" }));
        Assert.Equal(3, Filtered(new OrderFilterRequest { PaymentStatus = "" }).Count);
    }

    [Fact]
    public void FieldsFromDifferentSectionsCombine()
    {
        Assert.Equal(["ORDER-01867"], Filtered(new OrderFilterRequest
        {
            LastName = "Andersson",
            Skus = "ACC-200",
        }));
    }

    [Fact]
    public void BlankAndWhitespaceFieldsAreIgnored()
    {
        var filter = new OrderFilterRequest { FirstName = "  ", Email = "", Properties = " , ", Skus = "," };
        Assert.Equal(3, Filtered(filter).Count);
    }
}
