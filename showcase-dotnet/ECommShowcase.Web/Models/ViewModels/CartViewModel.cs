using ECommShowcase.Web.Models.DTOs;

namespace ECommShowcase.Web.Models.ViewModels;

public class CartViewModel
{
    public CartDto Cart { get; set; } = new();
    public string CurrencySymbol { get; set; } = "$";
    public bool IsEmpty => Cart.Items.Count == 0;
    public int TotalItems => Cart.Items.Sum(i => i.Quantity);
}
