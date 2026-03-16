export type Output = {
  path: string
  name: string
  type: string
  size: number
  modifiedAt: string
}

export type Template = {
  id: string
  name: string
  description: string
  source: 'shared' | 'project'
  forkedFrom?: string
  version?: string
  content: string
  filePath: string
}

export type TemplateListItem = {
  id: string
  name: string
  description: string
  source: 'shared' | 'project'
}
