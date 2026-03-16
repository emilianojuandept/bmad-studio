export type TeamMember = {
  agentId: string
  displayName: string
  title: string
  icon: string
  role: string
  communicationStyle: string
  identity: string
  principles: string
  module: string
}

export type Team = {
  id: string
  name: string
  icon: string
  description: string
  agentIds: string[]
  members: TeamMember[]
  partyFile: string
  filePath: string
  module?: string
}

export type TeamListItem = {
  id: string
  name: string
  icon: string
  description: string
  memberCount: number
  agentIds: string[]
  module?: string
}
