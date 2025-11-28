namespace EComm.Data.ValueObjects.Tenant;

public class CustomPropertyTemplate
{
    public string Name { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public int SortOrder { get; set; }
}
