using EComm.Umbraco.Commerce.Models;

namespace EComm.Umbraco.Commerce.Services;

/// <summary>
/// Client for communicating with the eCommerce API
/// </summary>
public interface ICommerceApiClient
{
    /// <summary>
    /// Gets all categories for the configured market
    /// </summary>
    Task<List<Category>> GetCategoriesAsync();

    /// <summary>
    /// Gets a single category by ID
    /// </summary>
    Task<Category?> GetCategoryAsync(string categoryId);

    /// <summary>
    /// Gets products for a category with pagination
    /// </summary>
    Task<ProductListResult> GetProductsAsync(string categoryId, int page = 1, int pageSize = 20);

    /// <summary>
    /// Gets all products across all categories with pagination
    /// </summary>
    Task<ProductListResult> GetAllProductsAsync(int page = 1, int pageSize = 100);

    /// <summary>
    /// Gets a product by its slug within a category
    /// </summary>
    Task<Product?> GetProductBySlugAsync(string categoryId, string slug);

    /// <summary>
    /// Gets a product by ID
    /// </summary>
    Task<Product?> GetProductAsync(string productId);
}

public class ProductListResult
{
    public List<Product> Products { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
