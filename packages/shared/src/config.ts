export type ProjectType = 'web-app' | 'mobile-app' | 'api' | 'game' | 'library' | 'other'

export type ProjectLevel = 0 | 1 | 2 | 3 | 4

export type ModuleConfig = {
  [key: string]: unknown
}

export type ProjectConfig = {
  projectName: string
  projectType: ProjectType
  projectLevel: ProjectLevel
  modules: Record<string, ModuleConfig>
}

export type StudioSettings = {
  port: number
  theme: 'dark' | 'light'
  customSettings?: Record<string, unknown>
}

export type ProjectStatus = {
  detected: boolean
  bmadVersion?: string
  projectRoot?: string
  modules: string[]
  ideDirectories: string[]
}

export type AppInfo = {
  name: string
  version: string
}
