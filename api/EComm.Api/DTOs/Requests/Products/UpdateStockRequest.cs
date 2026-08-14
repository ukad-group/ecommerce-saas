using System.ComponentModel.DataAnnotations;

namespace EComm.Api.DTOs.Requests.Products;

public class UpdateStockRequest
{
    [Range(0, int.MaxValue, ErrorMessage = "Stock quantity cannot be negative.")]
    public int StockQuantity { get; set; }
}
