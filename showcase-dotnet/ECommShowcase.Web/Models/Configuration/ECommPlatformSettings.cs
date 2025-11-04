namespace ECommShowcase.Web.Models.Configuration;

public class ECommPlatformSettings
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string MarketId { get; set; } = string.Empty;
    public int Timeout { get; set; } = 30;
}

public class ShowcaseSettings
{
    public string StoreName { get; set; } = "Demo Shop";
    public string Currency { get; set; } = "USD";
    public string CurrencySymbol { get; set; } = "$";
    public int FeaturedProductCount { get; set; } = 8;
    public int ProductsPerPage { get; set; } = 12;
}
