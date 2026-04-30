/**
 * DriftConvertFlow — Story 36.5
 *
 * Modal that fetches a cached DriftConversion payload by token, shows the
 * unified diff and (optionally) a proposed TOML override, and offers two
 * actions:
 *   - "Open in customize editor" — deep-links to the skill's customize page.
 *     The full editor lands in Epic 33; for now this is a plain anchor that
 *     navigates to /skills/<skillName>/customize so the rest of the flow
 *     can already drive into it.
 *   - "Dismiss" — closes the modal and clears the token.
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import type { DriftConversion } from '@bmad-studio/shared'

export type DriftConvertFlowProps = {
  token: string | null
  onClose: () => void
}

function deriveSkillName(filePath: string): string {
  // Skill paths look like `bmm/agents/<name>/SKILL.md` or `bmm/skills/<name>/SKILL.md`.
  // Fall back to the last path segment without extension.
  const parts = filePath.split('/').filter(Boolean)
  const skillIdx = parts.findIndex((p) => p === 'agents' || p === 'skills')
  if (skillIdx >= 0 && parts[skillIdx + 1]) return parts[skillIdx + 1]
  const last = parts[parts.length - 1] ?? filePath
  return last.replace(/\.[^.]+$/, '')
}

export function DriftConvertFlow({ token, onClose }: DriftConvertFlowProps) {
  const [data, setData] = useState<DriftConversion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    fetch(`/api/drift/conversions/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return (await res.json()) as DriftConversion
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Fetch failed'))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) return null

  const skillName = data ? deriveSkillName(data.filePath) : ''

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Convert drift to override"
      className="fixed inset-0 z-[60] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-[820px] max-w-full max-h-[90vh] overflow-hidden bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--color-text)]">Convert drift to override</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-surface-raised)]"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading && (
            <p className="text-sm text-[var(--color-muted)]" role="status">
              Loading conversion…
            </p>
          )}
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          {data && (
            <>
              <div>
                <p className="text-xs text-[var(--color-muted)] mb-1">File</p>
                <p className="font-mono text-sm text-[var(--color-text)]">{data.filePath}</p>
              </div>

              <div>
                <p className="text-xs text-[var(--color-muted)] mb-1">Unified diff</p>
                <pre className="font-mono text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded p-3 overflow-x-auto whitespace-pre">
                  {data.unifiedDiff}
                </pre>
              </div>

              {data.proposedOverride && (
                <div>
                  <p className="text-xs text-[var(--color-muted)] mb-1">Proposed TOML override</p>
                  <pre className="font-mono text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded p-3 overflow-x-auto whitespace-pre">
                    {data.proposedOverride}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--color-border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)]"
          >
            Dismiss
          </button>
          {data && (
            <a
              href={`/skills/${skillName}/customize?from-drift=${token}`}
              className="px-3 py-1.5 text-xs rounded bg-[var(--color-accent)] text-white hover:opacity-90"
            >
              Open in customize editor
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
