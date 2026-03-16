import { useEffect, useRef, useState, useCallback } from 'react'

import type { WebSocketEvent } from '@bmad-studio/shared'

import { WebSocketClient } from '../lib/websocket-client.js'

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export function useWebSocket(onEvent?: (event: WebSocketEvent) => void) {
  const clientRef = useRef<WebSocketClient | null>(null)
  const [connected, setConnected] = useState(false)

  const handleEvent = useCallback(
    (event: WebSocketEvent) => {
      onEvent?.(event)
    },
    [onEvent],
  )

  useEffect(() => {
    const client = new WebSocketClient(getWsUrl())
    clientRef.current = client

    client.onStatusChange(setConnected)
    const unsubscribe = client.onMessage(handleEvent)
    client.connect()

    return () => {
      unsubscribe()
      client.close()
    }
  }, [handleEvent])

  return { connected }
}
