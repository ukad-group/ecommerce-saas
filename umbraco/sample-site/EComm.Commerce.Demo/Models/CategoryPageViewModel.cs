using EComm.Umbraco.Commerce.Models;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Web.Common.PublishedModels;

namespace EComm.Commerce.Demo.Controllers;

public class CategoryPageViewModel : PublishedContentWrapped
{
    public CategoryPageViewModel(IPublishedContent content, IPublishedValueFallback publishedValueFallback)
        : base(content, publishedValueFallback)
    {
    }

    public string? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public List<Product> Products { get; set; } = new();
    public int TotalProducts { get; set; }
    public List<IPublishedContent> CategoryPages { get; set; } = new();
    public List<IPublishedContent> RootCategoryPages { get; set; } = new();
    public string? ErrorMessage { get; set; }
}
