/**
 * Utilities Barrel Export
 *
 * Centralized exports for all utility functions
 */

// Currency utilities
export { formatCurrency } from './currency';

// Validation utilities
export {
  isValidEmail,
  isValidPhone,
  isValidUSPostalCode,
  isValidCAPostalCode,
  isValidPostalCode,
  isRequired,
  hasMinLength,
  validateAddress,
} from './validation';

// Storage utilities
export {
  getItem,
  setItem,
  removeItem,
  clearAll,
  hasItem,
} from './storage';

// Order helper utilities
export {
  getValidStatusTransitions,
  canTransitionTo,
  getStatusColor,
  getStatusLabel,
  isTerminalStatus,
  isCart,
  getAllStatuses,
} from './orderHelpers';

// Responsive utilities
export { useMediaQuery, useResponsive, BREAKPOINTS } from './useMediaQuery';
