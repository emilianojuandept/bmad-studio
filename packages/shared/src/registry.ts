import type { ModuleYaml } from './modules.js'

export type RegistryStatus = 'stable' | 'beta' | 'experimental'

export type RegistryModuleEntry = {
  code: string
  name: string
  version: string
  description: string
  agentCount: number
  workflowCount: number
  taskCount: number
  tags?: string[]
  status?: RegistryStatus
  category?: string
  rawModuleYaml: ModuleYaml | null
}

export type RegistryIndex = {
  owner: string
  repo: string
  branch: string
  fetchedAt: string
  modules: RegistryModuleEntry[]
  indexYamlError?: string
}
