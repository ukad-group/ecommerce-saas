/**
 * Validation Utilities
 *
 * Provides validation functions for common input types
 */

/**
 * Validates an email address format
 *
 * @param email - Email address to validate
 * @returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a phone number format
 * Accepts various formats: (123) 456-7890, 123-456-7890, 1234567890, +1 123 456 7890
 *
 * @param phone - Phone number to validate
 * @returns true if phone number is valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Check if we have at least 10 digits (US/CA) or starts with + and has at least 10 digits
  if (cleaned.startsWith('+')) {
    return cleaned.length >= 11 && cleaned.length <= 15;
  }

  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Validates a US postal code (ZIP code)
 * Accepts formats: 12345 or 12345-6789
 *
 * @param postalCode - Postal code to validate
 * @returns true if postal code is valid, false otherwise
 */
export function isValidUSPostalCode(postalCode: string): boolean {
  if (!postalCode || typeof postalCode !== 'string') {
    return false;
  }

  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(postalCode.trim());
}

/**
 * Validates a Canadian postal code
 * Format: A1A 1A1 or A1A1A1
 *
 * @param postalCode - Postal code to validate
 * @returns true if postal code is valid, false otherwise
 */
export function isValidCAPostalCode(postalCode: string): boolean {
  if (!postalCode || typeof postalCode !== 'string') {
    return false;
  }

  const canadaRegex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
  return canadaRegex.test(postalCode.trim());
}

/**
 * Validates a postal code for US or Canada
 *
 * @param postalCode - Postal code to validate
 * @param country - Country code ('US' or 'CA')
 * @returns true if postal code is valid for the country, false otherwise
 */
export function isValidPostalCode(postalCode: string, country: 'US' | 'CA' = 'US'): boolean {
  if (country === 'CA') {
    return isValidCAPostalCode(postalCode);
  }
  return isValidUSPostalCode(postalCode);
}

/**
 * Validates that a required field is not empty
 *
 * @param value - Value to validate
 * @returns true if value is not empty, false otherwise
 */
export function isRequired(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a string meets minimum length requirement
 *
 * @param value - String to validate
 * @param minLength - Minimum required length
 * @returns true if string meets minimum length, false otherwise
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

/**
 * Validates address fields
 *
 * @param address - Address object with required fields
 * @returns Object with validation result and error messages
 */
export function validateAddress(address: {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!isRequired(address.line1)) {
    errors.line1 = 'Address line 1 is required';
  }

  if (!isRequired(address.city)) {
    errors.city = 'City is required';
  }

  if (!isRequired(address.state)) {
    errors.state = 'State/Province is required';
  }

  if (!isRequired(address.postalCode)) {
    errors.postalCode = 'Postal code is required';
  } else if (address.country === 'US' && !isValidUSPostalCode(address.postalCode!)) {
    errors.postalCode = 'Invalid US postal code';
  } else if (address.country === 'CA' && !isValidCAPostalCode(address.postalCode!)) {
    errors.postalCode = 'Invalid Canadian postal code';
  }

  if (!isRequired(address.country)) {
    errors.country = 'Country is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
