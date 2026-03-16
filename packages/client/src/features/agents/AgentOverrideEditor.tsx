import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { MarkdownEditor } from '../../shared/markdown-editor/MarkdownEditor.js'
import { DiffViewer } from '../../shared/diff-viewer/DiffViewer.js'
import { useAgentDetail } from './use-agent-detail.js'
import { useNotifications } from '../../layout/NotificationProvider.js'

export function AgentOverrideEditor() {
  const { id } = useParams<{ id: string }>()
  const { data: agent } = useAgentDetail(id ?? '')
  const { notify } = useNotifications()
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Pre-populate from existing override file
  useEffect(() => {
    if (agent && !loaded) {
      const overridePath = `_config/agents/${agent.id}.customize.yaml`
      fetch(`/api/files/${overridePath}`)
        .then((r) => {
          if (!r.ok) throw new Error('Not found')
          return r.json()
        })
        .then((d) => {
          const data = d as { content: string }
          setContent(data.content)
          setOriginalContent(data.content)
        })
        .catch(() => {
          // No existing override — start empty with a template
          const template = `# Override customizations for ${agent.name}\n# Add custom instructions, modify behavior, or extend capabilities\n\n`
          setContent(template)
          setOriginalContent('')
        })
        .finally(() => setLoaded(true))
    }
  }, [agent, loaded])

  async function handleConfirmSave() {
    if (!agent) return
    setSaving(true)
    try {
      const overridePath = `_config/agents/${agent.id}.customize.yaml`
      const resp = await fetch(`/api/files/${overridePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (resp.ok) {
        setOriginalContent(content)
        setShowDiff(false)
        notify('success', `Override saved for ${agent.name}`)
      } else {
        notify('error', 'Failed to save override')
      }
    } catch {
      notify('error', 'Failed to save override')
    } finally {
      setSaving(false)
    }
  }

  if (!agent) {
    return (
      <div>
        <Link
          to={`/agents/${id}`}
          className="flex items-center gap-1 text-sm text-[var(--color-muted)] mb-4 hover:text-[var(--color-text)]"
        >
          <ArrowLeft size={16} /> Back to Agent
        </Link>
        <p className="text-[var(--color-muted)]">Loading agent...</p>
      </div>
    )
  }

  if (showDiff) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <h1 className="text-2xl font-extrabold mb-4">Override Changes: {agent.name}</h1>
        {saving && (
          <p className="text-sm text-[var(--color-muted)] mb-2">Saving...</p>
        )}
        <DiffViewer
          original={originalContent}
          modified={content}
          onConfirm={handleConfirmSave}
          onCancel={() => setShowDiff(false)}
        />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/agents/${id}`}
            className="flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="text-xl font-extrabold">Override: {agent.name}</h1>
        </div>
        <button
          onClick={() => setShowDiff(true)}
          disabled={content === originalContent}
          className="px-4 py-2 text-sm font-bold rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Review Changes
        </button>
      </div>
      <MarkdownEditor
        content={content}
        filePath={`_bmad/_config/agents/${agent.id}.customize.yaml`}
        onChange={setContent}
        onSave={() => setShowDiff(true)}
      />
    </div>
  )
}
