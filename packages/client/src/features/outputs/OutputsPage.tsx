import { useEffect, useState, useCallback, useMemo } from 'react'
import { FileOutput, ChevronDown, ChevronRight, Brain, FileText, Wrench, Layers, GitBranch, Users, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { EmptyState } from '../../shared/EmptyState.js'
import { SlideOver } from '../../shared/SlideOver.js'
import { MarkdownEditor } from '../../shared/markdown-editor/MarkdownEditor.js'
import { CsvViewer } from '../../shared/CsvViewer.js'
import { useDetailParam } from '../../hooks/use-detail-param.js'

type OutputFile = { path: string; name: string; type: string; size: number; modifiedAt: string }
type OutputCategory = 'brainstorming' | 'planning' | 'implementation' | 'other'

const CATEGORY_META: Record<OutputCategory, { label: string; description: string; icon: typeof Brain; color: string }> = {
  brainstorming: {
    label: 'Brainstorming',
    description: 'Ideation sessions, gap analyses, and exploration documents',
    icon: Brain,
    color: 'text-purple-400',
  },
  planning: {
    label: 'Planning',
    description: 'PRDs, architecture docs, epics, tech specs, and readiness reports',
    icon: FileText,
    color: 'text-blue-400',
  },
  implementation: {
    label: 'Implementation',
    description: 'Story artifacts, sprint status, code reviews, and retrospectives',
    icon: Wrench,
    color: 'text-[var(--color-accent)]',
  },
  other: {
    label: 'Other',
    description: 'Miscellaneous output files',
    icon: Layers,
    color: 'text-[var(--color-muted)]',
  },
}

function categorise(relPath: string): OutputCategory {
  if (relPath.startsWith('brainstorming/')) return 'brainstorming'
  if (relPath.startsWith('planning-artifacts/')) return 'planning'
  if (relPath.startsWith('implementation-artifacts/')) return 'implementation'
  return 'other'
}

function cleanName(name: string): string {
  return name
    .replace(/\.(md|yaml|yml|txt)$/i, '')
    .replace(/-(\d{4}-\d{2}-\d{2})(-\d{4})?$/, '') // strip trailing date from brainstorming sessions
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

type FrontmatterRefs = {
  workflow?: string
  agent?: string
  skill?: string
  story?: string | number
  epic?: string | number
  sprint?: string | number
  status?: string
}

function parseFrontmatterRefs(content: string): FrontmatterRefs {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = match[1]
  const refs: FrontmatterRefs = {}
  const extract = (key: string): string | undefined => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined
  }
  const w = extract('workflow'); if (w) refs.workflow = w
  const a = extract('agent'); if (a) refs.agent = a
  const s = extract('skill'); if (s) refs.skill = s
  const st = extract('story'); if (st) refs.story = st
  const ep = extract('epic'); if (ep) refs.epic = ep
  const sp = extract('sprint'); if (sp) refs.sprint = sp
  const status = extract('status'); if (status) refs.status = status
  return refs
}

function ArtifactCrossLinks({ refs }: { refs: FrontmatterRefs }) {
  const navigate = useNavigate()
  const links: Array<{ label: string; route: string; icon: typeof GitBranch; color: string }> = []

  if (refs.workflow) {
    links.push({ label: `Workflow: ${refs.workflow}`, route: `/workflows?detail=${refs.workflow}`, icon: GitBranch, color: 'text-purple-400' })
  }
  if (refs.agent) {
    links.push({ label: `Agent: ${refs.agent}`, route: `/agents/${refs.agent}`, icon: Users, color: 'text-[var(--color-accent)]' })
  }
  if (refs.skill) {
    links.push({ label: `Skill: ${refs.skill}`, route: `/skills?detail=${refs.skill}`, icon: Zap, color: 'text-[var(--color-success)]' })
  }

  const tags: string[] = []
  if (refs.status) tags.push(`status: ${refs.status}`)
  if (refs.epic !== undefined) tags.push(`epic ${refs.epic}`)
  if (refs.sprint !== undefined) tags.push(`sprint ${refs.sprint}`)
  if (refs.story !== undefined) tags.push(`story ${refs.story}`)

  if (links.length === 0 && tags.length === 0) return null

  return (
    <div className="mb-4 p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">From this artifact</p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => {
          const IconComponent = l.icon
          return (
            <button
              key={l.route}
              onClick={() => navigate(l.route)}
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg)] transition-colors ${l.color}`}
            >
              <IconComponent size={11} />
              {l.label}
            </button>
          )
        })}
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded-md bg-[var(--color-bg)] border border-[var(--color-border-subtle)] text-[var(--color-muted)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function CategorySection({
  category,
  files,
  selectedPath,
  onSelect,
  defaultOpen,
}: {
  category: OutputCategory
  files: OutputFile[]
  selectedPath: string | null
  onSelect: (path: string) => void
  defaultOpen: boolean
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const { label, description, icon: Icon, color } = CATEGORY_META[category]

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-raised)] hover:bg-[var(--color-bg)] transition-colors text-left"
      >
        {expanded
          ? <ChevronDown size={16} className="text-[var(--color-muted)] shrink-0" />
          : <ChevronRight size={16} className="text-[var(--color-muted)] shrink-0" />}
        <Icon size={16} className={`${color} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{label}</span>
            <span className="text-xs text-[var(--color-muted)]">({files.length})</span>
          </div>
          {!expanded && (
            <p className="text-xs text-[var(--color-muted)] truncate">{description}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {files
            .slice()
            .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
            .map((f) => {
              const isSelected = selectedPath === f.path
              const date = new Date(f.modifiedAt)
              const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
              const isYaml = /\.(yaml|yml)$/i.test(f.name)

              return (
                <button
                  key={f.path}
                  onClick={() => onSelect(f.path)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-surface-raised)] border-l-2 border-l-[var(--color-accent)]'
                      : 'hover:bg-[var(--color-surface-raised)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={13} className={`${color} shrink-0`} />
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${isSelected ? 'font-bold text-[var(--color-accent)]' : ''}`}>
                        {cleanName(f.name)}
                      </p>
                      {isYaml && (
                        <span className="text-[10px] text-[var(--color-muted)] font-[var(--font-mono)]">yaml</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-[var(--color-muted)]">{dateStr}</span>
                    {f.size > 0 && (
                      <span className="text-xs text-[var(--color-muted)] hidden sm:inline">
                        {f.size > 1024 ? `${(f.size / 1024).toFixed(0)}K` : `${f.size}B`}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
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

  const artifactRefs = useMemo(() => parseFrontmatterRefs(selectedContent), [selectedContent])

  // ?category= param for jumping to a section from the Home page
  const [, setCategoryParam] = useDetailParam('category')
  void setCategoryParam // used only as a hint — we just ensure the section is expanded

  useEffect(() => {
    fetch('/api/outputs')
      .then((r) => r.json())
      .then((d) => {
        setOutputs(d as OutputFile[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load content whenever selectedPath changes (handles URL deep links too)
  useEffect(() => {
    if (!selectedPath) {
      setSelectedContent('')
      return
    }
    setContentLoading(true)
    fetch(`/api/outputs/${selectedPath}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data: { content: string }) => setSelectedContent(data.content))
      .catch(() => setSelectedContent('Failed to load file content.'))
      .finally(() => setContentLoading(false))
  }, [selectedPath])

  const handleSelect = useCallback(
    (filePath: string) => {
      setSelectedPath(selectedPath === filePath ? null : filePath)
    },
    [selectedPath, setSelectedPath],
  )

  const grouped = useMemo(() => {
    const result: Partial<Record<OutputCategory, OutputFile[]>> = {}
    for (const f of outputs) {
      if (f.name.startsWith('.')) continue
      const cat = categorise(f.path)
      if (!result[cat]) result[cat] = []
      result[cat]!.push(f)
    }
    return result
  }, [outputs])

  const totalVisible = useMemo(() => Object.values(grouped).reduce((s, arr) => s + arr.length, 0), [grouped])

  const selectedFileName = selectedPath ? selectedPath.split('/').pop() ?? selectedPath : ''

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Outputs</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[var(--color-surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (totalVisible === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Outputs</h1>
        <EmptyState
          icon={FileOutput}
          title="No outputs yet"
          description="BMAD outputs are artifacts produced by running workflows — brainstorming sessions, PRDs, architecture docs, sprint plans, and story files. Run a BMAD workflow in your IDE to generate your first output."
          actions={
            <Link to="/workflows" className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors">
              Browse Workflows
            </Link>
          }
        />
      </div>
    )
  }

  const categoryOrder: OutputCategory[] = ['brainstorming', 'planning', 'implementation', 'other']

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold">Outputs ({totalVisible})</h1>
      </div>

      <div className="space-y-3">
        {categoryOrder
          .filter((cat) => grouped[cat] && grouped[cat]!.length > 0)
          .map((cat, idx) => (
            <CategorySection
              key={cat}
              category={cat}
              files={grouped[cat]!}
              selectedPath={selectedPath}
              onSelect={handleSelect}
              defaultOpen={idx === 0}
            />
          ))}
      </div>

      <SlideOver
        open={!!selectedPath}
        title={cleanName(selectedFileName)}
        onClose={() => setSelectedPath(null)}
        width="max(480px, 50vw)"
      >
        {contentLoading ? (
          <div className="h-64 rounded bg-[var(--color-surface-raised)] animate-pulse" />
        ) : selectedPath?.endsWith('.csv') ? (
          <CsvViewer content={selectedContent} />
        ) : (
          <>
            <ArtifactCrossLinks refs={artifactRefs} />
            <div className="rounded-lg overflow-hidden border border-[var(--color-border-subtle)]" style={{ height: 'calc(100vh - 200px)' }}>
              <MarkdownEditor
                content={selectedContent}
                filePath={selectedPath ?? ''}
                onChange={() => {}}
                readOnly
              />
            </div>
          </>
        )}
      </SlideOver>
    </div>
  )
}
