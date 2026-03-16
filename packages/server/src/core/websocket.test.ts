import { describe, it, expect } from 'vitest'

import type { WebSocketEvent } from '@bmad-studio/shared'

import { WebSocketManager } from './websocket.js'

function createMockSocket(readyState = 1) {
  const sent: string[] = []
  const handlers: Record<string, Array<() => void>> = {}
  return {
    readyState,
    send: (data: string) => sent.push(data),
    on: (event: string, handler: () => void) => {
      handlers[event] = handlers[event] || []
      handlers[event].push(handler)
    },
    triggerClose: () => handlers['close']?.forEach((h) => h()),
    sent,
  }
}

describe('WebSocketManager', () => {
  it('tracks connected clients', () => {
    const manager = new WebSocketManager()
    const socket = createMockSocket()
    manager.addClient(socket as never)

    expect(manager.clientCount).toBe(1)
  })

  it('removes client on close', () => {
    const manager = new WebSocketManager()
    const socket = createMockSocket()
    manager.addClient(socket as never)
    socket.triggerClose()

    expect(manager.clientCount).toBe(0)
  })

  it('broadcasts event to all connected clients', () => {
    const manager = new WebSocketManager()
    const socket1 = createMockSocket()
    const socket2 = createMockSocket()
    manager.addClient(socket1 as never)
    manager.addClient(socket2 as never)

    const event: WebSocketEvent = { type: 'file:changed', path: '/test.yaml', category: 'agent' }
    manager.broadcast(event)

    expect(socket1.sent).toHaveLength(1)
    expect(JSON.parse(socket1.sent[0])).toEqual(event)
    expect(socket2.sent).toHaveLength(1)
  })

  it('skips clients that are not in OPEN state', () => {
    const manager = new WebSocketManager()
    const openSocket = createMockSocket(1)
    const closedSocket = createMockSocket(3) // CLOSED
    manager.addClient(openSocket as never)
    manager.addClient(closedSocket as never)

    manager.broadcast({ type: 'project:reloaded' })

    expect(openSocket.sent).toHaveLength(1)
    expect(closedSocket.sent).toHaveLength(0)
  })

  it('broadcasts compile:needed with agent names', () => {
    const manager = new WebSocketManager()
    const socket = createMockSocket()
    manager.addClient(socket as never)

    const event: WebSocketEvent = { type: 'compile:needed', agents: ['pm', 'analyst'] }
    manager.broadcast(event)

    const received = JSON.parse(socket.sent[0])
    expect(received.type).toBe('compile:needed')
    expect(received.agents).toEqual(['pm', 'analyst'])
  })
})
