import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApp } from './app.js'

describe('app', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns health check response', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: null })

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('ok')
    expect(body.name).toBe('bmad-studio')
    expect(body.version).toBe('0.1.0')
  })

  it('returns project status when no project detected', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: null })

    const response = await app.inject({
      method: 'GET',
      url: '/api/project',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.detected).toBe(false)
  })

  it('returns project status when project detected', async () => {
    // Create a real temp directory structure so file store can initialize
    const bmadDir = path.join(tmpDir, '_bmad', 'core')
    fs.mkdirSync(bmadDir, { recursive: true })
    fs.writeFileSync(path.join(bmadDir, 'config.yaml'), 'user_name: Test\n')

    const app = await createApp({
      logger: false,
      serveStatic: false,
      project: {
        projectRoot: tmpDir,
        bmadVersion: '6.2.0',
        versionSupported: true,
        modules: [{ name: 'core', version: '6.2.0', source: 'built-in' }],
        ideDirectories: ['claude-code'],
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/project',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.detected).toBe(true)
    expect(body.bmadVersion).toBe('6.2.0')
    expect(body.modules).toEqual(['core'])

    await app.close()
  })

  it('global error handler returns JSON for AppError', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: null })

    const response = await app.inject({
      method: 'GET',
      url: '/api/nonexistent',
    })

    expect(response.statusCode).toBe(404)
  })
})
