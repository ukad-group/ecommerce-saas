using ECommShowcase.Web.Models.DTOs;

namespace ECommShowcase.Web.Models.ViewModels;

public class ProductListViewModel
{
    public List<ProductDto> Products { get; set; } = new();
    public List<CategoryDto> Categories { get; set; } = new();
    public string? SelectedCategoryId { get; set; }
    public string? SearchQuery { get; set; }
    public int CurrentPage { get; set; } = 1;
    public int TotalPages { get; set; } = 1;
    public int TotalProducts { get; set; }
    public string CurrencySymbol { get; set; } = "$";
}
