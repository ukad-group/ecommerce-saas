namespace EComm.Api.DTOs.Requests.Cart;

public class AddCartItemRequest
{
    public string ProductId { get; set; } = string.Empty;
    public string? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
}
