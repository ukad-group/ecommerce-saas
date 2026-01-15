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
    
    /// <summary>
    /// Breadcrumb trail for product navigation (built from content tree)
    /// </summary>
    public List<CategoryBreadcrumb>? CategoryBreadcrumbs { get; set; }
}

/// <summary>
/// Represents a category in the breadcrumb trail
/// </summary>
public class CategoryBreadcrumb
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

