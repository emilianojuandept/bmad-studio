/**
 * useDrift — React hook backing the DriftBadge / DriftListView UI.
 *
 * Fetches `GET /api/drift` on mount and listens for WebSocket
 * `drift:detected` and `drift:cleared` events to refresh the count
 * without polling. Also exposes `convert()` and `resetToBaseline()`
 * for the conversion flow (Story 36.5).
 */

import { useCallback, useEffect, useState } from 'react'

import type { DriftedFile } from '@bmad-studio/shared'

import { useV65WsEvent } from './use-ws-events.js'

type DriftState = {
  count: number
  files: DriftedFile[]
  loading: boolean
  refetch: () => Promise<void>
  convert: (filePath: string) => Promise<void>
  resetToBaseline: (filePath: string) => Promise<void>
  conversionToken: string | null
  clearConversionToken: () => void
}

export function useDrift(): DriftState {
  const [count, setCount] = useState(0)
  const [files, setFiles] = useState<DriftedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [conversionToken, setConversionToken] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/drift')
      if (!res.ok) return
      const json = (await res.json()) as { count: number; files: DriftedFile[] }
      setCount(json.count)
      setFiles(json.files)
    } catch {
      // Silent — drift is a non-critical badge
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    void refetch()
  }, [refetch])

  // Refresh on WS events
  useV65WsEvent('drift:detected', () => {
    void refetch()
  })
  useV65WsEvent('drift:cleared', () => {
    void refetch()
  })

  const convert = useCallback(async (filePath: string) => {
    const res = await fetch('/api/drift/conversions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    })
    if (!res.ok) return
    const { token } = (await res.json()) as { token: string }
    setConversionToken(token)
  }, [])

  const resetToBaseline = useCallback(
    async (filePath: string) => {
      await fetch('/api/drift/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      })
      await refetch()
    },
    [refetch],
  )

  const clearConversionToken = useCallback(() => setConversionToken(null), [])

  return {
    count,
    files,
    loading,
    refetch,
    convert,
    resetToBaseline,
    conversionToken,
    clearConversionToken,
  }
}
