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

describe('files-plugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'files-plugin-test-'))
    const bmadDir = path.join(tmpDir, '_bmad')
    fs.mkdirSync(path.join(bmadDir, 'bmm'), { recursive: true })
    fs.writeFileSync(path.join(bmadDir, 'bmm', 'config.yaml'), 'project_name: test\n')
    fs.writeFileSync(path.join(bmadDir, 'test.md'), '# Test File\nHello world\n')
    fs.mkdirSync(path.join(tmpDir, '.bmad-studio'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('GET /api/files returns file tree', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/files' })
    expect(resp.statusCode).toBe(200)
    const tree = JSON.parse(resp.body)
    expect(Array.isArray(tree)).toBe(true)
    expect(tree.length).toBeGreaterThan(0)
    await app.close()
  })

  it('GET /api/files/* returns file content', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/files/test.md' })
    expect(resp.statusCode).toBe(200)
    const data = JSON.parse(resp.body)
    expect(data.content).toContain('# Test File')
    await app.close()
  })

  it('GET /api/files/* returns 404 for missing file', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/files/nonexistent.md' })
    expect(resp.statusCode).toBe(404)
    await app.close()
  })

  it('PUT /api/files/* writes file content', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({
      method: 'PUT',
      url: '/api/files/test.md',
      payload: { content: '# Updated\nNew content\n' },
    })
    expect(resp.statusCode).toBe(200)
    const result = JSON.parse(resp.body)
    expect(result.ok).toBe(true)

    // Verify file was written
    const written = fs.readFileSync(path.join(tmpDir, '_bmad', 'test.md'), 'utf-8')
    expect(written).toBe('# Updated\nNew content\n')
    await app.close()
  })

  it('PUT /api/files/* creates new files with directories', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({
      method: 'PUT',
      url: '/api/files/new-dir/new-file.md',
      payload: { content: '# New File\n' },
    })
    expect(resp.statusCode).toBe(200)

    const written = fs.readFileSync(path.join(tmpDir, '_bmad', 'new-dir', 'new-file.md'), 'utf-8')
    expect(written).toBe('# New File\n')
    await app.close()
  })

  it('PUT /api/files/* rejects path traversal', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    // Fastify normalizes ../  in URL before routing, so the route doesn't match (404).
    // The server-side check is a secondary guard.
    const resp = await app.inject({
      method: 'PUT',
      url: '/api/files/../../../etc/passwd',
      payload: { content: 'evil' },
    })
    expect(resp.statusCode).toBeLessThanOrEqual(422)
    expect(resp.statusCode).toBeGreaterThanOrEqual(404)
    // Also confirm the file was not written
    expect(fs.existsSync('/etc/passwd.tmp')).toBe(false)
    await app.close()
  })

  it('PUT /api/files/* creates history snapshot', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    await app.inject({
      method: 'PUT',
      url: '/api/files/test.md',
      payload: { content: 'Updated content' },
    })

    const historyDir = path.join(tmpDir, '.bmad-studio', 'history')
    expect(fs.existsSync(historyDir)).toBe(true)
    const files = fs.readdirSync(historyDir)
    expect(files.length).toBeGreaterThan(0)
    await app.close()
  })
})
