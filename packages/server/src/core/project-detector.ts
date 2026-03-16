import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

const SUPPORTED_VERSIONS = ['6']

export type DetectedModule = {
  name: string
  version: string
  source: string
}

export type ProjectDetectionResult = {
  projectRoot: string
  bmadVersion: string | null
  versionSupported: boolean
  modules: DetectedModule[]
  ideDirectories: string[]
}

function readManifest(bmadDir: string): {
  version: string | null
  modules: DetectedModule[]
  ides: string[]
} {
  const manifestPath = path.join(bmadDir, '_config', 'manifest.yaml')
  if (!fs.existsSync(manifestPath)) {
    return { version: null, modules: [], ides: [] }
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = yaml.load(content) as Record<string, unknown>

    const installation = manifest.installation as Record<string, unknown> | undefined
    const version = installation?.version as string | undefined

    const rawModules = (manifest.modules as Array<Record<string, unknown>>) || []
    const modules: DetectedModule[] = rawModules.map((m) => ({
      name: (m.name as string) || '',
      version: (m.version as string) || '',
      source: (m.source as string) || 'unknown',
    }))

    const ides = (manifest.ides as string[]) || []

    return { version: version ?? null, modules, ides }
  } catch {
    return { version: null, modules: [], ides: [] }
  }
}

function hasModuleWithConfig(bmadDir: string): boolean {
  if (!fs.existsSync(bmadDir)) return false

  const entries = fs.readdirSync(bmadDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
      const configPath = path.join(bmadDir, entry.name, 'config.yaml')
      if (fs.existsSync(configPath)) return true
    }
  }
  return false
}

export function detectProject(startDir: string): ProjectDetectionResult | null {
  let currentDir = path.resolve(startDir)
  const root = path.parse(currentDir).root

  while (currentDir !== root) {
    const bmadDir = path.join(currentDir, '_bmad')

    if (fs.existsSync(bmadDir) && fs.statSync(bmadDir).isDirectory()) {
      if (hasModuleWithConfig(bmadDir)) {
        const { version, modules, ides } = readManifest(bmadDir)

        const majorVersion = version?.split('.')[0] ?? null
        const versionSupported = majorVersion !== null && SUPPORTED_VERSIONS.includes(majorVersion)

        return {
          projectRoot: currentDir,
          bmadVersion: version,
          versionSupported,
          modules,
          ideDirectories: ides,
        }
      }
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break
    currentDir = parentDir
  }

  return null
}
