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
// Locale per currency so amounts format natively (e.g. SEK -> "1 234,56 kr", not "$"/"SEK 1,234.56").
const CURRENCY_LOCALES: Record<string, string> = {
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  EUR: 'de-DE',
  GBP: 'en-GB',
  USD: 'en-US',
};

export function formatCurrency(amount: number, currency = 'USD'): string {
  const code = currency || 'USD';
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[code] ?? 'en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for invalid currency codes
    console.error(`Invalid currency code: ${currency}`, error);
    return `${code} ${amount.toFixed(2)}`;
  }
}
