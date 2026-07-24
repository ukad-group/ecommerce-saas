namespace EComm.Api.DTOs.Requests.Markets;

public class SetActivePaymentProviderRequest
{
    /// <summary>Provider alias to make active, or null/empty to clear the market's active provider.</summary>
    public string? Alias { get; set; }
}
