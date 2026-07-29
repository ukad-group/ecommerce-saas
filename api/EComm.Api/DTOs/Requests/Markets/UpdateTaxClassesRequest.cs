using EComm.Data.ValueObjects.Tenant;

namespace EComm.Api.DTOs.Requests.Markets;

public class UpdateTaxClassesRequest
{
    public List<TaxClass> TaxClasses { get; set; } = new();

    /// <summary>The market's flat fallback rate (0.25 = 25%), used when the active payment provider
    /// names no tax class. Null leaves the stored rate alone, so a caller that only edits classes
    /// can't blank it by omission.</summary>
    public decimal? TaxRate { get; set; }
}
