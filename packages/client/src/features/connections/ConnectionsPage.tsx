import { useEffect, useState } from 'react'
import { Plug, CheckCircle, Monitor, Settings } from 'lucide-react'

import { EmptyState } from '../../shared/EmptyState.js'
import { SlideOver } from '../../shared/SlideOver.js'
import { SkeletonCard } from '../../shared/Skeleton.js'

type OverviewData = {
  detected: boolean
  sections: {
    ideConfigs?: { ides: string[]; count: number }
  }
}

export function ConnectionsPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIde, setSelectedIde] = useState<string | null>(null)
  const [configContent, setConfigContent] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  useEffect(() => {
    fetch('/api/overview')
      .then((r) => r.json())
      .then((d) => {
        setData(d as OverviewData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSelectIde(ide: string) {
    if (selectedIde === ide) {
      setSelectedIde(null)
      setConfigContent(null)
      return
    }
    setSelectedIde(ide)
    setConfigLoading(true)
    try {
      // Try to load the IDE config file
      const resp = await fetch(`/api/files/_config/ides/${ide}.yaml`)
      if (resp.ok) {
        const data = (await resp.json()) as { content: string }
        setConfigContent(data.content)
      } else {
        setConfigContent(null)
      }
    } catch {
      setConfigContent(null)
    } finally {
      setConfigLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Connections</h1>
        <SkeletonCard count={3} />
      </div>
    )
  }

  const ides = data?.sections?.ideConfigs?.ides ?? []

  if (ides.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Connections</h1>
        <EmptyState
          icon={Plug}
          title="No connections configured"
          description="IDE configurations will appear here when detected in your BMAD project's _config/ides/ directory."
        />
      </div>
    )
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-extrabold mb-8">
          Connections ({ides.length})
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ides.map((ide) => (
            <button
              key={ide}
              onClick={() => handleSelectIde(ide)}
              className={`p-4 rounded-lg border text-left transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                selectedIde === ide
                  ? 'bg-[var(--color-surface-raised)] border-[var(--color-accent)]'
                  : 'bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] hover:border-[var(--color-accent)]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-[var(--color-bg)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                  <Monitor size={16} className="text-[var(--color-accent)]" />
                </div>
                <span className="font-bold text-sm">{ide}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-xs text-[var(--color-success)]">Configured</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedIde && (
        <SlideOver
          open
          title={selectedIde}
          onClose={() => { setSelectedIde(null); setConfigContent(null) }}
        >
            <div>
              <h3 className="text-sm font-bold mb-2">Status</h3>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-surface-raised)]">
                <CheckCircle size={16} className="text-[var(--color-success)]" />
                <span className="text-sm">Connected and active</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2">Integration</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-surface-raised)] text-sm">
                  <Settings size={14} className="text-[var(--color-muted)]" />
                  <span>Agent commands</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-surface-raised)] text-sm">
                  <Settings size={14} className="text-[var(--color-muted)]" />
                  <span>Skill shortcuts</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-[var(--color-surface-raised)] text-sm">
                  <Settings size={14} className="text-[var(--color-muted)]" />
                  <span>Workflow triggers</span>
                </div>
              </div>
            </div>

            {configLoading && (
              <div className="h-32 rounded-lg bg-[var(--color-surface-raised)] animate-pulse" />
            )}

            {configContent && !configLoading && (
              <div>
                <h3 className="text-sm font-bold mb-2">Configuration</h3>
                <pre className="p-3 text-xs font-[var(--font-mono)] bg-[var(--color-surface-raised)] rounded-lg overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {configContent}
                </pre>
              </div>
            )}

            <div className="text-xs text-[var(--color-muted)]">
              <p>Config file: <code className="font-[var(--font-mono)]">_bmad/_config/ides/{selectedIde}.yaml</code></p>
            </div>
        </SlideOver>
      )}
    </div>
  )
}
