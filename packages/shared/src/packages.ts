export type PackageManifest = {
  name: string
  description: string
  version: string
  platform?: string
  agents: string[]
  skills: string[]
  workflows: string[]
  templates: string[]
  connections?: string[]
  contextTemplate?: string
}

export type Package = PackageManifest & {
  id: string
  filePath: string
}

export type PackageConflict = {
  path: string
  type: 'overwrite' | 'merge' | 'skip'
  localContent?: string
  incomingContent?: string
}

export type PackageImportPreview = {
  package: PackageManifest
  conflicts: PackageConflict[]
  newFiles: string[]
}
