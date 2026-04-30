/**
 * DriftListView — slide-over panel listing drifted files with per-row
 * "Convert to override" and "Reset to baseline" actions. Rendered when
 * the user clicks the DriftBadge in the sidebar header.
 */

import { X } from 'lucide-react'

import type { DriftedFile } from '@bmad-studio/shared'

export type DriftListViewProps = {
  files: DriftedFile[]
  onConvert: (file: DriftedFile) => void
  onReset: (file: DriftedFile) => void
  onClose: () => void
}

function shortHash(hash: string): string {
  return hash.slice(0, 8)
}

export function DriftListView({ files, onConvert, onReset, onClose }: DriftListViewProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Drifted files (${files.length})`}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      {/* panel */}
      <div className="relative w-[640px] max-w-full h-full bg-[var(--color-bg)] border-l border-[var(--color-border-subtle)] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--color-text)]">
            Drifted files ({files.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            aria-label="Close drift list"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--color-muted)]">
              No drift detected — every tracked file matches the baseline.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[var(--color-muted)] uppercase tracking-wider text-[10px]">
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className="text-left px-3 py-2 font-bold">Path</th>
                  <th className="text-left px-3 py-2 font-bold">Expected</th>
                  <th className="text-left px-3 py-2 font-bold">Actual</th>
                  <th className="text-right px-3 py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.path} className="border-b border-[var(--color-border-subtle)]">
                    <td
                      className="px-3 py-2 font-mono text-[var(--color-text)] truncate max-w-[260px]"
                      title={f.path}
                    >
                      {f.path}
                    </td>
                    <td className="px-3 py-2 font-mono text-[var(--color-muted)]" title={f.expectedHash}>
                      {shortHash(f.expectedHash)}
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-700" title={f.actualHash}>
                      {shortHash(f.actualHash)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onConvert(f)}
                          className="px-2 py-1 text-xs rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        >
                          Convert to override
                        </button>
                        <button
                          type="button"
                          onClick={() => onReset(f)}
                          className="px-2 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          Reset to baseline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
