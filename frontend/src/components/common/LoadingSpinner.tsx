/**
 * Loading Spinner Component
 *
 * Simple loading spinner with customizable size
 */

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable loading spinner component
 *
 * @example
 * <LoadingSpinner size="md" />
 */
export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  const spinnerClasses = `
    ${sizeClasses[size]}
    border-primary-600
    border-t-transparent
    rounded-full
    animate-spin
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="flex items-center justify-center">
      <div className={spinnerClasses} role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Full page loading spinner overlay
 *
 * @example
 * <LoadingOverlay />
 */
export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-700 text-center">Loading...</p>
      </div>
    </div>
  );
}
