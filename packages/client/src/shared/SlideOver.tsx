import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type SlideOverProps = {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  width?: string
}

export function SlideOver({ open, onClose, title, actions, children, width }: SlideOverProps) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Focus the panel when it opens
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="slide-over-backdrop">
      <div className="slide-over-bg" onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="slide-over-panel outline-none"
        style={{ width: width ?? 'max(400px, 40vw)' }}
      >
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold truncate">{title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button
              onClick={onClose}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 65px)' }}>
          {children}
        </div>
      </aside>
    </div>
  )
}
