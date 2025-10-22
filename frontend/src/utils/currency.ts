/**
 * Currency Utilities
 *
 * Provides currency formatting functions using Intl.NumberFormat
 */

/**
 * Formats a numeric amount as a currency string
 *
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$1,234.56")
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 * formatCurrency(1234.56, 'GBP') // "£1,234.56"
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for invalid currency codes
    console.error(`Invalid currency code: ${currency}`, error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}
