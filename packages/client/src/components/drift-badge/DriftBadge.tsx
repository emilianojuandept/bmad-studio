/**
 * DriftBadge — header indicator for the drift count.
 *
 * Renders nothing when count === 0. When count > 0 displays a clickable
 * amber pill with an AlertTriangle icon and the count. Per NFR-A11Y-3,
 * the badge pairs the icon with text + an `aria-label` so colour is
 * never the sole indicator of meaning.
 */

import { AlertTriangle } from 'lucide-react'

export type DriftBadgeProps = {
  count: number
  onClick: () => void
}

export function DriftBadge({ count, onClick }: DriftBadgeProps) {
  if (count === 0) return null

  return (
    <button
      type="button"
      role="button"
      onClick={onClick}
      aria-label={`${count} drifted file${count === 1 ? '' : 's'}`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors cursor-pointer"
    >
      <AlertTriangle size={12} aria-hidden="true" />
      <span>{count} drifted</span>
    </button>
  )
}
