import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApp } from '../app.js'

describe('agents-plugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-plugin-test-'))
    const agentDir = path.join(tmpDir, '_bmad', 'bmm', 'agents')
    fs.mkdirSync(agentDir, { recursive: true })
    fs.mkdirSync(path.join(tmpDir, '_bmad', 'bmm'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, '_bmad', 'bmm', 'config.yaml'), 'project_name: test\n')
    fs.writeFileSync(
      path.join(agentDir, 'analyst.md'),
      `---
name: "analyst"
description: "Business Analyst"
---

<agent id="analyst" name="Mary" title="BA" icon="📊" capabilities="analysis">
<menu>
  <item cmd="MR" exec="skill:market-research">[MR] Market Research</item>
</menu>
</agent>
`,
    )
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('GET /api/agents returns agent list items', async () => {
    const app = await createApp({
      logger: false,
      serveStatic: false,
      project: {
        projectRoot: tmpDir,
        bmadVersion: '6.2.0',
        versionSupported: true,
        modules: [{ name: 'bmm', version: '6.2.0', source: 'built-in' }],
        ideDirectories: [],
      },
    })

    const response = await app.inject({ method: 'GET', url: '/api/agents' })
    expect(response.statusCode).toBe(200)
    const agents = JSON.parse(response.body)
    expect(agents).toHaveLength(1)
    expect(agents[0].id).toBe('analyst')
    expect(agents[0].name).toBe('Mary')
    expect(agents[0]).toHaveProperty('skillCount')
    expect(agents[0]).toHaveProperty('hasOverrides')

    await app.close()
  })

  it('GET /api/agents/:id returns agent detail', async () => {
    const app = await createApp({
      logger: false,
      serveStatic: false,
      project: {
        projectRoot: tmpDir,
        bmadVersion: '6.2.0',
        versionSupported: true,
        modules: [{ name: 'bmm', version: '6.2.0', source: 'built-in' }],
        ideDirectories: [],
      },
    })

    const response = await app.inject({ method: 'GET', url: '/api/agents/analyst' })
    expect(response.statusCode).toBe(200)
    const agent = JSON.parse(response.body)
    expect(agent.id).toBe('analyst')
    expect(agent.menu).toHaveLength(1)

    await app.close()
  })

  it('GET /api/agents/:id returns 404 for missing agent', async () => {
    const app = await createApp({
      logger: false,
      serveStatic: false,
      project: {
        projectRoot: tmpDir,
        bmadVersion: '6.2.0',
        versionSupported: true,
        modules: [{ name: 'bmm', version: '6.2.0', source: 'built-in' }],
        ideDirectories: [],
      },
    })

    const response = await app.inject({ method: 'GET', url: '/api/agents/nonexistent' })
    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('GET /api/agents returns empty when no file store', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: null })
    const response = await app.inject({ method: 'GET', url: '/api/agents' })
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual([])

    await app.close()
  })
})
