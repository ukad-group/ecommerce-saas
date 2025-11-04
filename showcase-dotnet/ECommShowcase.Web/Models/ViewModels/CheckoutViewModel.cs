using ECommShowcase.Web.Models.DTOs;
using System.ComponentModel.DataAnnotations;

namespace ECommShowcase.Web.Models.ViewModels;

public class CheckoutViewModel
{
    public CartDto Cart { get; set; } = new();
    public string CurrencySymbol { get; set; } = "$";

    [Required(ErrorMessage = "Full name is required")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email address")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Invalid phone number")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Street address is required")]
    public string Street { get; set; } = string.Empty;

    public string? Street2 { get; set; }

    [Required(ErrorMessage = "City is required")]
    public string City { get; set; } = string.Empty;

    [Required(ErrorMessage = "State is required")]
    public string State { get; set; } = string.Empty;

    [Required(ErrorMessage = "Postal code is required")]
    public string PostalCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Country is required")]
    public string Country { get; set; } = "USA";
}

public class OrderConfirmationViewModel
{
    public OrderDto Order { get; set; } = new();
    public string CurrencySymbol { get; set; } = "$";
}
