export type WorkspaceSection = {
  key: string
  label: string
  value: string
  configured: boolean
}

export type Workspace = {
  sections: WorkspaceSection[]
  rawContent: string
  filePath: string
}
