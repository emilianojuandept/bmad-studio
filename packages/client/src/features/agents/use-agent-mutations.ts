import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useAgentOverrideMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const resp = await fetch(`/api/agents/${id}/override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error((err as { error: { message: string } }).error.message)
      }
      return resp.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', { id: variables.id }] })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export function useAgentSkillsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, skills }: { id: string; skills: string[] }) => {
      const resp = await fetch(`/api/agents/${id}/skills`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error((err as { error: { message: string } }).error.message)
      }
      return resp.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', { id: variables.id }] })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}
