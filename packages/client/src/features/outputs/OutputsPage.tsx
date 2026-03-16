import { useEffect, useState, useCallback, useMemo } from 'react'
import { FileOutput, Folder, ChevronDown, ChevronRight } from 'lucide-react'

import { EmptyState } from '../../shared/EmptyState.js'
import { SlideOver } from '../../shared/SlideOver.js'
import { MarkdownEditor } from '../../shared/markdown-editor/MarkdownEditor.js'
import { CsvViewer } from '../../shared/CsvViewer.js'
import { useDetailParam } from '../../hooks/use-detail-param.js'

type OutputFile = { path: string; name: string; type: string; size: number; modifiedAt: string }

type GroupedOutputs = {
  [folder: string]: OutputFile[]
}

function groupByFolder(outputs: OutputFile[]): GroupedOutputs {
  const groups: GroupedOutputs = {}
  for (const file of outputs) {
    // Skip dotfiles
    if (file.name.startsWith('.')) continue
    const parts = file.path.split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root'
    if (!groups[folder]) groups[folder] = []
    groups[folder].push(file)
  }
  return groups
}

function FolderGroup({
  folder,
  files,
  selectedPath,
  onSelect,
}: {
  folder: string
  files: OutputFile[]
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const displayName = folder === 'root' ? 'Root' : folder.split('/').pop() ?? folder

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-[var(--color-surface-raised)] rounded-md transition-colors"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--color-muted)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--color-muted)]" />
        )}
        <Folder size={14} className="text-[var(--color-accent)]" />
        <span className="text-sm font-bold">{displayName}</span>
        <span className="text-xs text-[var(--color-muted)]">({files.length})</span>
      </button>
      {expanded && (
        <div className="ml-4 space-y-0.5">
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => onSelect(f.path)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors cursor-pointer text-left ${
                selectedPath === f.path
                  ? 'bg-[var(--color-surface-raised)] text-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-surface-raised)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileOutput size={14} className="text-[var(--color-muted)]" />
                <span className="text-sm">{f.name}</span>
              </div>
              <span className="text-xs text-[var(--color-muted)]">
                {new Date(f.modifiedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function OutputsPage() {
  const [outputs, setOutputs] = useState<OutputFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useDetailParam('path')
  const [selectedContent, setSelectedContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    fetch('/api/outputs')
      .then((r) => r.json())
      .then((d) => {
        setOutputs(d as OutputFile[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => groupByFolder(outputs), [outputs])
  const visibleCount = useMemo(
    () => Object.values(grouped).reduce((sum, files) => sum + files.length, 0),
    [grouped],
  )

  const handleSelect = useCallback(
    async (filePath: string) => {
      if (selectedPath === filePath) {
        setSelectedPath(null)
        return
      }
      setSelectedPath(filePath)
      setContentLoading(true)
      try {
        const resp = await fetch(`/api/outputs/${filePath}`)
        if (resp.ok) {
          const data = (await resp.json()) as { content: string; path: string }
          setSelectedContent(data.content)
        }
      } catch {
        setSelectedContent('Failed to load file content.')
      } finally {
        setContentLoading(false)
      }
    },
    [selectedPath],
  )

  if (loading)
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Outputs</h1>
        <div className="h-32 rounded-lg bg-[var(--color-surface-raised)] animate-pulse" />
      </div>
    )

  if (visibleCount === 0)
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Outputs</h1>
        <EmptyState
          icon={FileOutput}
          title="No outputs yet"
          description="Run workflows to generate output files."
        />
      </div>
    )

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-8">Outputs ({visibleCount})</h1>
      <div className="space-y-2">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([folder, files]) => (
            <FolderGroup
              key={folder}
              folder={folder}
              files={files}
              selectedPath={selectedPath}
              onSelect={handleSelect}
            />
          ))}
      </div>

      <SlideOver
        open={!!selectedPath}
        title={selectedPath ?? ''}
        onClose={() => setSelectedPath(null)}
      >
        {contentLoading ? (
          <div className="h-64 rounded bg-[var(--color-surface-raised)] animate-pulse" />
        ) : selectedPath?.endsWith('.csv') ? (
          <CsvViewer content={selectedContent} />
        ) : (
          <div className="h-96 rounded-lg overflow-hidden border border-[var(--color-border-subtle)]">
            <MarkdownEditor
              content={selectedContent}
              filePath={selectedPath ?? ''}
              onChange={() => {}}
              readOnly
            />
          </div>
        )}
      </SlideOver>
    </div>
  )
}
