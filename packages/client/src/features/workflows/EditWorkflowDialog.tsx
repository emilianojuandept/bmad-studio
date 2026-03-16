import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import type { Workflow } from '@bmad-studio/shared'

type EditWorkflowDialogProps = {
  workflow: Workflow
  onClose: () => void
  onSaved: () => void
}

export function EditWorkflowDialog({ workflow, onClose, onSaved }: EditWorkflowDialogProps) {
  const queryClient = useQueryClient()
  const [description, setDescription] = useState(workflow.description || '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const resp = await fetch(`/api/workflows/${encodeURIComponent(workflow.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      if (!resp.ok) {
        const data = (await resp.json()) as { error?: { message?: string } }
        throw new Error(data.error?.message ?? 'Failed to update workflow')
      }
      await queryClient.invalidateQueries({ queryKey: ['workflows'] })
      await queryClient.invalidateQueries({ queryKey: ['workflow', workflow.id] })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Edit Workflow</h2>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name (read-only) */}
          <div>
            <label className="block text-sm font-bold mb-1">Name</label>
            <input
              type="text"
              value={workflow.name}
              disabled
              className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] opacity-50 cursor-not-allowed"
            />
          </div>

          {/* Type (read-only) */}
          <div>
            <label className="block text-sm font-bold mb-1">Type</label>
            <input
              type="text"
              value={workflow.type ?? 'step-based'}
              disabled
              className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-[var(--color-muted)] mt-1">Type cannot be changed after creation</p>
          </div>

          {/* Phase (read-only) */}
          {workflow.phase && (
            <div>
              <label className="block text-sm font-bold mb-1">Phase</label>
              <input
                type="text"
                value={workflow.phase}
                disabled
                className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] opacity-50 cursor-not-allowed"
              />
            </div>
          )}

          {/* Description (editable) */}
          <div>
            <label className="block text-sm font-bold mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this workflow do?"
              className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] focus:border-[var(--color-accent)] focus:outline-none resize-none"
            />
          </div>

          {/* Info */}
          <div className="text-xs text-[var(--color-muted)] space-y-1 pt-2 border-t border-[var(--color-border-subtle)]">
            <p>Module: <code className="font-[var(--font-mono)]">{workflow.module ?? 'unknown'}</code></p>
            <p>Steps: <code className="font-[var(--font-mono)]">{workflow.steps.length}</code></p>
            <p>File: <code className="font-[var(--font-mono)] break-all">{workflow.entryPoint}</code></p>
          </div>

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save size={14} />
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
