namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// A named, selectable leasing period (e.g. "36 months") from the eCommerce API
/// </summary>
public class LeasingPeriod
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Factor { get; set; }
}

/// <summary>
/// A market's leasing options: the selectable periods plus the fallback factor for
/// products that don't set their own <see cref="Product.LeasingFactor"/>.
/// </summary>
public class LeasingSettings
{
    public List<LeasingPeriod> Periods { get; set; } = new();
    public decimal? DefaultLeasingFactor { get; set; }
}
