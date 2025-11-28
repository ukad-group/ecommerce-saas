using EComm.Data.Entities;

namespace EComm.Api.DTOs.Responses.Products;

public class ProductListResponse
{
    public List<Product> Data { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
