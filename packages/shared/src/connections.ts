export type ConnectionStatus = 'connected' | 'configured' | 'not-configured'

export type DataSource = {
  id: string
  name: string
  type: string
  status: ConnectionStatus
  config: Record<string, unknown>
  lastSync: string | null
  toolAvailable?: boolean
}

export type DataSourceListItem = {
  id: string
  name: string
  type: string
  status: ConnectionStatus
  lastSync: string | null
}

export type DataSourceTemplate = {
  id: string
  name: string
  type: string
  description: string
  requiredTool: string
  configSchema: Record<string, unknown>
}
