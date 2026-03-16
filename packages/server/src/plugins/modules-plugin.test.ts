import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'

import { createApp } from '../app.js'

function makeManifest(modules: Array<{ name: string; source: string }>) {
  return {
    installation: {
      version: '6.2.0',
      installDate: '2026-01-01T00:00:00.000Z',
      lastUpdated: '2026-01-01T00:00:00.000Z',
    },
    modules: modules.map((m) => ({
      name: m.name,
      version: '1.0.0',
      installDate: '2026-01-01T00:00:00.000Z',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      source: m.source,
      npmPackage: null,
      repoUrl: null,
    })),
  }
}

describe('modules-plugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'modules-plugin-test-'))
    const configDir = path.join(tmpDir, '_bmad', '_config')
    const moduleDir = path.join(tmpDir, '_bmad', 'test-mod')
    fs.mkdirSync(configDir, { recursive: true })
    fs.mkdirSync(path.join(moduleDir, 'agents'), { recursive: true })
    fs.mkdirSync(path.join(moduleDir, 'skills'), { recursive: true })
    fs.mkdirSync(path.join(moduleDir, 'workflows'), { recursive: true })
    fs.writeFileSync(path.join(moduleDir, 'config.yaml'), 'project_name: test-mod\n')
    fs.writeFileSync(
      path.join(configDir, 'manifest.yaml'),
      yaml.dump(makeManifest([{ name: 'test-mod', source: 'custom' }])),
    )
    fs.mkdirSync(path.join(tmpDir, '.bmad-studio'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function createTestApp() {
    return createApp({
      logger: false,
      serveStatic: false,
      project: {
        projectRoot: tmpDir,
        bmadVersion: '6.2.0',
        versionSupported: true,
        modules: [{ name: 'test-mod', version: '1.0.0', source: 'custom' }],
        ideDirectories: [],
      },
    })
  }

  // --- Story 12.1: Add entities ---

  it('POST /api/modules/:name/entities creates a skill file', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'skill', name: 'my-skill' },
    })
    expect(resp.statusCode).toBe(201)
    const body = JSON.parse(resp.body)
    expect(body.ok).toBe(true)
    expect(body.type).toBe('skill')

    const skillPath = path.join(tmpDir, '_bmad', 'test-mod', 'skills', 'my-skill', 'SKILL.md')
    expect(fs.existsSync(skillPath)).toBe(true)
    const content = fs.readFileSync(skillPath, 'utf-8')
    expect(content).toContain('name: my-skill')
    await app.close()
  })

  it('POST /api/modules/:name/entities creates a workflow directory', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'workflow', name: 'my-workflow' },
    })
    expect(resp.statusCode).toBe(201)

    const wfPath = path.join(tmpDir, '_bmad', 'test-mod', 'workflows', 'my-workflow', 'workflow.md')
    expect(fs.existsSync(wfPath)).toBe(true)
    const content = fs.readFileSync(wfPath, 'utf-8')
    expect(content).toContain('name: my-workflow')
    await app.close()
  })

  it('POST /api/modules/:name/entities creates an agent file', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'agent', name: 'my-agent' },
    })
    expect(resp.statusCode).toBe(201)

    const agentPath = path.join(tmpDir, '_bmad', 'test-mod', 'agents', 'my-agent.md')
    expect(fs.existsSync(agentPath)).toBe(true)
    const content = fs.readFileSync(agentPath, 'utf-8')
    expect(content).toContain('name: my-agent')
    await app.close()
  })

  it('POST /api/modules/:name/entities rejects invalid type', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'invalid', name: 'test' },
    })
    expect(resp.statusCode).toBe(422)
    await app.close()
  })

  it('POST /api/modules/:name/entities rejects missing name', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'skill' },
    })
    expect(resp.statusCode).toBe(422)
    await app.close()
  })

  it('POST /api/modules/:name/entities returns 404 for nonexistent module', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/no-such-mod/entities',
      payload: { type: 'skill', name: 'test' },
    })
    expect(resp.statusCode).toBe(404)
    await app.close()
  })

  it('POST /api/modules/:name/entities rejects duplicate skill', async () => {
    const app = await createTestApp()
    // Create first
    await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'skill', name: 'dup-skill' },
    })
    // Create duplicate
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'skill', name: 'dup-skill' },
    })
    expect(resp.statusCode).toBe(409)
    await app.close()
  })

  // --- Story 12.2: Upload entities with content ---

  it('POST /api/modules/:name/entities accepts custom content', async () => {
    const app = await createTestApp()
    const customContent = '---\nname: uploaded-skill\ncategory: testing\n---\n\n# Uploaded Skill\n\nCustom content here.\n'
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'skill', name: 'uploaded-skill', content: customContent },
    })
    expect(resp.statusCode).toBe(201)

    const skillPath = path.join(tmpDir, '_bmad', 'test-mod', 'skills', 'uploaded-skill', 'SKILL.md')
    const content = fs.readFileSync(skillPath, 'utf-8')
    expect(content).toBe(customContent)
    await app.close()
  })

  it('POST /api/modules/:name/entities uploads agent with content', async () => {
    const app = await createTestApp()
    const customContent = '---\nname: uploaded-agent\ntitle: Test Agent\n---\n\n# Uploaded Agent\n'
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'agent', name: 'uploaded-agent', content: customContent },
    })
    expect(resp.statusCode).toBe(201)

    const agentPath = path.join(tmpDir, '_bmad', 'test-mod', 'agents', 'uploaded-agent.md')
    const content = fs.readFileSync(agentPath, 'utf-8')
    expect(content).toBe(customContent)
    await app.close()
  })

  // --- Story 12.3: Export module manifest ---

  it('POST /api/modules/:name/export returns manifest', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/export',
    })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.module).toBe('test-mod')
    expect(body.version).toBe('1.0.0')
    expect(body.exportDate).toBeTruthy()
    expect(body.entities).toBeTruthy()
    expect(body.entities.agents).toHaveProperty('count')
    expect(body.entities.agents).toHaveProperty('names')
    expect(body.entities.skills).toHaveProperty('count')
    expect(body.entities.workflows).toHaveProperty('count')
    expect(typeof body.totalEntities).toBe('number')
    expect(body.note).toContain('future enhancement')
    await app.close()
  })

  it('POST /api/modules/:name/export returns 404 for nonexistent module', async () => {
    const app = await createTestApp()
    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/no-such-mod/export',
    })
    expect(resp.statusCode).toBe(404)
    await app.close()
  })

  it('POST /api/modules/:name/export includes entities after adding them', async () => {
    const app = await createTestApp()

    // Add a skill
    await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'skill', name: 'export-test-skill' },
    })

    // Add a workflow
    await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/entities',
      payload: { type: 'workflow', name: 'export-test-wf' },
    })

    const resp = await app.inject({
      method: 'POST',
      url: '/api/modules/test-mod/export',
    })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.entities.skills.count).toBeGreaterThanOrEqual(1)
    expect(body.entities.skills.names).toContain('export-test-skill')
    expect(body.totalEntities).toBeGreaterThanOrEqual(2)
    await app.close()
  })
})
