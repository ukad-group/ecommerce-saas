namespace EComm.Data.ValueObjects.Order;

public class CustomerInfo
{
    public string? CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }

    /// <summary>Set for a company (B2B) purchase; null/blank ⇒ a private person. Drives the Nets
    /// consumer.company block and B2B consumerType.</summary>
    public string? CompanyName { get; set; }
}
