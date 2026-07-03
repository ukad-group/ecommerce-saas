using System.ComponentModel.DataAnnotations;

namespace EComm.Commerce.Demo.Models;

public class CheckoutFormModel
{
    // Customer info
    [Required(ErrorMessage = "Full name is required")]
    [Display(Name = "Full Name")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Enter a valid email address")]
    [Display(Name = "Email Address")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Enter a valid phone number")]
    [Display(Name = "Phone (optional)")]
    public string? Phone { get; set; }

    // Shipping address
    [Required(ErrorMessage = "Street address is required")]
    [Display(Name = "Street Address")]
    public string ShippingStreet { get; set; } = string.Empty;

    [Display(Name = "Apartment, suite, etc.")]
    public string? ShippingStreet2 { get; set; }

    [Required(ErrorMessage = "City is required")]
    [Display(Name = "City")]
    public string ShippingCity { get; set; } = string.Empty;

    [Required(ErrorMessage = "State / region is required")]
    [Display(Name = "State / Region")]
    public string ShippingState { get; set; } = string.Empty;

    [Required(ErrorMessage = "Postal code is required")]
    [Display(Name = "Postal Code")]
    public string ShippingPostalCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "Country is required")]
    [Display(Name = "Country")]
    public string ShippingCountry { get; set; } = "United Kingdom";

    // Billing address
    public bool BillingSameAsShipping { get; set; } = true;

    [Display(Name = "Street Address")]
    public string? BillingStreet { get; set; }

    [Display(Name = "Apartment, suite, etc.")]
    public string? BillingStreet2 { get; set; }

    [Display(Name = "City")]
    public string? BillingCity { get; set; }

    [Display(Name = "State / Region")]
    public string? BillingState { get; set; }

    [Display(Name = "Postal Code")]
    public string? BillingPostalCode { get; set; }

    [Display(Name = "Country")]
    public string? BillingCountry { get; set; }
}
