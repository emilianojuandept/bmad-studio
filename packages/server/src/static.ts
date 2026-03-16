import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import fastifyStatic from '@fastify/static'

import type { FastifyInstance } from 'fastify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist')

export async function registerStatic(app: FastifyInstance) {
  if (!fs.existsSync(CLIENT_DIST)) {
    app.log.warn(`Client dist not found at ${CLIENT_DIST} — static serving disabled`)
    return
  }

  await app.register(fastifyStatic, {
    root: CLIENT_DIST,
    wildcard: false,
  })

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not Found' })
    }
    return reply.sendFile('index.html')
  })
}
