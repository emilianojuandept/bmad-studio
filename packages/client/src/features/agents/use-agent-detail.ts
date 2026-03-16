import { useQuery } from '@tanstack/react-query'

import type { AgentDetail } from '@bmad-studio/shared'

async function fetchAgent(id: string): Promise<AgentDetail> {
  const response = await fetch(`/api/agents/${id}`)
  if (!response.ok) throw new Error(`Failed to fetch agent ${id}`)
  return response.json() as Promise<AgentDetail>
}

export function useAgentDetail(id: string) {
  return useQuery({
    queryKey: ['agents', { id }],
    queryFn: () => fetchAgent(id),
    enabled: !!id,
  })
}
