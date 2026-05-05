import fs from 'node:fs'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'

import { NotFoundError, ValidationError } from '../core/errors.js'
import { atomicWrite } from '../core/atomic-write.js'

// ---------------------------------------------------------------------------
// Canonical section definitions
// ---------------------------------------------------------------------------

export const CANONICAL_SECTIONS: Array<{ key: string; heading: string; aliases: string[] }> = [
  { key: 'purpose', heading: 'Project Overview', aliases: ['project overview', 'purpose', 'project purpose', 'overview'] },
  { key: 'tech-stack', heading: 'Technology Stack', aliases: ['technology stack', 'tech stack', 'technologies'] },
  { key: 'architecture', heading: 'Architecture Overview', aliases: ['architecture overview', 'architecture', 'system architecture'] },
  { key: 'conventions', heading: 'Conventions', aliases: ['conventions', 'rules and conventions', 'coding conventions', 'code conventions', 'code organization', 'code org'] },
  { key: 'anti-patterns', heading: 'Anti-patterns', aliases: ['anti-patterns', 'antipatterns', 'anti patterns', 'what not to do'] },
  { key: 'known-issues', heading: 'Known Issues', aliases: ['known issues', 'known bugs', 'caveats', 'limitations'] },
  { key: 'dependencies', heading: 'External Dependencies', aliases: ['external dependencies', 'dependencies', 'integrations', 'third-party'] },
  { key: 'operational', heading: 'Operational Context', aliases: ['operational context', 'operations', 'deployment', 'environment'] },
  { key: 'adr-index', heading: 'ADR Index', aliases: ['adr index', 'adrs', 'decisions', 'architecture decision records'] },
]

export type ParsedSection = {
  key: string
  heading: string
  body: string
  present: boolean
  subsections?: ParsedSection[]
}

export type ProjectContextDocument = {
  sections: ParsedSection[]
  customSections: ParsedSection[]
  raw: string
  filePath: string | null
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function matchCanonicalKey(heading: string): string | null {
  const lower = heading.toLowerCase().trim()
  for (const def of CANONICAL_SECTIONS) {
    if (def.aliases.some((alias) => lower === alias || lower.startsWith(alias))) {
      return def.key
    }
  }
  return null
}

function parseSubsections(body: string): ParsedSection[] {
  const results: ParsedSection[] = []
  const lines = body.split('\n')
  let current: { heading: string; lines: string[] } | null = null

  for (const line of lines) {
    const h3 = /^###\s+(.+)$/.exec(line)
    if (h3) {
      if (current) results.push({ key: current.heading.toLowerCase().replace(/\s+/g, '-'), heading: current.heading, body: current.lines.join('\n').trim(), present: true })
      current = { heading: h3[1].trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) results.push({ key: current.heading.toLowerCase().replace(/\s+/g, '-'), heading: current.heading, body: current.lines.join('\n').trim(), present: true })
  return results
}

export function parseProjectContext(raw: string, filePath: string | null): ProjectContextDocument {
  const canonicalMap = new Map<string, ParsedSection>()
  for (const def of CANONICAL_SECTIONS) {
    canonicalMap.set(def.key, { key: def.key, heading: def.heading, body: '', present: false })
  }

  const customSections: ParsedSection[] = []
  const lines = raw.split('\n')

  let currentKey: string | null = null
  let currentHeading = ''
  let currentLines: string[] = []
  let isCustom = false

  function flush() {
    if (!currentHeading) return
    const body = currentLines.join('\n').trimEnd()
    if (isCustom) {
      customSections.push({
        key: currentHeading.toLowerCase().replace(/\s+/g, '-'),
        heading: currentHeading,
        body,
        present: true,
      })
    } else if (currentKey) {
      const existing = canonicalMap.get(currentKey)!
      const subsections = currentKey === 'conventions' ? parseSubsections(body) : undefined
      canonicalMap.set(currentKey, { ...existing, body, heading: currentHeading, present: true, subsections })
    }
    currentKey = null
    currentHeading = ''
    currentLines = []
    isCustom = false
  }

  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line)
    if (h2) {
      flush()
      const heading = h2[1].trim()
      const key = matchCanonicalKey(heading)
      if (key) {
        currentKey = key
        currentHeading = heading
        isCustom = false
      } else {
        currentHeading = heading
        isCustom = true
      }
    } else if (currentHeading) {
      currentLines.push(line)
    }
  }
  flush()

  return {
    sections: Array.from(canonicalMap.values()),
    customSections,
    raw,
    filePath,
  }
}

// ---------------------------------------------------------------------------
// File resolution
// ---------------------------------------------------------------------------

function findProjectContextFile(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, '_bmad-output', 'planning-artifacts', 'project-context.md'),
    path.join(projectRoot, '_bmad-output', 'project-context.md'),
    path.join(projectRoot, 'project-context.md'),
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? null
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function projectContextPlugin(app: FastifyInstance) {
  app.get('/api/project-context', async () => {
    if (!('fileStore' in app)) throw new NotFoundError('File store not available')
    const filePath = findProjectContextFile(app.fileStore.projectRoot)
    if (!filePath) {
      return { sections: CANONICAL_SECTIONS.map((d) => ({ key: d.key, heading: d.heading, body: '', present: false })), customSections: [], raw: '', filePath: null }
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    return parseProjectContext(raw, filePath)
  })

  app.put('/api/project-context', async (request) => {
    if (!('fileStore' in app)) throw new NotFoundError('File store not available')
    const { content } = request.body as { content?: string }
    if (typeof content !== 'string') throw new ValidationError('content must be a string')

    let filePath = findProjectContextFile(app.fileStore.projectRoot)
    if (!filePath) {
      const dir = path.join(app.fileStore.projectRoot, '_bmad-output', 'planning-artifacts')
      fs.mkdirSync(dir, { recursive: true })
      filePath = path.join(dir, 'project-context.md')
    }

    await atomicWrite(filePath, content)
    return { ok: true, filePath }
  })
}
