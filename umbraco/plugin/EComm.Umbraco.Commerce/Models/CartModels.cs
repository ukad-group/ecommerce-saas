namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Cart DTO from the eCommerce API
/// </summary>
public class Cart
{
    public string Id { get; set; } = string.Empty;
    public List<CartItem> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
}

public class CartItem
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public string? OptionId { get; set; }

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
