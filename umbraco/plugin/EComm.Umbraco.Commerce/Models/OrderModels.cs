using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace EComm.Umbraco.Commerce.Models;

public class Order
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }

    [JsonPropertyName("shipping")]
    public decimal ShippingCost { get; set; }

    /// <summary>Flat surcharge for the market's payment provider, snapshotted when the order was
    /// created. 0 when the market configured no surcharge for its active provider.</summary>
    public decimal PaymentFee { get; set; }

    /// <summary>Tax on <see cref="PaymentFee"/>, from the surcharge's tax class. Kept out of
    /// <see cref="Tax"/>, which stays the goods tax.</summary>
    public decimal PaymentFeeTax { get; set; }

    /// <summary>Subtotal + Tax + ShippingCost + PaymentFee + PaymentFeeTax. A breakdown that omits the
    /// payment fee will not add up to this.</summary>
    public decimal Total { get; set; }

    public OrderCustomer Customer { get; set; } = new();
    public OrderAddress ShippingAddress { get; set; } = new();
    public OrderAddress? BillingAddress { get; set; }

    [JsonPropertyName("lineItems")]
    public List<OrderItem> Items { get; set; } = new();

    public string? TrackingNumber { get; set; }

    /// <summary>Free-form order-level fields (e.g. trailerComment, leasingPeriodId,
    /// message) that don't warrant a dedicated column each. Per-line classifiers like itemType/
    /// itemSubType live on OrderItem instead — see OrderItem.ItemType.</summary>
    public List<CustomProperty>? CustomProperties { get; set; }

    /// <summary>Payment lifecycle set by the market's payment provider: "Initialized" → "Authorized" →
    /// "Captured", or "Failed" / "Cancelled" / "Refunded". This — not <see cref="Status"/>, which is
    /// whatever code the market maps payment success to — is what says whether a payment settled.</summary>
    public string? PaymentStatus { get; set; }

    /// <summary>The provider's payment id for this order's payment, once one has been created.</summary>
    public string? PaymentReference { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePaymentResult
{
    public string PaymentId { get; set; } = string.Empty;
    public string? RedirectUrl { get; set; }
}

public class OrderItem
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }

    /// <summary>Caller-supplied line classifier, e.g. "Trailer"/"TrailerOption"/"Accessory".</summary>
    public string? ItemType { get; set; }
    public string? ItemSubType { get; set; }

    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }

    [JsonPropertyName("lineTotal")]
    public decimal Subtotal { get; set; }

    public string Currency { get; set; } = "USD";
}

public class OrderCustomer
{
    public string? CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }

    /// <summary>Set for a company (B2B) purchase; null/blank ⇒ a private person. The API fills the
    /// Nets consumer.company block and defaults the hosted checkout to B2B when this is present.</summary>
    public string? CompanyName { get; set; }
}

public class OrderAddress
{
    public string Street { get; set; } = string.Empty;
    public string? Street2 { get; set; }
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class OrderListResult
{
    public List<Order> Orders { get; set; } = new();
    public int TotalCount { get; set; }
}

/// <summary>
/// The Orders view's advanced filter, forwarded to GET /api/v1/orders verbatim. Every field is a
/// string because the plugin only relays them — the API owns the parsing (dates, the comma-separated
/// property/SKU lists) and the matching rules.
///
/// The query names are explicit so both hops use the same spelling (`?skus=…`, not `?filter.skus=…`)
/// and neither depends on prefix fallback to bind.
/// </summary>
public class OrderFilter
{
    [FromQuery(Name = "firstName")]
    public string? FirstName { get; set; }

    [FromQuery(Name = "lastName")]
    public string? LastName { get; set; }

    [FromQuery(Name = "email")]
    public string? Email { get; set; }

    [FromQuery(Name = "orderNumber")]
    public string? OrderNumber { get; set; }

    /// <summary>A payment state, or "none" for orders with no payment record.</summary>
    [FromQuery(Name = "paymentStatus")]
    public string? PaymentStatus { get; set; }

    [FromQuery(Name = "placedAfter")]
    public string? PlacedAfter { get; set; }

    [FromQuery(Name = "placedBefore")]
    public string? PlacedBefore { get; set; }

    [FromQuery(Name = "properties")]
    public string? Properties { get; set; }

    [FromQuery(Name = "skus")]
    public string? Skus { get; set; }

    /// <summary>The supplied fields as query-string pairs, blanks dropped.</summary>
    public IEnumerable<KeyValuePair<string, string>> ToQuery()
    {
        var fields = new (string Name, string? Value)[]
        {
            ("firstName", FirstName), ("lastName", LastName), ("email", Email),
            ("orderNumber", OrderNumber), ("paymentStatus", PaymentStatus),
            ("placedAfter", PlacedAfter), ("placedBefore", PlacedBefore),
            ("properties", Properties), ("skus", Skus),
        };

        return fields
            .Where(f => !string.IsNullOrWhiteSpace(f.Value))
            .Select(f => new KeyValuePair<string, string>(f.Name, f.Value!.Trim()));
    }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class OrderStatusDefinition
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Color { get; set; } = "#6B7280";
    public int SortOrder { get; set; }
    public bool IsSystemDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
