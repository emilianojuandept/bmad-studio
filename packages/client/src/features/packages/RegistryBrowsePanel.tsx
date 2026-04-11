import { useEffect, useState } from 'react'

import { AlertTriangle, ArrowUpCircle, CheckCircle, RefreshCw, Search } from 'lucide-react'
import semver from 'semver'

import type { ModuleYaml, RegistryIndex, RegistryModuleEntry } from '@bmad-studio/shared'

type InstallSource = {
  type: 'github'
  value: string
  prefetchedModuleYaml?: ModuleYaml | null
}

type Props = {
  installedModules: { name: string; version: string }[]
  onInstall: (source: InstallSource) => void
}

export function RegistryBrowsePanel({ installedModules, onInstall }: Props) {
  const [index, setIndex] = useState<RegistryIndex | null>(null)
  const [configured, setConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/registry')
      const data = (await resp.json()) as { ok: boolean; configured?: boolean; index?: RegistryIndex; error?: { message?: string } }
      if (!data.ok) {
        setConfigured(data.configured ?? false)
        setIndex(null)
        return
      }
      setConfigured(true)
      setIndex(data.index ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registry')
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      const resp = await fetch('/api/registry/refresh', { method: 'POST' })
      const data = (await resp.json()) as { ok: boolean; index?: RegistryIndex }
      if (data.ok && data.index) setIndex(data.index)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading)
    return <div className="text-sm text-[var(--color-muted)] py-8 text-center">Loading registry...</div>

  if (!configured) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[var(--color-muted)] mb-4">
          No registry configured. Configure one in Settings → Module Registry to browse shared modules from your team.
        </p>
        <a href="/settings" className="text-[var(--color-accent)] underline text-sm">
          Configure registry
        </a>
      </div>
    )
  }

  if (error)
    return <p className="text-sm text-[var(--color-error)] py-4">{error}</p>

  if (!index) return null

  const filtered = index.modules.filter((m) => {
    if (!filter.trim()) return true
    const q = filter.trim().toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      (m.tags ?? []).some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {index.indexYamlError && (
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm flex items-center gap-2 text-[var(--color-text)]">
          <AlertTriangle size={14} className="text-yellow-500 shrink-0" />
          <span>Registry index file has errors — showing all modules alphabetically. ({index.indexYamlError})</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search registry..."
            className="w-full pl-7 pr-3 py-1.5 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <p className="text-xs text-[var(--color-muted)] mb-3">
        Last synced: {new Date(index.fetchedAt).toLocaleString()} · {index.modules.length} module{index.modules.length === 1 ? '' : 's'}
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] text-center py-8">No modules match your search.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <RegistryRow
              key={m.code}
              module={m}
              installedModules={installedModules}
              onInstall={onInstall}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RegistryRow({
  module: m,
  installedModules,
  onInstall,
  index,
}: {
  module: RegistryModuleEntry
  installedModules: { name: string; version: string }[]
  onInstall: (source: InstallSource) => void
  index: RegistryIndex
}) {
  const installed = installedModules.find((im) => im.name === m.code)
  const bothSemverValid = installed && semver.valid(installed.version) && semver.valid(m.version)
  const updateAvailable = bothSemverValid ? semver.gt(m.version, installed!.version) : false
  const versionComparisonSkipped =
    installed && (!semver.valid(installed.version) || !semver.valid(m.version))

  const sourceValue = `${index.owner}/${index.repo}/${m.code}@${index.branch}`

  return (
    <div className="p-3 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-raised)] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm">{m.name}</h3>
            <span className="text-xs text-[var(--color-muted)]">v{m.version}</span>
            {m.status && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  m.status === 'stable' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {m.status}
              </span>
            )}
          </div>
          {m.description && (
            <p className="text-sm text-[var(--color-muted)] mt-1 line-clamp-2">{m.description}</p>
          )}
          <div className="flex gap-3 text-xs text-[var(--color-muted)] mt-2">
            <span>{m.agentCount} agent{m.agentCount === 1 ? '' : 's'}</span>
            <span>{m.workflowCount} workflow{m.workflowCount === 1 ? '' : 's'}</span>
            <span>{m.taskCount} task{m.taskCount === 1 ? '' : 's'}</span>
          </div>
          {m.tags && m.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {m.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {installed && !updateAvailable ? (
            <span className="flex items-center gap-1 text-sm text-[var(--color-success)] whitespace-nowrap">
              <CheckCircle size={14} />
              Installed v{installed.version}
              {versionComparisonSkipped && (
                <span
                  title={`Update detection requires both versions to be valid semver. Installed: "${installed.version}", registry: "${m.version}". Compare manually.`}
                  className="ml-1 text-[var(--color-muted)] cursor-help"
                >
                  ⓘ
                </span>
              )}
            </span>
          ) : updateAvailable ? (
            <button
              onClick={() => onInstall({ type: 'github', value: sourceValue, prefetchedModuleYaml: m.rawModuleYaml })}
              className="px-3 py-1.5 text-sm rounded-md bg-yellow-500 text-white flex items-center gap-1.5 hover:bg-yellow-600 transition-colors whitespace-nowrap"
            >
              <ArrowUpCircle size={14} />
              Update to v{m.version}
            </button>
          ) : (
            <button
              onClick={() => onInstall({ type: 'github', value: sourceValue, prefetchedModuleYaml: m.rawModuleYaml })}
              className="px-3 py-1.5 text-sm rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
