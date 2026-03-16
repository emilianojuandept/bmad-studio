import fs from 'node:fs'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import type { FileNode } from '@bmad-studio/shared'

import { NotFoundError, ValidationError } from '../core/errors.js'
import { writeFile } from '../core/write-service.js'

function buildTree(dir: string, maxDepth = 4, depth = 0): FileNode[] {
  if (depth >= maxDepth || !fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries
    .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist')
    .map((entry): FileNode => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: fullPath,
          type: 'directory',
          children: buildTree(fullPath, maxDepth, depth + 1),
        }
      }
      const stats = fs.statSync(fullPath)
      return {
        name: entry.name,
        path: fullPath,
        type: 'file',
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      }
    })
}

export async function filesPlugin(app: FastifyInstance) {
  app.get('/api/files', async () => {
    if (!('fileStore' in app)) return []
    const projectRoot = app.fileStore.projectRoot
    const bmadDir = path.join(projectRoot, '_bmad')
    return buildTree(bmadDir)
  })

  app.get<{ Params: { '*': string } }>('/api/files/*', async (request) => {
    if (!('fileStore' in app)) throw new NotFoundError('File store not available')
    const projectRoot = app.fileStore.projectRoot
    const filePath = path.join(projectRoot, '_bmad', request.params['*'])

    if (!filePath.startsWith(path.join(projectRoot, '_bmad'))) {
      throw new NotFoundError('Path traversal not allowed')
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`File not found: ${request.params['*']}`)
    }

    return { content: fs.readFileSync(filePath, 'utf-8'), path: request.params['*'] }
  })

  // Write any BMAD file
  app.put<{ Params: { '*': string }; Body: { content: string } }>(
    '/api/files/*',
    async (request) => {
      if (!('fileStore' in app)) throw new NotFoundError('File store not available')

      const projectRoot = app.fileStore.projectRoot
      const filePath = path.join(projectRoot, '_bmad', request.params['*'])

      // Path traversal protection
      const bmadRoot = path.join(projectRoot, '_bmad')
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(path.resolve(bmadRoot))) {
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
