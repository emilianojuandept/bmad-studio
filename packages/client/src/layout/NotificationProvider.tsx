import { createContext, useContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'

type NotificationType = 'success' | 'warning' | 'error' | 'info'

type Notification = {
  id: string
  type: NotificationType
  message: string
  details?: string
  persistent: boolean
}

type NotificationContextValue = {
  notifications: Notification[]
  notify: (type: NotificationType, message: string, details?: string) => void
  dismiss: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  notify: () => {},
  dismiss: () => {},
})

export function useNotifications() {
  return useContext(NotificationContext)
}

let nextId = 0

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const notify = useCallback(
    (type: NotificationType, message: string, details?: string) => {
      const id = String(++nextId)
      const persistent = type === 'error' || type === 'warning'

      setNotifications((prev) => [...prev.slice(-2), { id, type, message, details, persistent }])

      if (!persistent) {
        setTimeout(() => dismiss(id), type === 'success' ? 3000 : 5000)
      }
    },
    [dismiss],
  )

  return (
    <NotificationContext.Provider value={{ notifications, notify, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map((n) => (
          <div
            key={n.id}
            role="alert"
            aria-live="polite"
            className={`px-4 py-3 rounded-md shadow-lg border text-sm ${
              n.type === 'success'
                ? 'bg-[var(--color-surface-raised)] border-[var(--color-success)] text-[var(--color-success)]'
                : n.type === 'warning'
                  ? 'bg-[var(--color-surface-raised)] border-[var(--color-warning)] text-[var(--color-warning)]'
                  : n.type === 'error'
                    ? 'bg-[var(--color-surface-raised)] border-[var(--color-error)] text-[var(--color-error)]'
                    : 'bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] text-[var(--color-text)]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p>{n.message}</p>
              {n.persistent && (
                <button
                  onClick={() => dismiss(n.id)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-text)] shrink-0"
                  aria-label="Dismiss notification"
                >
                  x
                </button>
              )}
            </div>
            {n.details && (
              <details className="mt-2 text-xs text-[var(--color-muted)]">
                <summary className="cursor-pointer">Details</summary>
                <pre className="mt-1 whitespace-pre-wrap font-[var(--font-mono)]">{n.details}</pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
