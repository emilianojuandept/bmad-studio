import fs from 'node:fs'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import type { Agent, AgentListItem } from '@bmad-studio/shared'

import { NotFoundError, ValidationError } from '../core/errors.js'
import { writeFile } from '../core/write-service.js'
import { invalidateCache } from '../v65/manifest-loader.js'

function agentToListItem(agent: Agent): AgentListItem {
  return {
    id: agent.id,
    name: agent.name,
    title: agent.title,
    icon: agent.icon,
    role: agent.role,
    module: agent.module,
    communicationStyle: agent.communicationStyle,
    skillCount: agent.skills.length,
    hasOverrides:
      agent.customizations !== undefined && Object.keys(agent.customizations).length > 0,
  }
}

function toKebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeYaml(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// BB1 fork: escape a TOML string value (basic strings, double quotes).
function tomlEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

// BB1 fork: escape a CSV field (RFC 4180).
function csvEscape(value: string): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

// BB1 fork: append a `[agents.<slug>]` section to `_bmad/config.toml` so the
// v6.5+ index-builder classifies this entity as an agent (the `agentLookup` it
// reads from config.toml). Without this entry, the agent is treated as a workflow.
function appendAgentToConfigToml(
  projectRoot: string,
  slug: string,
  fields: { module: string; name: string; title: string; icon?: string; description: string },
): void {
  const tomlPath = path.join(projectRoot, '_bmad', 'config.toml')
  if (!fs.existsSync(tomlPath)) return
  const existing = fs.readFileSync(tomlPath, 'utf-8')
  // Skip if section already exists (idempotent)
  const sectionRegex = new RegExp(`^\\[agents\\.${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'm')
  if (sectionRegex.test(existing)) return

  const lines: string[] = ['', `[agents.${slug}]`, `module = "${tomlEscape(fields.module)}"`]
  if (fields.name) lines.push(`name = "${tomlEscape(fields.name)}"`)
  if (fields.title) lines.push(`title = "${tomlEscape(fields.title)}"`)
  if (fields.icon) lines.push(`icon = "${tomlEscape(fields.icon)}"`)
  if (fields.description) lines.push(`description = "${tomlEscape(fields.description)}"`)
  const block = lines.join('\n') + '\n'
  const sep = existing.endsWith('\n') ? '' : '\n'
  fs.appendFileSync(tomlPath, sep + block, 'utf-8')
}

// BB1 fork: append a row to skill-manifest.csv. Idempotent on canonicalId.
function appendSkillManifestRow(
  projectRoot: string,
  row: { canonicalId: string; name: string; description: string; module: string; path: string },
): void {
  const csvPath = path.join(projectRoot, '_bmad', '_config', 'skill-manifest.csv')
  if (!fs.existsSync(csvPath)) return
  const existing = fs.readFileSync(csvPath, 'utf-8')
  const idRegex = new RegExp(`^"${row.canonicalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'm')
  if (idRegex.test(existing)) return
  const line = [row.canonicalId, row.name, row.description, row.module, row.path].map(csvEscape).join(',')
  const sep = existing.endsWith('\n') ? '' : '\n'
  fs.appendFileSync(csvPath, sep + line + '\n', 'utf-8')
}

// BB1 fork: copy the agent .md to `.claude/skills/<slug>/SKILL.md` so Claude
// Code can invoke it as `/<slug>` (which is what the UI's "HOW TO INVOKE"
// section promises). Without this copy, the agent is configured but not
// reachable from the IDE — the most common end-user failure mode.
function deployAgentToClaudeSkills(projectRoot: string, slug: string, sourceMdPath: string): void {
  const skillDir = path.join(projectRoot, '.claude', 'skills', slug)
  const skillFile = path.join(skillDir, 'SKILL.md')
  if (fs.existsSync(skillFile)) return // idempotent
  fs.mkdirSync(skillDir, { recursive: true })
  fs.copyFileSync(sourceMdPath, skillFile)
}

export async function agentsPlugin(app: FastifyInstance) {
  // Create a new custom agent
  app.post('/api/agents', async (request, reply) => {
    if (!('fileStore' in app)) throw new ValidationError('No project detected')

    const body = request.body as {
      name?: string
      title?: string
      icon?: string
      role?: string
      description?: string
      skills?: string[]
      module?: string
      persona?: string
    }

    const name = body.name?.trim()
    const title = (body.title?.trim() || name) ?? ''
    const icon = body.icon?.trim() || ''
    const role = body.role?.trim() || body.description?.trim() || ''
    const skills = body.skills ?? []
    const moduleName = body.module?.trim()
    const persona = body.persona?.trim() || ''

    if (!name) throw new ValidationError('Agent name is required')
    if (!moduleName) throw new ValidationError('Module is required')

    const moduleDir = path.join(app.fileStore.projectRoot, '_bmad', moduleName)
    if (!fs.existsSync(moduleDir)) throw new NotFoundError(`Module "${moduleName}" not found`)

    const agentsDir = path.join(moduleDir, 'agents')
    const slug = toKebab(name)
    const filePath = path.join(agentsDir, `${slug}.md`)

    if (fs.existsSync(filePath)) throw new ValidationError(`Agent "${name}" already exists in module "${moduleName}"`)

    const lines = ['---', `name: "${escapeYaml(name)}"`, `title: "${escapeYaml(title)}"`]
    if (icon) lines.push(`icon: "${escapeYaml(icon)}"`)
    if (role) lines.push(`role: "${escapeYaml(role)}"`)
    if (skills.length > 0) {
      lines.push('skills:')
      for (const s of skills) lines.push(`  - ${s}`)
    }
    lines.push('---', '', persona || `# ${title}\n\n<!-- Add agent persona and instructions here -->`, '')

    const result = writeFile(filePath, lines.join('\n'), app.fileStore.studioDir)
    if (!result.ok) throw new ValidationError(result.error)

    app.fileStore.rebuild()

    // BB1 fork: register the agent in skill-manifest.csv + config.toml so the
    // v6.5+ index-builder classifies it as an agent (not a workflow). Without
    // these two writes, POST /api/agents wrote the .md file successfully but
    // /api/agents returned empty because no manifest row existed, and even if
    // one existed the missing [agents.<slug>] section meant it'd be classified
    // as workflow rather than agent.
    const relPath = path.relative(app.fileStore.projectRoot, filePath)
    appendSkillManifestRow(app.fileStore.projectRoot, {
      canonicalId: slug,
      name: slug,
      description: role,
      module: moduleName,
      path: relPath,
    })
    appendAgentToConfigToml(app.fileStore.projectRoot, slug, {
      module: moduleName,
      name,
      title,
      icon: icon || undefined,
      description: role,
    })
    deployAgentToClaudeSkills(app.fileStore.projectRoot, slug, filePath)
    invalidateCache(app.fileStore.projectRoot)

    reply.code(201)
    return { ok: true, name, path: filePath }
  })

  app.get('/api/agents', async () => {
    if (!('fileStore' in app)) return []
    const index = app.fileStore.getIndex()
    return index.agents
      .filter((a) => a.name || a.title)
      .map(agentToListItem)
  })

  app.get<{ Params: { id: string } }>('/api/agents/:id', async (request) => {
    if (!('fileStore' in app)) {
      throw new NotFoundError('File store not available')
    }
    const index = app.fileStore.getIndex()
    const agent = index.agents.find((a) => a.id === request.params.id)
    if (!agent) {
      throw new NotFoundError(`Agent "${request.params.id}" not found`)
    }
    return agent
  })

  // Update agent file content directly (for custom agents)
  app.put<{ Params: { id: string }; Body: { content: string } }>(
    '/api/agents/:id',
    async (request) => {
      if (!('fileStore' in app)) {
        throw new NotFoundError('File store not available')
      }

      const index = app.fileStore.getIndex()
      const agent = index.agents.find((a) => a.id === request.params.id)
      if (!agent) {
        throw new NotFoundError(`Agent "${request.params.id}" not found`)
      }

      const { content } = request.body as { content: string }
      if (typeof content !== 'string') {
        throw new ValidationError('Content must be a string')
      }

      if (!fs.existsSync(agent.filePath)) {
        throw new NotFoundError(`Agent file not found: ${agent.filePath}`)
      }

      app.fileStore.markPendingWrite(agent.filePath)
      const result = writeFile(agent.filePath, content, app.fileStore.studioDir)
      app.fileStore.clearPendingWrite(agent.filePath)

      if (!result.ok) {
        throw new ValidationError(result.error)
      }

      return { ok: true, filePath: result.filePath }
    },
  )

  // Write agent override file
  app.put<{ Params: { id: string }; Body: { content: string } }>(
    '/api/agents/:id/override',
    async (request) => {
      if (!('fileStore' in app)) {
        throw new NotFoundError('File store not available')
      }

      const index = app.fileStore.getIndex()
      const agent = index.agents.find((a) => a.id === request.params.id)
      if (!agent) {
        throw new NotFoundError(`Agent "${request.params.id}" not found`)
      }

      const { content } = request.body as { content: string }
      if (typeof content !== 'string') {
        throw new ValidationError('Content must be a string')
      }

      const overridePath = path.join(
        app.fileStore.projectRoot,
        '_bmad',
        '_config',
        'agents',
        `${agent.id}.customize.yaml`,
      )

      app.fileStore.markPendingWrite(overridePath)
      const result = writeFile(overridePath, content, app.fileStore.studioDir)
      app.fileStore.clearPendingWrite(overridePath)

      if (!result.ok) {
        throw new ValidationError(result.error)
      }

      return { ok: true, filePath: result.filePath }
    },
  )

  // Update agent skills
  app.put<{ Params: { id: string }; Body: { skills: string[] } }>(
    '/api/agents/:id/skills',
    async (request) => {
      if (!('fileStore' in app)) {
        throw new NotFoundError('File store not available')
      }

      const index = app.fileStore.getIndex()
      const agent = index.agents.find((a) => a.id === request.params.id)
      if (!agent) {
        throw new NotFoundError(`Agent "${request.params.id}" not found`)
      }

      const { skills } = request.body as { skills: string[] }
      if (!Array.isArray(skills)) {
        throw new ValidationError('Skills must be an array')
      }

      // Read the agent source file
      if (!fs.existsSync(agent.filePath)) {
        throw new NotFoundError(`Agent file not found: ${agent.filePath}`)
      }

      let source = fs.readFileSync(agent.filePath, 'utf-8')

      // Replace the skills section in the markdown
      // Look for a skills list pattern and replace it
      const skillsYaml = skills.map((s) => `  - ${s}`).join('\n')
      const skillsPattern = /^(skills:\s*\n)((?:\s+-\s+.+\n)*)/m
      if (skillsPattern.test(source)) {
        source = source.replace(skillsPattern, `$1${skillsYaml ? skillsYaml + '\n' : ''}`)
      } else {
        // No skills: block in frontmatter — insert before the closing ---
        const closingFm = source.indexOf('\n---')
        if (closingFm !== -1) {
          const block = skillsYaml ? `\nskills:\n${skillsYaml}` : `\nskills:`
          source = source.slice(0, closingFm) + block + source.slice(closingFm)
        }
      }

      app.fileStore.markPendingWrite(agent.filePath)
      const result = writeFile(agent.filePath, source, app.fileStore.studioDir)
      app.fileStore.clearPendingWrite(agent.filePath)

      if (!result.ok) {
        throw new ValidationError(result.error)
      }

      return { ok: true, skills }
    },
  )
}
