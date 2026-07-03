namespace EComm.Api.DTOs.Requests.Orders;

public class CreatePaymentRequest
{
    public string ReturnUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
    public string TermsUrl { get; set; } = string.Empty;
}
