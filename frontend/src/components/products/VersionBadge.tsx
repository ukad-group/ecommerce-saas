/**
 * Version Badge Component
 *
 * Displays product version number with optional "View History" button.
 */

import { ClockIcon } from '@heroicons/react/24/outline';

interface VersionBadgeProps {
  version: number;
  onViewHistory?: () => void;
  showButton?: boolean;
}

export function VersionBadge({ version, onViewHistory, showButton = true }: VersionBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        v{version}
      </span>
      {showButton && onViewHistory && (
        <button
          type="button"
          onClick={onViewHistory}
          className="inline-flex items-center gap-1 text-xs text-[#4a6ba8] hover:text-[#3d5789]"
        >
          <ClockIcon className="h-3.5 w-3.5" />
          View History
        </button>
      )}
    </div>
  );
}
