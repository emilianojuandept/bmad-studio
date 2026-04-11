import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'

import { createApp } from '../app.js'
import {
  fetchAndCacheRegistryIndex,
  isRegistryCacheStale,
  readCachedRegistryIndex,
} from './module-registry.js'
import type { RegistryIndex } from '@bmad-studio/shared'

// ─── Fixture tarball helpers ────────────────────────────────────────────────

/**
 * Build a fixture tarball that mimics GitHub's tarball format. GitHub tarballs
 * always extract to a single wrapper directory like {owner}-{repo}-{shortsha}/.
 */
function buildFixtureTarball(
  wrapperName: string,
  contentBuilder: (wrapperDir: string) => void,
): Buffer {
  const stagingRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-registry-fixture-')),
  )
  try {
    const wrapperDir = path.join(stagingRoot, wrapperName)
    fs.mkdirSync(wrapperDir, { recursive: true })
    contentBuilder(wrapperDir)

    const tarballPath = path.join(stagingRoot, 'fixture.tar.gz')
    execSync(`tar -czf "${tarballPath}" -C "${stagingRoot}" "${wrapperName}"`, { stdio: 'pipe' })
    return fs.readFileSync(tarballPath)
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true })
  }
}

function mockTarballResponse(bytes: Buffer): Response {
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/gzip' },
  })
}

function mockUnauthorizedResponse(): Response {
  return new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
}

// A registry with two modules and an index.yaml
const REGISTRY_WITH_INDEX = buildFixtureTarball('owner-modules-abc1234', (wrapper) => {
  // Module alpha
  fs.mkdirSync(path.join(wrapper, 'alpha', 'agents'), { recursive: true })
  fs.mkdirSync(path.join(wrapper, 'alpha', 'workflows'), { recursive: true })
  fs.writeFileSync(path.join(wrapper, 'alpha', 'agents', 'agent.md'), '# Agent\n')
  fs.writeFileSync(
    path.join(wrapper, 'alpha', 'module.yaml'),
    yaml.dump({
      code: 'alpha',
      name: 'Alpha Module',
      version: '2.0.0',
      description: 'An alpha module',
    }),
  )

  // Module beta (tasks only)
  fs.mkdirSync(path.join(wrapper, 'beta', 'tasks', 'my-task'), { recursive: true })
  fs.writeFileSync(path.join(wrapper, 'beta', 'tasks', 'my-task', 'SKILL.md'), '# Task\n')
  fs.writeFileSync(
    path.join(wrapper, 'beta', 'module.yaml'),
    yaml.dump({ code: 'beta', name: 'Beta Module', version: '1.5.0', description: 'A beta module' }),
  )

  // index.yaml with metadata for alpha
  fs.writeFileSync(
    path.join(wrapper, 'index.yaml'),
    yaml.dump({
      modules: {
        alpha: { tags: ['analytics', 'reporting'], status: 'stable', category: 'data' },
      },
    }),
  )

  // Hidden dir and underscore dir — must be excluded
  fs.mkdirSync(path.join(wrapper, '.hidden'), { recursive: true })
  fs.mkdirSync(path.join(wrapper, '_internal'), { recursive: true })
})

// A registry with no index.yaml
const REGISTRY_NO_INDEX = buildFixtureTarball('owner-modules-abc1234', (wrapper) => {
  fs.mkdirSync(path.join(wrapper, 'gamma', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(wrapper, 'gamma', 'agents', 'g.md'), '# G\n')
  fs.writeFileSync(
    path.join(wrapper, 'gamma', 'module.yaml'),
    yaml.dump({ code: 'gamma', name: 'Gamma Module', version: '0.9.0', description: '' }),
  )
})

// A registry with malformed index.yaml
const REGISTRY_BAD_INDEX = buildFixtureTarball('owner-modules-abc1234', (wrapper) => {
  fs.mkdirSync(path.join(wrapper, 'delta', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(wrapper, 'delta', 'agents', 'd.md'), '# D\n')
  fs.writeFileSync(
    path.join(wrapper, 'delta', 'module.yaml'),
    yaml.dump({ code: 'delta', name: 'Delta Module', version: '1.0.0', description: '' }),
  )
  // Malformed YAML
  fs.writeFileSync(path.join(wrapper, 'index.yaml'), '{ not: valid: yaml: :::')
})

// ─── Unit tests for module-registry.ts ──────────────────────────────────────

describe('module-registry — unit', () => {
  let tmpDir: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'module-registry-test-')))
    fs.mkdirSync(path.join(tmpDir, '.bmad-studio'), { recursive: true })
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  const studioDir = () => path.join(tmpDir, '.bmad-studio')

  it('AC-16.2.2 — fetches index with two modules and applies index.yaml metadata', async () => {
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_WITH_INDEX))

    const index = await fetchAndCacheRegistryIndex(studioDir(), 'owner/modules', 'main')

    expect(index.owner).toBe('owner')
    expect(index.repo).toBe('modules')
    expect(index.branch).toBe('main')
    expect(index.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}/)

    // AC-16.2.3, AC-16.2.4 — sorted alphabetically, metadata present
    expect(index.modules).toHaveLength(2)
    expect(index.modules[0].code).toBe('alpha')
    expect(index.modules[1].code).toBe('beta')

    const alpha = index.modules[0]
    expect(alpha.name).toBe('Alpha Module')
    expect(alpha.version).toBe('2.0.0')
    expect(alpha.agentCount).toBe(1)
    expect(alpha.workflowCount).toBe(0)
    expect(alpha.tags).toEqual(['analytics', 'reporting'])
    expect(alpha.status).toBe('stable')
    expect(alpha.category).toBe('data')
    expect(alpha.rawModuleYaml).not.toBeNull()

    const beta = index.modules[1]
    expect(beta.taskCount).toBe(1)
    expect(beta.tags).toBeUndefined()
  })

  it('AC-16.2.5 — excludes dot and underscore directories', async () => {
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_WITH_INDEX))
    const index = await fetchAndCacheRegistryIndex(studioDir(), 'owner/modules', 'main')
    const codes = index.modules.map((m) => m.code)
    expect(codes).not.toContain('.hidden')
    expect(codes).not.toContain('_internal')
  })

  it('AC-16.2.6 — writes cache to .bmad-studio/cache/registry-{owner}-{repo}.json', async () => {
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_WITH_INDEX))
    await fetchAndCacheRegistryIndex(studioDir(), 'owner/modules', 'main')

    const cachePath = path.join(studioDir(), 'cache', 'registry-owner-modules.json')
    expect(fs.existsSync(cachePath)).toBe(true)
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as RegistryIndex
    expect(cached.modules).toHaveLength(2)
  })

  it('AC-16.2.7 — readCachedRegistryIndex returns null when no cache exists', () => {
    const result = readCachedRegistryIndex(studioDir(), 'owner', 'modules')
    expect(result).toBeNull()
  })

  it('AC-16.2.7 — readCachedRegistryIndex returns cached index', async () => {
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_WITH_INDEX))
    await fetchAndCacheRegistryIndex(studioDir(), 'owner/modules', 'main')

    const cached = readCachedRegistryIndex(studioDir(), 'owner', 'modules')
    expect(cached).not.toBeNull()
    expect(cached!.modules).toHaveLength(2)
  })

  it('isRegistryCacheStale — false for fresh cache', () => {
    const index: RegistryIndex = {
      owner: 'o',
      repo: 'r',
      branch: 'main',
      fetchedAt: new Date().toISOString(),
      modules: [],
    }
    expect(isRegistryCacheStale(index)).toBe(false)
  })

  it('isRegistryCacheStale — true after 1 hour + 1ms', () => {
    const index: RegistryIndex = {
      owner: 'o',
      repo: 'r',
      branch: 'main',
      fetchedAt: new Date(Date.now() - 60 * 60 * 1000 - 1).toISOString(),
      modules: [],
    }
    expect(isRegistryCacheStale(index)).toBe(true)
  })

  it('without index.yaml — modules parsed, indexYamlError undefined', async () => {
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_NO_INDEX))
    const index = await fetchAndCacheRegistryIndex(studioDir(), 'owner/modules', 'main')

    expect(index.modules).toHaveLength(1)
    expect(index.modules[0].code).toBe('gamma')
    expect(index.indexYamlError).toBeUndefined()
  })

  it('AC-16.2.9 — malformed index.yaml sets indexYamlError, modules still returned', async () => {
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_BAD_INDEX))
    const index = await fetchAndCacheRegistryIndex(studioDir(), 'owner/modules', 'main')

    expect(index.modules).toHaveLength(1)
    expect(index.modules[0].code).toBe('delta')
    expect(index.indexYamlError).toBeDefined()
    expect(typeof index.indexYamlError).toBe('string')
  })
})

// ─── API endpoint tests (via modules-plugin) ────────────────────────────────

function makeProject(tmpDir: string) {
  return {
    projectRoot: tmpDir,
    bmadVersion: '6.2.0',
    versionSupported: true as const,
    modules: [] as Array<{ name: string; version: string; source: 'built-in' | 'custom' }>,
    ideDirectories: [],
  }
}

describe('modules-plugin — Story 16.2 registry endpoints', () => {
  let tmpDir: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any

  beforeEach(() => {
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'registry-plugin-test-')))
    const configDir = path.join(tmpDir, '_bmad', '_config')
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(
      path.join(configDir, 'manifest.yaml'),
      yaml.dump({
        installation: {
          version: '6.2.0',
          installDate: '2026-01-01T00:00:00.000Z',
          lastUpdated: '2026-01-01T00:00:00.000Z',
        },
        modules: [],
      }),
    )
    fs.mkdirSync(path.join(tmpDir, '.bmad-studio'), { recursive: true })
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('AC-16.2.1 — GET /api/registry returns configured:false when no settings file', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/registry' })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.ok).toBe(false)
    expect(body.configured).toBe(false)
    await app.close()
  })

  it('AC-16.2.1 — GET /api/registry returns configured:false when settings has no registry block', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.bmad-studio', 'settings.json'),
      JSON.stringify({ port: 4040, theme: 'dark' }),
    )
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/registry' })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.ok).toBe(false)
    expect(body.configured).toBe(false)
    await app.close()
  })

  it('AC-16.2.2 — GET /api/registry fetches and returns index when configured', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.bmad-studio', 'settings.json'),
      JSON.stringify({ registry: { repo: 'owner/modules', branch: 'main' } }),
    )
    fetchSpy.mockImplementationOnce(async () => mockTarballResponse(REGISTRY_WITH_INDEX))

    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/registry' })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.ok).toBe(true)
    expect(body.configured).toBe(true)
    expect(body.index.owner).toBe('owner')
    expect(body.index.modules).toHaveLength(2)
    await app.close()
  })

  it('AC-16.2.7 — second GET /api/registry within TTL uses cache, no second fetch', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.bmad-studio', 'settings.json'),
      JSON.stringify({ registry: { repo: 'owner/modules', branch: 'main' } }),
    )
    fetchSpy.mockImplementation(async () => mockTarballResponse(REGISTRY_WITH_INDEX))

    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })

    await app.inject({ method: 'GET', url: '/api/registry' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await app.inject({ method: 'GET', url: '/api/registry' })
    expect(fetchSpy).toHaveBeenCalledTimes(1) // still 1 — served from cache

    await app.close()
  })

  it('AC-16.2.8 — POST /api/registry/refresh always re-fetches', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.bmad-studio', 'settings.json'),
      JSON.stringify({ registry: { repo: 'owner/modules', branch: 'main' } }),
    )
    fetchSpy.mockImplementation(async () => mockTarballResponse(REGISTRY_WITH_INDEX))

    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })

    // First populate the cache
    await app.inject({ method: 'GET', url: '/api/registry' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Refresh should always re-fetch
    const resp = await app.inject({ method: 'POST', url: '/api/registry/refresh' })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    await app.close()
  })

  it('AC-16.2.10 — unauthorized GitHub repo surfaces error', async () => {
    fs.writeFileSync(
      path.join(tmpDir, '.bmad-studio', 'settings.json'),
      JSON.stringify({ registry: { repo: 'private/repo', branch: 'main' } }),
    )
    fetchSpy.mockImplementationOnce(async () => mockUnauthorizedResponse())

    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/registry' })
    expect(resp.statusCode).toBe(422)
    const body = JSON.parse(resp.body)
    expect(body.error.message).toContain('private/repo')
    await app.close()
  })
})
