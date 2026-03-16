import fs from 'node:fs'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'

import { writeFile } from '../core/write-service.js'

export async function settingsPlugin(app: FastifyInstance) {
  app.get('/api/settings', async () => {
    if (!('fileStore' in app)) {
      return { port: 4040, theme: 'dark' }
    }

    const settingsPath = path.join(app.fileStore.studioDir, 'settings.json')
    if (fs.existsSync(settingsPath)) {
      try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      } catch {
        return { port: 4040, theme: 'dark' }
      }
    }

    return { port: 4040, theme: 'dark' }
  })

  app.put('/api/settings', async (request) => {
    if (!('fileStore' in app)) {
      return { ok: true }
    }

    const studioDir = app.fileStore.studioDir
    if (!fs.existsSync(studioDir)) {
      fs.mkdirSync(studioDir, { recursive: true })
    }

    const settingsPath = path.join(studioDir, 'settings.json')
    const content = JSON.stringify(request.body, null, 2)
    const result = writeFile(settingsPath, content, studioDir)

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    return { ok: true }
  })
}
