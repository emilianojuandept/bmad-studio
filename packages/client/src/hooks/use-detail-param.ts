import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Syncs a URL search parameter with component state for deep-linkable slide-overs.
 * Setting a value pushes a new history entry so browser back closes the panel.
 */
export function useDetailParam(key: string = 'detail'): [string | null, (id: string | null) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = searchParams.get(key)

  const setValue = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          if (id) {
            prev.set(key, id)
          } else {
            prev.delete(key)
          }
          return prev
        },
        { replace: false },
      )
    },
    [key, setSearchParams],
  )

  return [value, setValue]
}
