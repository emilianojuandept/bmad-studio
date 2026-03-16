import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApp } from '../app.js'

function makeProject(tmpDir: string) {
  return {
    projectRoot: tmpDir,
    bmadVersion: '6.2.0',
    versionSupported: true as const,
    modules: [{ name: 'bmm', version: '6.2.0', source: 'built-in' as const }],
    ideDirectories: [],
  }
}

describe('outputs-plugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outputs-plugin-test-'))
    fs.mkdirSync(path.join(tmpDir, '_bmad', 'bmm'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, '_bmad', 'bmm', 'config.yaml'), 'project_name: test\n')
    const outputDir = path.join(tmpDir, '_bmad-output')
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, 'report.md'), '# Report\nSome output\n')
    fs.mkdirSync(path.join(tmpDir, '.bmad-studio'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('GET /api/outputs returns output list', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/outputs' })
    expect(resp.statusCode).toBe(200)
    const outputs = JSON.parse(resp.body)
    expect(outputs).toHaveLength(1)
    expect(outputs[0].name).toBe('report.md')
    await app.close()
  })

  it('GET /api/outputs/* returns file content', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/outputs/report.md' })
    expect(resp.statusCode).toBe(200)
    const data = JSON.parse(resp.body)
    expect(data.content).toContain('# Report')
    await app.close()
  })

  it('GET /api/outputs/* returns 404 for missing file', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/outputs/missing.md' })
    expect(resp.statusCode).toBe(404)
    await app.close()
  })

  it('PUT /api/outputs/* writes file', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({
      method: 'PUT',
      url: '/api/outputs/report.md',
      payload: { content: '# Updated Report\n' },
    })
    expect(resp.statusCode).toBe(200)
    expect(JSON.parse(resp.body).ok).toBe(true)

    const written = fs.readFileSync(path.join(tmpDir, '_bmad-output', 'report.md'), 'utf-8')
    expect(written).toBe('# Updated Report\n')
    await app.close()
  })

  it('PUT /api/outputs/* rejects path traversal', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    // Fastify normalizes ../ in URL before routing, so the route doesn't match (404).
    // The server-side check is a secondary guard.
    const resp = await app.inject({
      method: 'PUT',
      url: '/api/outputs/../../../etc/passwd',
      payload: { content: 'evil' },
    })
    expect(resp.statusCode).toBeLessThanOrEqual(422)
    expect(resp.statusCode).toBeGreaterThanOrEqual(404)
    await app.close()
  })
})
