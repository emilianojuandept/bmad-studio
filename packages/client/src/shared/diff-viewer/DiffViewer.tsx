type DiffLine = {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number | null
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  const lines: DiffLine[] = []

  const maxLen = Math.max(originalLines.length, modifiedLines.length)
  for (let i = 0; i < maxLen; i++) {
    const orig = originalLines[i]
    const mod = modifiedLines[i]

    if (orig === mod) {
      lines.push({ type: 'unchanged', content: orig ?? '', lineNumber: i + 1 })
    } else {
      if (orig !== undefined) {
        lines.push({ type: 'removed', content: orig, lineNumber: i + 1 })
      }
      if (mod !== undefined) {
        lines.push({ type: 'added', content: mod, lineNumber: i + 1 })
      }
    }
  }

  return lines
}

type DiffViewerProps = {
  original: string
  modified: string
  onConfirm?: () => void
  onCancel?: () => void
}

export function DiffViewer({ original, modified, onConfirm, onCancel }: DiffViewerProps) {
  if (original === modified) {
    return (
      <div className="p-8 text-center text-[var(--color-muted)]">
        <p className="text-sm">No changes to save</p>
      </div>
    )
  }

  const lines = computeDiff(original, modified)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto font-[var(--font-mono)] text-sm">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`px-4 py-0.5 ${
              line.type === 'added'
                ? 'bg-green-950/30 text-green-400'
                : line.type === 'removed'
                  ? 'bg-red-950/30 text-red-400'
                  : 'text-[var(--color-text)]'
            }`}
          >
            <span className="inline-block w-6 text-right mr-3 text-[var(--color-muted)] select-none">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            {line.content}
          </div>
        ))}
      </div>
      {(onConfirm || onCancel) && (
        <div className="flex justify-end gap-3 px-4 py-3 border-t border-[var(--color-border-subtle)]">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors"
            >
              Cancel
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm rounded-md bg-[var(--color-accent)] text-white font-bold hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Confirm Save
            </button>
          )}
        </div>
      )}
    </div>
  )
}
