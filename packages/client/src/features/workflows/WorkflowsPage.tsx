import { useState, useMemo } from 'react'
import { GitBranch, List, LayoutGrid, Plus } from 'lucide-react'

import type { WorkflowListItem, WorkflowType } from '@bmad-studio/shared'

import { useWorkflows, useWorkflowDetail } from './use-workflows.js'
import { WorkflowDetailPanel } from './WorkflowDetailPanel.js'
import { WorkflowGraph } from './WorkflowGraph.js'
import { EmptyState } from '../../shared/EmptyState.js'
import { EntityPageHeader } from '../../shared/EntityPageHeader.js'
import { CreateWorkflowDialog } from './CreateWorkflowDialog.js'
import { useDetailParam } from '../../hooks/use-detail-param.js'

const TYPE_BADGE_STYLES: Record<string, string> = {
  'step-based': 'border-[var(--color-border-subtle)] text-[var(--color-muted)]',
  'agent-based': 'border-purple-400/50 text-purple-400',
  composite: 'border-blue-400/50 text-blue-400',
}

export function WorkflowTypeBadge({ type }: { type?: WorkflowType }) {
  if (!type) return null
  const label = type === 'step-based' ? 'Step' : type === 'agent-based' ? 'Agent' : 'Composite'
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs border ${TYPE_BADGE_STYLES[type] ?? TYPE_BADGE_STYLES['step-based']}`}
    >
      {label}
    </span>
  )
}

function humanizePhase(phase: string): string {
  // "2-plan-workflows" → "Plan Workflows"
  return phase
    .replace(/^\d+-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type PhaseGroup = [phase: string, workflows: WorkflowListItem[]]

function groupByPhase(workflows: WorkflowListItem[]): PhaseGroup[] {
  const groups = new Map<string, WorkflowListItem[]>()
  for (const wf of workflows) {
    const key = wf.phase ?? '__ungrouped'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(wf)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === '__ungrouped') return 1
    if (b === '__ungrouped') return -1
    const numA = parseInt(a) || 999
    const numB = parseInt(b) || 999
    return numA - numB
  })
}

export function WorkflowsPage() {
  const { data: workflows, isLoading, refetch } = useWorkflows()
  const [view, setView] = useState<'list' | 'graph'>('list')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useDetailParam('detail')
  const [activeModule, setActiveModule] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [graphWorkflowId, setGraphWorkflowId] = useState<string | null>(null)
  const { data: graphWorkflow } = useWorkflowDetail(graphWorkflowId ?? '')

  const modules = useMemo(() => {
    if (!workflows) return []
    const set = new Set<string>()
    for (const wf of workflows) {
      if (wf.module) set.add(wf.module)
    }
    return Array.from(set).sort()
  }, [workflows])

  const moduleCounts = useMemo(() => {
    if (!workflows) return {}
    const counts: Record<string, number> = {}
    for (const wf of workflows) {
      if (wf.module) counts[wf.module] = (counts[wf.module] ?? 0) + 1
    }
    return counts
  }, [workflows])

  const filtered = useMemo(() => {
    if (!workflows) return []
    let result = workflows
    if (activeModule !== 'all') {
      result = result.filter((wf) => wf.module === activeModule)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (wf) =>
          wf.name.toLowerCase().includes(q) ||
          (wf.description && wf.description.toLowerCase().includes(q)),
      )
    }
    return result
  }, [workflows, activeModule, search])

  const phaseGroups = useMemo(() => groupByPhase(filtered), [filtered])

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Workflows</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-[var(--color-surface-raised)] animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Workflows</h1>
        <EmptyState
          icon={GitBranch}
          title="No workflows found"
          description="Install a module or create a workflow to get started."
        />
      </div>
    )
  }

  return (
    <div>
      <div>
        <EntityPageHeader
          title="Workflows"
          count={workflows.length}
          modules={modules}
          moduleCounts={moduleCounts}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          search={search}
          onSearchChange={setSearch}
          actions={
            <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} />
              New Workflow
            </button>
            <div className="flex gap-1 bg-[var(--color-surface-raised)] rounded-md p-0.5">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded min-h-[36px] transition-colors ${
                  view === 'list'
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] font-bold shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <List size={14} />
                List
              </button>
              <button
                onClick={() => setView('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded min-h-[36px] transition-colors ${
                  view === 'graph'
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] font-bold shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <LayoutGrid size={14} />
                Graph
              </button>
            </div>
            </div>
          }
        />

        {view === 'list' && (
          <div className="space-y-6">
            {phaseGroups.map(([phase, wfs]) => (
              <div key={phase}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2 px-1">
                  {phase === '__ungrouped' ? 'Ungrouped' : humanizePhase(phase)}
                  <span className="ml-2 font-normal">({wfs.length})</span>
                </h3>
                <div className="space-y-2">
                  {wfs.map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => setSelectedId(selectedId === wf.id ? null : wf.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer text-left ${
                        selectedId === wf.id
                          ? 'bg-[var(--color-surface-raised)] border-[var(--color-accent)]'
                          : 'bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch size={18} className="text-[var(--color-muted)]" />
                        <div>
                          <p className="text-sm font-bold">{wf.name}</p>
                          <p className="text-xs text-[var(--color-muted)] truncate max-w-md">
                            {wf.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                        <WorkflowTypeBadge type={wf.type} />
                        <span>{wf.stepCount} steps</span>
                        {wf.module && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border-subtle)]">
                            {wf.module}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'graph' && (
          <div className="space-y-4">
            {/* Dropdown selector */}
            <select
              value={graphWorkflowId ?? ''}
              onChange={(e) => setGraphWorkflowId(e.target.value || null)}
              className="w-full px-3 py-2 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] min-h-[36px]"
            >
              <option value="">Select a workflow...</option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name}{wf.module ? ` (${wf.module})` : ''}
                </option>
              ))}
            </select>

            {!graphWorkflowId && (
              <div className="flex items-center justify-center h-64 rounded-lg border border-dashed border-[var(--color-border-subtle)] text-[var(--color-muted)]">
                <p className="text-sm">Select a workflow above to view its graph</p>
              </div>
            )}

            {graphWorkflow && (
              <WorkflowGraph
                workflow={graphWorkflow}
                onStepClick={() => {
                  setSelectedId(graphWorkflowId)
                }}
              />
            )}
          </div>
        )}
      </div>

      {selectedId && (
        <WorkflowDetailPanel workflowId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {showCreate && (
        <CreateWorkflowDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
