import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import { downloadGithubTarball, parseGithubSource } from './module-installer.js'
import { parseModuleYaml } from '../parsers/module-yaml-parser.js'
import type { RegistryIndex, RegistryModuleEntry } from '@bmad-studio/shared'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function cacheFilePath(studioDir: string, owner: string, repo: string): string {
  return path.join(studioDir, 'cache', `registry-${owner}-${repo}.json`)
}

export function readCachedRegistryIndex(
  studioDir: string,
  owner: string,
  repo: string,
): RegistryIndex | null {
  const file = cacheFilePath(studioDir, owner, repo)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as RegistryIndex
  } catch {
    return null
  }
}

export function isRegistryCacheStale(index: RegistryIndex): boolean {
  const fetched = new Date(index.fetchedAt).getTime()
  return Date.now() - fetched > CACHE_TTL_MS
}

export async function fetchAndCacheRegistryIndex(
  studioDir: string,
  repoString: string,
  branch: string,
): Promise<RegistryIndex> {
  const ghSource = parseGithubSource(`${repoString}@${branch}`)
  const { extractedRoot, tmpDir } = await downloadGithubTarball(ghSource)

  try {
    // Optional index.yaml at the repo root
    let indexMeta: Record<string, unknown> | null = null
    let indexYamlError: string | undefined
    const indexYamlPath = path.join(extractedRoot, 'index.yaml')
    if (fs.existsSync(indexYamlPath)) {
      try {
        indexMeta = yaml.load(fs.readFileSync(indexYamlPath, 'utf-8')) as Record<string, unknown>
      } catch (err) {
        indexYamlError = err instanceof Error ? err.message : String(err)
      }
    }

    const modules: RegistryModuleEntry[] = []
    for (const entry of fs.readdirSync(extractedRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue

      const moduleDir = path.join(extractedRoot, entry.name)
      const hasModuleYaml = fs.existsSync(path.join(moduleDir, 'module.yaml'))
      const hasEntities = ['agents', 'skills', 'workflows', 'tasks'].some((sub) =>
        fs.existsSync(path.join(moduleDir, sub)),
      )
      if (!hasModuleYaml && !hasEntities) continue

      const parsed = parseModuleYaml(moduleDir)
      if (!parsed.ok) continue

      const agentCount = fs.existsSync(path.join(moduleDir, 'agents'))
        ? fs
            .readdirSync(path.join(moduleDir, 'agents'))
            .filter((f) => f.endsWith('.md') || f.endsWith('.yaml')).length
        : 0
      const workflowCount = fs.existsSync(path.join(moduleDir, 'workflows'))
        ? fs
            .readdirSync(path.join(moduleDir, 'workflows'), { withFileTypes: true })
            .filter((e) => e.isDirectory()).length
        : 0
      const taskCount = fs.existsSync(path.join(moduleDir, 'tasks'))
        ? fs
            .readdirSync(path.join(moduleDir, 'tasks'), { withFileTypes: true })
            .filter((e) => e.isDirectory()).length
        : 0

      type IndexEntryMeta = { tags?: string[]; status?: string; category?: string }
      const indexEntry = (
        indexMeta?.modules as Record<string, IndexEntryMeta> | undefined
      )?.[parsed.data.code]

      modules.push({
        code: parsed.data.code,
        name: parsed.data.name ?? parsed.data.code,
        version: parsed.data.version ?? '1.0.0',
        description: parsed.data.description ?? '',
        agentCount,
        workflowCount,
        taskCount,
        tags: indexEntry?.tags,
        status: indexEntry?.status as RegistryModuleEntry['status'],
        category: indexEntry?.category,
        rawModuleYaml: hasModuleYaml ? parsed.data : null,
      })
    }

    modules.sort((a, b) => a.name.localeCompare(b.name))

    const index: RegistryIndex = {
      owner: ghSource.owner,
      repo: ghSource.repo,
      branch: ghSource.branch ?? branch,
      fetchedAt: new Date().toISOString(),
      modules,
      ...(indexYamlError !== undefined ? { indexYamlError } : {}),
    }

    // Write cache
    const cacheFile = cacheFilePath(studioDir, ghSource.owner, ghSource.repo)
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
    fs.writeFileSync(cacheFile, JSON.stringify(index, null, 2), 'utf-8')

    return index
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}
