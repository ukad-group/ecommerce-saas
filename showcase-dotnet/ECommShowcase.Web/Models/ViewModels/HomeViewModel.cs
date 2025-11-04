using ECommShowcase.Web.Models.DTOs;

namespace ECommShowcase.Web.Models.ViewModels;

public class HomeViewModel
{
    public List<ProductDto> FeaturedProducts { get; set; } = new();
    public List<CategoryDto> Categories { get; set; } = new();
    public string StoreName { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = "$";
}
