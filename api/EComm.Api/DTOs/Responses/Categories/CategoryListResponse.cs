using EComm.Data.Entities;

namespace EComm.Api.DTOs.Responses.Categories;

public class CategoryListResponse
{
    public List<Category> Data { get; set; } = new();
}
