using EComm.Data.Entities;
using EComm.Data.ValueObjects.Order;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Api.DTOs.Requests.Orders;

/// <summary>
/// The advanced order-list filter, bound from the query string of GET /api/v1/orders. Every supplied
/// field narrows the result set further (they AND together); an omitted or blank field matches
/// everything. Text matching is case-insensitive and partial, so a filter can be typed from memory.
///
/// Lives here rather than inline in the controller so the same rules can be reused (e.g. by
/// AdminOrdersController) without a second copy that drifts.
///
/// Every property names its own query parameter, so the filter reads as
/// `?firstName=felix&amp;skus=TRL-100` rather than depending on the action's parameter name as a
/// prefix (`?filter.firstName=`). Both would work — one of them by fallback, and a filter that
/// silently binds to nothing is not a failure mode worth leaving open.
/// </summary>
public class OrderFilterRequest
{
    /// <summary>Matched against <see cref="CustomerInfo.FullName"/> — the order data has no
    /// first/last split, so FirstName and LastName are two partial matches on the same field. Both
    /// must match, which is what makes "Felix" + "Andersson" find "Felix Andersson".</summary>
    [FromQuery(Name = "firstName")]
    public string? FirstName { get; set; }

    /// <inheritdoc cref="FirstName"/>
    [FromQuery(Name = "lastName")]
    public string? LastName { get; set; }

    [FromQuery(Name = "email")]
    public string? Email { get; set; }

    [FromQuery(Name = "orderNumber")]
    public string? OrderNumber { get; set; }

    /// <summary>The order's real payment lifecycle state (<c>Initialized</c>/<c>Authorized</c>/
    /// <c>Captured</c>/<c>Cancelled</c>/<c>Failed</c>/<c>Refunded</c>), matched exactly. The literal
    /// <c>none</c> selects orders that have no payment at all — the common case for an order that was
    /// invoiced or imported, and not something an equality match can express.</summary>
    [FromQuery(Name = "paymentStatus")]
    public string? PaymentStatus { get; set; }

    /// <summary>Orders placed at or after this instant.</summary>
    [FromQuery(Name = "placedAfter")]
    public DateTime? PlacedAfter { get; set; }

    /// <summary>Orders placed at or before this instant. A date with no time component covers the
    /// whole of that day — "placed on or before 3 March" has to include 3 March.</summary>
    [FromQuery(Name = "placedBefore")]
    public DateTime? PlacedBefore { get; set; }

    /// <summary>Order-level custom properties as "alias:value" pairs, comma separated. Each pair must
    /// match a property whose name equals the alias and whose value contains the value; a bare alias
    /// (no colon) only requires the property to be present. All pairs must match.</summary>
    [FromQuery(Name = "properties")]
    public string? Properties { get; set; }

    /// <summary>Comma-separated SKUs. An order matches when any of its lines carries any of them.</summary>
    [FromQuery(Name = "skus")]
    public string? Skus { get; set; }

    /// <summary>The value of <see cref="PaymentStatus"/> that means "no payment record".</summary>
    public const string NoPayment = "none";

    /// <summary>True when nothing was supplied, so the caller can skip the whole pass.</summary>
    public bool IsEmpty =>
        string.IsNullOrWhiteSpace(FirstName) && string.IsNullOrWhiteSpace(LastName) &&
        string.IsNullOrWhiteSpace(Email) && string.IsNullOrWhiteSpace(OrderNumber) &&
        string.IsNullOrWhiteSpace(PaymentStatus) &&
        PlacedAfter == null && PlacedBefore == null &&
        string.IsNullOrWhiteSpace(Properties) && string.IsNullOrWhiteSpace(Skus);

    public IEnumerable<Order> Apply(IEnumerable<Order> orders)
    {
        if (IsEmpty)
        {
            return orders;
        }

        var query = orders;

        // Both name fields hit FullName; ANDing them is what makes two half-remembered words useful.
        if (!string.IsNullOrWhiteSpace(FirstName))
            query = query.Where(o => Contains(o.Customer?.FullName, FirstName));

        if (!string.IsNullOrWhiteSpace(LastName))
            query = query.Where(o => Contains(o.Customer?.FullName, LastName));

        if (!string.IsNullOrWhiteSpace(Email))
            query = query.Where(o => Contains(o.Customer?.Email, Email));

        if (!string.IsNullOrWhiteSpace(OrderNumber))
            query = query.Where(o => Contains(o.OrderNumber, OrderNumber));

        if (!string.IsNullOrWhiteSpace(PaymentStatus))
        {
            var wanted = PaymentStatus.Trim();
            query = string.Equals(wanted, NoPayment, StringComparison.OrdinalIgnoreCase)
                ? query.Where(o => string.IsNullOrEmpty(o.PaymentStatus))
                : query.Where(o => string.Equals(o.PaymentStatus, wanted, StringComparison.OrdinalIgnoreCase));
        }

        if (PlacedAfter.HasValue)
            query = query.Where(o => o.CreatedAt >= PlacedAfter.Value);

        if (PlacedBefore.HasValue)
        {
            // A date-only bound ("2026-03-03", what <input type="date"> sends) means end of that day.
            var before = PlacedBefore.Value.TimeOfDay == TimeSpan.Zero
                ? PlacedBefore.Value.Date.AddDays(1).AddTicks(-1)
                : PlacedBefore.Value;
            query = query.Where(o => o.CreatedAt <= before);
        }

        var propertyPairs = ParsePairs(Properties);
        if (propertyPairs.Count > 0)
            query = query.Where(o => propertyPairs.All(pair => HasProperty(o, pair.Alias, pair.Value)));

        var skus = ParseList(Skus);
        if (skus.Count > 0)
        {
            query = query.Where(o => o.Items.Any(i =>
                skus.Any(sku => string.Equals(i.Sku, sku, StringComparison.OrdinalIgnoreCase))));
        }

        return query;
    }

    private static bool Contains(string? haystack, string? needle) =>
        haystack != null && haystack.Contains(needle!.Trim(), StringComparison.OrdinalIgnoreCase);

    private static bool HasProperty(Order order, string alias, string? value)
    {
        var matches = order.CustomProperties?.Where(p =>
            string.Equals(p.Name, alias, StringComparison.OrdinalIgnoreCase)) ?? [];

        // No value after the colon ⇒ the property just has to be there.
        return string.IsNullOrEmpty(value)
            ? matches.Any()
            : matches.Any(p => Contains(p.Value, value));
    }

    private static List<string> ParseList(string? raw) =>
        (raw ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

    private static List<(string Alias, string? Value)> ParsePairs(string? raw)
    {
        var pairs = new List<(string, string?)>();
        foreach (var entry in ParseList(raw))
        {
            var separator = entry.IndexOf(':');
            if (separator < 0)
            {
                pairs.Add((entry, null));
            }
            else
            {
                var alias = entry[..separator].Trim();
                if (alias.Length > 0)
                {
                    pairs.Add((alias, entry[(separator + 1)..].Trim()));
                }
            }
        }
        return pairs;
    }
}
