namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Cart DTO from the eCommerce API
/// </summary>
public class Cart
{
    public string Id { get; set; } = string.Empty;

    /// <summary>The storefront's handle on the cart — and the only identity it has, since a cart
    /// carries no customer details until checkout turns it into an order.</summary>
    public string SessionId { get; set; } = string.Empty;

    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public List<CartItem> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>Paged cart list for the backoffice Carts view — mirrors <see cref="OrderListResult"/>.</summary>
public class CartListResult
{
    public List<Cart> Carts { get; set; } = new();
    public int TotalCount { get; set; }
}

public class CartItem
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }

    /// <summary>Caller-supplied line classifier, e.g. "Trailer"/"TrailerOption"/"Accessory".</summary>
    public string? ItemType { get; set; }
    public string? ItemSubType { get; set; }

    public string ProductName { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
    public int? AvailableStock { get; set; }
}

/// <summary>
/// Request body for <see cref="ICommerceApiClient.CreateOrderAsync"/>
/// </summary>
public class CreateOrderRequest
{
    public OrderCustomer Customer { get; set; } = new();
    public OrderAddress ShippingAddress { get; set; } = new();
    public OrderAddress? BillingAddress { get; set; }
    public string? ShippingMethodId { get; set; }
    public List<CustomProperty>? CustomProperties { get; set; }
}
