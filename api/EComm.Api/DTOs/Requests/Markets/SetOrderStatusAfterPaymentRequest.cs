namespace EComm.Api.DTOs.Requests.Markets;

public class SetOrderStatusAfterPaymentRequest
{
    /// <summary>Order status code to set on successful payment, or null/empty to fall back to "paid".</summary>
    public string? Code { get; set; }
}
