namespace EComm.Data.ValueObjects.Tenant;

public class LeasingPeriod
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Factor { get; set; }
}
