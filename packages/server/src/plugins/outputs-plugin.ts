import fs from 'node:fs'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import type { Output } from '@bmad-studio/shared'

import { NotFoundError, ValidationError } from '../core/errors.js'
import { writeFile } from '../core/write-service.js'

function scanOutputs(outputDir: string): Output[] {
  if (!fs.existsSync(outputDir)) return []

  const outputs: Output[] = []
  const entries = fs.readdirSync(outputDir, { withFileTypes: true, recursive: true })

  for (const entry of entries) {
    if (entry.isFile() && !entry.name.startsWith('.')) {
      const fullPath = path.join(entry.parentPath ?? outputDir, entry.name)
      const stats = fs.statSync(fullPath)
      const relPath = path.relative(outputDir, fullPath)
      outputs.push({
        path: relPath,
        name: entry.name,
        type: path.extname(entry.name).slice(1),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      })
    }
  }

  return outputs
}

export async function outputsPlugin(app: FastifyInstance) {
  app.get('/api/outputs', async () => {
    if (!('fileStore' in app)) return []
    const projectRoot = app.fileStore.projectRoot
    const outputDir = path.join(projectRoot, '_bmad-output')
    return scanOutputs(outputDir)
  })

  app.get<{ Params: { '*': string } }>('/api/outputs/*', async (request) => {
    if (!('fileStore' in app)) throw new NotFoundError('File store not available')
    const projectRoot = app.fileStore.projectRoot
    const filePath = path.join(projectRoot, '_bmad-output', request.params['*'])

    // Path traversal protection
    const outputRoot = path.join(projectRoot, '_bmad-output')
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(path.resolve(outputRoot))) {
      throw new ValidationError('Path traversal not allowed')
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`Output file not found: ${request.params['*']}`)
    }

    return { content: fs.readFileSync(filePath, 'utf-8'), path: request.params['*'] }
  })

  // Write output file
  app.put<{ Params: { '*': string }; Body: { content: string } }>(
    '/api/outputs/*',
    async (request) => {
      if (!('fileStore' in app)) throw new NotFoundError('File store not available')

      const projectRoot = app.fileStore.projectRoot
      const filePath = path.join(projectRoot, '_bmad-output', request.params['*'])

      // Path traversal protection
      const outputRoot = path.join(projectRoot, '_bmad-output')
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(path.resolve(outputRoot))) {
        throw new ValidationError('Path traversal not allowed')
      }

      const { content } = request.body as { content: string }
      if (typeof content !== 'string') {
        throw new ValidationError('Content must be a string')
      }

      app.fileStore.markPendingWrite(resolved)
      const result = writeFile(resolved, content, app.fileStore.studioDir)
      app.fileStore.clearPendingWrite(resolved)

      if (!result.ok) {
        throw new ValidationError(result.error)
      }

      return { ok: true, filePath: result.filePath }
    },
  )
}
