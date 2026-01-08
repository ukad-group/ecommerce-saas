using EComm.Umbraco.Commerce.Models;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Web.Common.PublishedModels;

namespace EComm.Commerce.Demo.Controllers;

public class ProductPageViewModel : PublishedContentWrapped
{
    public ProductPageViewModel(IPublishedContent content, IPublishedValueFallback publishedValueFallback)
        : base(content, publishedValueFallback)
    {
    }

    public Product? Product { get; set; }
    public Category? Category { get; set; }
    public string? ErrorMessage { get; set; }
}
