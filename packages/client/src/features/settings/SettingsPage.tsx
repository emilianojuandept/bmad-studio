import { useEffect, useState } from 'react'

import { useThemeStore } from '../../stores/ui-store.js'
import { toggleTheme } from '../../lib/theme.js'
import { useNotifications } from '../../layout/NotificationProvider.js'

type Settings = {
  port: number
  theme: 'dark' | 'light'
}

export function SettingsPage() {
  const theme = useThemeStore((s) => s.theme)
  const setThemeState = useThemeStore((s) => s.setTheme)
  const { notify } = useNotifications()
  const [, setSettings] = useState<Settings>({ port: 4040, theme: 'dark' })
  const [loading, setLoading] = useState(true)
  const [port, setPort] = useState('4040')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const data = d as Settings
        setSettings(data)
        setPort(String(data.port ?? 4040))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleToggleTheme() {
    const next = toggleTheme()
    setThemeState(next)
    setDirty(true)
  }

  function handlePortChange(value: string) {
    setPort(value)
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const portNum = parseInt(port, 10)
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      notify('error', 'Port must be between 1024 and 65535')
      setSaving(false)
      return
    }

    try {
      const resp = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum, theme }),
      })
      if (resp.ok) {
        setSettings({ port: portNum, theme })
        setDirty(false)
        notify('success', 'Settings saved')
      } else {
        notify('error', 'Failed to save settings')
      }
    } catch {
      notify('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Settings</h1>
        <div className="h-32 rounded-lg bg-[var(--color-surface-raised)] animate-pulse" />
      </div>
    )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Studio</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-surface-raised)]">
            <div>
              <p className="text-sm font-bold">Theme</p>
              <p className="text-xs text-[var(--color-muted)]">
                Toggle between dark and light mode
              </p>
            </div>
            <button
              onClick={handleToggleTheme}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg)] transition-colors"
            >
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--color-surface-raised)]">
            <div>
              <p className="text-sm font-bold">Port</p>
              <p className="text-xs text-[var(--color-muted)]">
                Server port (requires restart)
              </p>
            </div>
            <input
              type="number"
              value={port}
              onChange={(e) => handlePortChange(e.target.value)}
              min={1024}
              max={65535}
              className="w-24 px-3 py-1.5 text-sm text-right rounded-md bg-[var(--color-bg)] border border-[var(--color-border-subtle)] text-[var(--color-text)] font-[var(--font-mono)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">Project</h2>
        <div className="p-4 rounded-lg bg-[var(--color-surface-raised)]">
          <p className="text-sm text-[var(--color-muted)]">
            Project settings are configured via <code className="font-[var(--font-mono)]">_bmad/config.yaml</code>
          </p>
        </div>
      </section>
    </div>
  )
}
