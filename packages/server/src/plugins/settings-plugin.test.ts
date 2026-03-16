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

describe('settings-plugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-plugin-test-'))
    fs.mkdirSync(path.join(tmpDir, '_bmad', 'bmm'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, '_bmad', 'bmm', 'config.yaml'), 'project_name: test\n')
    fs.mkdirSync(path.join(tmpDir, '.bmad-studio'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('GET /api/settings returns defaults when no settings file exists', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/settings' })
    expect(resp.statusCode).toBe(200)
    const settings = JSON.parse(resp.body)
    expect(settings.port).toBe(4040)
    expect(settings.theme).toBe('dark')
    await app.close()
  })

  it('PUT /api/settings saves settings', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: { port: 5050, theme: 'light' },
    })
    expect(resp.statusCode).toBe(200)
    expect(JSON.parse(resp.body).ok).toBe(true)

    // Verify the saved file
    const settingsPath = path.join(tmpDir, '.bmad-studio', 'settings.json')
    expect(fs.existsSync(settingsPath)).toBe(true)
    const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    expect(saved.port).toBe(5050)
    expect(saved.theme).toBe('light')
    await app.close()
  })

  it('GET /api/settings returns saved settings', async () => {
    const settingsPath = path.join(tmpDir, '.bmad-studio', 'settings.json')
    fs.writeFileSync(settingsPath, JSON.stringify({ port: 8080, theme: 'light' }))

    const app = await createApp({ logger: false, serveStatic: false, project: makeProject(tmpDir) })
    const resp = await app.inject({ method: 'GET', url: '/api/settings' })
    expect(resp.statusCode).toBe(200)
    const settings = JSON.parse(resp.body)
    expect(settings.port).toBe(8080)
    expect(settings.theme).toBe('light')
    await app.close()
  })

  it('GET /api/settings returns defaults without file store', async () => {
    const app = await createApp({ logger: false, serveStatic: false, project: null })
    const resp = await app.inject({ method: 'GET', url: '/api/settings' })
    expect(resp.statusCode).toBe(200)
    const settings = JSON.parse(resp.body)
    expect(settings.port).toBe(4040)
    await app.close()
  })
})
