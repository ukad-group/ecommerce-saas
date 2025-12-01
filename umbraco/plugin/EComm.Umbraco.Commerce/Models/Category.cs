namespace EComm.Umbraco.Commerce.Models;

/// <summary>
/// Category DTO from the eCommerce API
/// </summary>
public class Category
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Description { get; set; }
    public string? ParentId { get; set; }
    public int DisplayOrder { get; set; }
    public List<Category> Children { get; set; } = new();
}
