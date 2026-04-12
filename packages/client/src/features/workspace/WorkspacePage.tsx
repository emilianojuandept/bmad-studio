import { useEffect, useState } from 'react'
import { Briefcase, ChevronDown, ChevronRight, Settings } from 'lucide-react'
import Markdown from 'react-markdown'

import { EmptyState } from '../../shared/EmptyState.js'
import { MarkdownEditor } from '../../shared/markdown-editor/MarkdownEditor.js'
import { useNotifications } from '../../layout/NotificationProvider.js'
import { Skeleton } from '../../shared/Skeleton.js'

type ViewTab = 'structured' | 'raw' | 'preview' | 'config'

type Section = {
  title: string
  content: string
}

function parseSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split('\n')
  let currentTitle = ''
  let currentLines: string[] = []

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/)
    if (headerMatch) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({
          title: currentTitle || 'Introduction',
          content: currentLines.join('\n').trim(),
        })
      }
      currentTitle = headerMatch[1]
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentTitle || currentLines.length > 0) {
    sections.push({
      title: currentTitle || 'Content',
      content: currentLines.join('\n').trim(),
    })
  }

  return sections
}

function CollapsibleSection({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-raised)] text-left transition-colors"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-[var(--color-muted)]" />
        ) : (
          <ChevronRight size={16} className="text-[var(--color-muted)]" />
        )}
        <span className="font-bold text-sm">{section.title}</span>
      </button>
      {expanded && section.content && (
        <div className="px-4 py-3 text-sm text-[var(--color-text)]">
          <pre className="whitespace-pre-wrap font-[var(--font-mono)] text-xs">{section.content}</pre>
        </div>
      )}
    </div>
  )
}

export function WorkspacePage() {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editContent, setEditContent] = useState('')
  const [activeTab, setActiveTab] = useState<ViewTab>('structured')
  const [editing, setEditing] = useState(false)
  const [configContent, setConfigContent] = useState<string | null>(null)
  const [configEditContent, setConfigEditContent] = useState('')
  const { notify } = useNotifications()

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/files/project-context.md')
        .then((r) => {
          if (!r.ok) throw new Error('Not found')
          return r.json()
        })
        .then((d) => {
          const data = d as { content: string }
          setContent(data.content)
          setEditContent(data.content)
        }),
      fetch('/api/files/core/config.yaml')
        .then((r) => {
          if (!r.ok) return fetch('/api/files/config.yaml').then((r2) => { if (!r2.ok) throw new Error('Not found'); return r2.json() })
          return r.json()
        })
        .then((d) => {
          const data = d as { content: string }
          setConfigContent(data.content)
          setConfigEditContent(data.content)
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    try {
      const resp = await fetch('/api/files/project-context.md', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      if (resp.ok) {
        setContent(editContent)
        setEditing(false)
        notify('success', 'Project Settings context saved')
      } else {
        notify('error', 'Failed to save project context')
      }
    } catch {
      notify('error', 'Failed to save project context')
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Project Settings</h1>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (content === null && !editing) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold mb-8">Project Settings</h1>
        <EmptyState
          icon={Briefcase}
          title="No project context found"
          description="Create a project-context.md file in your _bmad/ directory to help agents understand your project."
          actions={
            <button
              onClick={() => {
                const template = `# Project Context\n\n## Overview\nDescribe your project here.\n\n## Tech Stack\nList your technologies.\n\n## Architecture\nDescribe your architecture.\n`
                setContent('')
                setEditContent(template)
                setEditing(true)
              }}
              className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Create Project Settings Context
            </button>
          }
        />
      </div>
    )
  }

  if (editing) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold">Edit Project Settings Context</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false)
                setEditContent(content ?? '')
              }}
              className="px-4 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
        <MarkdownEditor
          content={editContent}
          filePath="_bmad/project-context.md"
          onChange={setEditContent}
          onSave={handleSave}
        />
      </div>
    )
  }

  const sections = parseSections(content ?? '')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-extrabold">Project Settings</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[var(--color-surface-raised)] rounded-md p-0.5">
            {(['structured', 'raw', 'preview', 'config'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded min-h-[36px] transition-colors ${
                  activeTab === tab
                    ? 'bg-[var(--color-bg)] text-[var(--color-text)] font-bold shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {activeTab === 'structured' && (
        <div className="space-y-3">
          {sections.map((section, i) => (
            <CollapsibleSection key={i} section={section} />
          ))}
          {sections.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">No structured sections found in project context.</p>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
          <pre className="p-4 text-sm font-[var(--font-mono)] overflow-x-auto whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] p-6">
          <div className="prose prose-sm max-w-none text-[var(--color-text)] prose-headings:text-[var(--color-text)] prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-a:text-[var(--color-accent)] prose-strong:text-[var(--color-text)]">
            <Markdown>{content ?? ''}</Markdown>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-sm font-bold">BMAD Configuration</h2>
            <span className="text-xs text-[var(--color-muted)] font-[var(--font-mono)]">_bmad/config.yaml</span>
          </div>
          {configContent !== null ? (
            <div className="rounded-lg border border-[var(--color-border-subtle)] overflow-hidden h-[500px]">
              <MarkdownEditor
                content={configEditContent}
                filePath="_bmad/config.yaml"
                onChange={setConfigEditContent}
                onSave={async () => {
                  try {
                    // Try core/config.yaml first, then config.yaml
                    let resp = await fetch('/api/files/core/config.yaml', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content: configEditContent }),
                    })
                    if (!resp.ok) {
                      resp = await fetch('/api/files/config.yaml', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: configEditContent }),
                      })
                    }
                    if (resp.ok) {
                      setConfigContent(configEditContent)
                      notify('success', 'Configuration saved')
                    } else {
                      notify('error', 'Failed to save configuration')
                    }
                  } catch {
                    notify('error', 'Failed to save configuration')
                  }
                }}
              />
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[var(--color-surface-raised)] text-sm text-[var(--color-muted)]">
              No config.yaml found in the _bmad/ directory.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
