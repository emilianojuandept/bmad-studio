import { useEffect, useRef, useCallback } from 'react'
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
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // Capture trigger element on open, return focus on close
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement
      requestAnimationFrame(() => panelRef.current?.focus())
    } else {
      returnFocusRef.current?.focus()
      returnFocusRef.current = null
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.closest('[aria-hidden="true"]'))

      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === panel) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="slide-over-backdrop" role="presentation">
      <div className="slide-over-bg" onClick={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
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
              aria-label="Close panel"
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
