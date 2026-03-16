import type { WebSocketEvent } from '@bmad-studio/shared'

const INITIAL_RETRY_MS = 1000
const MAX_RETRY_MS = 30000

type EventHandler = (event: WebSocketEvent) => void
type StatusHandler = (connected: boolean) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private retryMs = INITIAL_RETRY_MS
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private handlers: EventHandler[] = []
  private statusHandlers: StatusHandler[] = []
  private closed = false

  constructor(url: string) {
    this.url = url
  }

  connect() {
    if (this.closed) return

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.retryMs = INITIAL_RETRY_MS
        this.notifyStatus(true)
      }

      this.ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data as string) as WebSocketEvent
          for (const handler of this.handlers) {
            handler(event)
          }
        } catch {
          // Ignore malformed messages
        }
      }

      this.ws.onclose = () => {
        this.notifyStatus(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        // onclose will fire after onerror
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.closed) return

    this.retryTimer = setTimeout(() => {
      this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS)
      this.connect()
    }, this.retryMs)
  }

  private notifyStatus(connected: boolean) {
    for (const handler of this.statusHandlers) {
      handler(connected)
    }
  }

  onMessage(handler: EventHandler) {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.push(handler)
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler)
    }
  }

  close() {
    this.closed = true
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
