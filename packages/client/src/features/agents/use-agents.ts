import { useQuery } from '@tanstack/react-query'

import type { AgentListItem } from '@bmad-studio/shared'

async function fetchAgents(): Promise<AgentListItem[]> {
  const response = await fetch('/api/agents')
  if (!response.ok) throw new Error('Failed to fetch agents')
  return response.json() as Promise<AgentListItem[]>
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 30_000,
  })
}
