export type FileCategory = 'agent' | 'skill' | 'workflow' | 'config' | 'connection' | 'other'

export type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  size?: number
  modifiedAt?: string
  category?: FileCategory
}
