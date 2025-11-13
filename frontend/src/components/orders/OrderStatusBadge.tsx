/**
 * Order Status Badge Component
 *
 * Displays order status with appropriate color coding based on custom status definitions.
 */

import type { OrderStatus } from '../../types/order';
import { useOrderStatuses } from '../../services/hooks/useOrderStatuses';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

/**
 * Convert hex color to lighter background and darker text colors
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  // Fetch order statuses (with caching)
  const { data: orderStatuses = [] } = useOrderStatuses();

  // Find the status definition
  const statusDef = orderStatuses.find((s) => s.code === status);

  // If we have a custom status definition, use its color and name
  if (statusDef) {
    const rgb = hexToRgb(statusDef.color);
    const bgColor = rgb
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
      : '#F3F4F6';
    const textColor = statusDef.color;

    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        {statusDef.name}
      </span>
    );
  }

  // Fallback to default gray styling
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      {status}
    </span>
  );
}
