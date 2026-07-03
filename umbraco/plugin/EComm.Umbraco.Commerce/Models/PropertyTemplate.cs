namespace EComm.Umbraco.Commerce.Models;

public class PropertyTemplate
{
    public string Name { get; set; } = string.Empty;
    public string? DefaultValue { get; set; }
    public int SortOrder { get; set; }
}
