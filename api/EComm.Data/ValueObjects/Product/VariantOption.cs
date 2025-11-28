namespace EComm.Data.ValueObjects.Product;

public class VariantOption
{
    public string Name { get; set; } = string.Empty;
    public List<string> Values { get; set; } = new();
}
