import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { StudioSettings } from '@bmad-studio/shared'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const resp = await fetch('/api/settings')
      if (!resp.ok) throw new Error('Failed to fetch settings')
      return resp.json() as Promise<StudioSettings>
    },
    staleTime: 30_000,
  })
}

export function useSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Partial<StudioSettings>) => {
      const resp = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!resp.ok) throw new Error('Failed to save settings')
      return resp.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
