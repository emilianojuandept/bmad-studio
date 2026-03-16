import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

type SearchResult = {
  type: 'agent' | 'skill' | 'workflow'
  id: string
  name: string
  description: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const openPalette = useCallback(() => {
    setQuery('')
    setResults([])
    setSelectedIndex(0)
    setOpen(true)
  }, [])

  const closePalette = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          closePalette()
        } else {
          openPalette()
        }
      }
      if (e.key === 'Escape' && open) {
        closePalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, openPalette, closePalette])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) return

    const controller = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setResults(data as SearchResult[]))
      .catch(() => {})

    return () => controller.abort()
  }, [query])

  function navigateToResult(result: SearchResult) {
    const routes: Record<string, string> = {
      agent: '/agents',
      skill: '/skills',
      workflow: '/workflows',
    }
    navigate(`${routes[result.type]}/${result.id}`)
    closePalette()
  }

  function handleResultKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigateToResult(results[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={closePalette}
    >
      <div
        className="w-full max-w-lg bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleResultKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <Search size={18} className="text-[var(--color-muted)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search agents, skills, workflows..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!e.target.value.trim()) setResults([])
            }}
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
          />
          <kbd className="text-xs text-[var(--color-muted)] px-1.5 py-0.5 rounded border border-[var(--color-border-subtle)]">
            esc
          </kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto py-2">
            {results.map((result, i) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => navigateToResult(result)}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 text-sm ${
                  i === selectedIndex
                    ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] uppercase">
                  {result.type}
                </span>
                <div>
                  <p className="font-bold">{result.name}</p>
                  <p className="text-xs text-[var(--color-muted)] truncate">{result.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">
            No results found
          </div>
        )}
      </div>
    </div>
  )
}
