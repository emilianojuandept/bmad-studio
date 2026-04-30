/**
 * Drift plugin — Stories 36.2, 36.4, 36.5
 *
 * Endpoints:
 *   - `GET /api/drift` — re-scan and return `{ count, files }` (Story 36.2).
 *     Broadcasts `drift:detected` / `drift:cleared` WS events on transitions.
 *   - `POST /api/drift/conversions` — generate a unified diff + (optional)
 *     proposed override and cache it under a 5-minute TTL token (Story 36.4,
 *     ADR-10).
 *   - `GET /api/drift/conversions/:token` — retrieve a cached conversion;
 *     returns 404 with code `drift-conversion-stale` once the token expires.
 *   - `POST /api/drift/reset` — placeholder reset-to-baseline (Story 36.5).
 *     Full implementation requires installer cache access (out of scope).
 *
 * If `_bmad/_config/files-manifest.csv` is absent the GET endpoint returns
 * an empty list with a `Warning` response header (FR47).
 */

import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

import type { FastifyInstance } from 'fastify'
import { createTwoFilesPatch } from 'diff'

import { scanDrift, type DriftedFile } from '../v65/drift-detector.js'
import { AppError, ValidationError } from '../core/errors.js'

const CONVERSION_TTL_SECONDS = 300

type DriftConversion = {
  token: string
  filePath: string
  expectedHash: string
  actualHash: string
  proposedOverride?: string
  unifiedDiff: string
  ttlSeconds: number
  createdAt: number
}

function getProjectRoot(app: FastifyInstance): string | null {
  if (!('fileStore' in app)) return null
  const store = app.fileStore as { projectRoot?: string }
  return store?.projectRoot ?? null
}

function manifestExists(projectRoot: string): boolean {
  return fs.existsSync(path.join(projectRoot, '_bmad', '_config', 'files-manifest.csv'))
}

function isAutoMappable(filePath: string): boolean {
  return filePath.endsWith('.toml') || filePath.endsWith('.md')
}

export async function driftPlugin(app: FastifyInstance) {
  // Most-recent drift state (used to detect transitions for WS broadcasts)
  let lastDriftCount = 0
  let driftState: DriftedFile[] = []

  // In-memory token cache (Map preserves insertion order; we expire by TTL)
  const conversions = new Map<string, DriftConversion>()

  async function refreshDriftState(): Promise<DriftedFile[]> {
    const projectRoot = getProjectRoot(app)
    if (!projectRoot || !manifestExists(projectRoot)) {
      driftState = []
      return driftState
    }
    driftState = await scanDrift(projectRoot)
    return driftState
  }

  app.get('/api/drift', async (_request, reply) => {
    const projectRoot = getProjectRoot(app)
    if (!projectRoot) {
      return { count: 0, files: [] as DriftedFile[] }
    }

    if (!manifestExists(projectRoot)) {
      reply.header(
        'Warning',
        '199 - "files-manifest.csv absent, drift detection disabled"',
      )
      lastDriftCount = 0
      driftState = []
      return { count: 0, files: [] as DriftedFile[] }
    }

    const files = await refreshDriftState()
    const count = files.length

    if (app.ws) {
      if (count > 0 && count !== lastDriftCount) {
        app.ws.broadcast({ type: 'drift:detected', count })
      } else if (count === 0 && lastDriftCount > 0) {
        app.ws.broadcast({ type: 'drift:cleared', skillName: '' })
      }
    }
    lastDriftCount = count

    return { count, files }
  })

  // POST /api/drift/conversions { filePath } → { token, ttlSeconds }
  app.post<{ Body: { filePath?: string } }>('/api/drift/conversions', async (request) => {
    const filePath = request.body?.filePath
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('filePath is required')
    }

    const projectRoot = getProjectRoot(app)
    if (!projectRoot) {
      throw new AppError(
        'DRIFT_NO_PROJECT',
        'No project is currently loaded',
        400,
        'error',
      )
    }

    // Re-scan to confirm the file is actually drifted
    const drifted = await refreshDriftState()
    const match = drifted.find((d) => d.path === filePath)
    if (!match) {
      throw new AppError(
        'DRIFT_NOT_DETECTED',
        `File "${filePath}" is not currently drifted`,
        404,
        'warning',
      )
    }

    const absolutePath = path.join(projectRoot, '_bmad', filePath)
    const actualContent = fs.existsSync(absolutePath)
      ? fs.readFileSync(absolutePath, 'utf-8')
      : ''
    // We don't have access to the baseline content (it lives in the npm cache);
    // the diff therefore shows "current vs hash-only" — we record a header
    // that conveys the expected hash so reviewers can spot the comparison
    // basis even without baseline source.
    const baselinePlaceholder = `# baseline content not available locally\n# expected sha256: ${match.expectedHash}\n`
    const unifiedDiff = createTwoFilesPatch(
      `a/${filePath}`,
      `b/${filePath}`,
      baselinePlaceholder,
      actualContent,
      'baseline (hash only)',
      'current',
    )

    const proposedOverride = isAutoMappable(filePath) ? actualContent : undefined

    const token = crypto.randomBytes(16).toString('hex')
    const conversion: DriftConversion = {
      token,
      filePath,
      expectedHash: match.expectedHash,
      actualHash: match.actualHash,
      proposedOverride,
      unifiedDiff,
      ttlSeconds: CONVERSION_TTL_SECONDS,
      createdAt: Date.now(),
    }
    conversions.set(token, conversion)

    return { token, ttlSeconds: CONVERSION_TTL_SECONDS }
  })

  // GET /api/drift/conversions/:token → DriftConversion
  app.get<{ Params: { token: string } }>(
    '/api/drift/conversions/:token',
    async (request) => {
      const { token } = request.params
      const conversion = conversions.get(token)
      if (!conversion) {
        throw new AppError(
          'drift-conversion-stale',
          'Conversion token not found or expired',
          404,
          'warning',
        )
      }
      const expiresAt = conversion.createdAt + conversion.ttlSeconds * 1000
      if (expiresAt < Date.now()) {
        conversions.delete(token)
        throw new AppError(
          'drift-conversion-stale',
          'Conversion token has expired',
          404,
          'warning',
        )
      }
      return conversion
    },
  )

  // POST /api/drift/reset { filePath } — placeholder MVP (Story 36.5)
  app.post<{ Body: { filePath?: string } }>('/api/drift/reset', async (request) => {
    const filePath = request.body?.filePath
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('filePath is required')
    }
    return {
      ok: true,
      note: 'reset not yet implemented — restore manually from npm package',
    }
  })

}
