namespace EComm.Data.ValueObjects.Tenant;

public class TenantSettings
{
    public int MaxMarkets { get; set; }
    public int MaxUsers { get; set; }
    public List<string>? Features { get; set; }
}
