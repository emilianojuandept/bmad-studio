import { useQuery } from '@tanstack/react-query'

import type { WorkflowListItem, Workflow } from '@bmad-studio/shared'

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await fetch('/api/workflows')
      if (!response.ok) throw new Error('Failed to fetch workflows')
      return response.json() as Promise<WorkflowListItem[]>
    },
    staleTime: 30_000,
  })
}

export function useWorkflowDetail(id: string) {
  return useQuery({
    queryKey: ['workflows', { id }],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${id}`)
      if (!response.ok) throw new Error(`Failed to fetch workflow ${id}`)
      return response.json() as Promise<Workflow>
    },
    enabled: !!id,
  })
}
