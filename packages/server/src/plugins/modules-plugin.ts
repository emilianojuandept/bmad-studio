import fs from 'node:fs'
import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import yaml from 'js-yaml'

import { ValidationError, ConflictError, NotFoundError } from '../core/errors.js'

type ManifestModule = {
  name: string
  version: string
  installDate: string
  lastUpdated: string
  source: string
  npmPackage: string | null
  repoUrl: string | null
}

type ManifestFile = {
  installation: { version: string; installDate: string; lastUpdated: string }
  modules: ManifestModule[]
  ides?: string[]
}

function readManifest(manifestPath: string): ManifestFile {
  const content = fs.readFileSync(manifestPath, 'utf-8')
  return yaml.load(content) as ManifestFile
}

function writeManifest(manifestPath: string, manifest: ManifestFile) {
  fs.writeFileSync(manifestPath, yaml.dump(manifest, { lineWidth: -1 }), 'utf-8')
}

const MODULE_NAME_RE = /^[a-z][a-z0-9-]*$/

export async function modulesPlugin(app: FastifyInstance) {
  app.post('/api/modules', async (request, reply) => {
    if (!('fileStore' in app)) {
      throw new ValidationError('No project detected')
    }

    const body = request.body as { name?: string; description?: string; version?: string }
    const name = body.name?.trim()

    if (!name) {
      throw new ValidationError('Module name is required')
    }
    if (!MODULE_NAME_RE.test(name)) {
      throw new ValidationError(
        'Module name must be lowercase alphanumeric with hyphens (e.g., my-module)',
      )
    }

    const bmadDir = path.join(app.fileStore.projectRoot, '_bmad')
    const moduleDir = path.join(bmadDir, name)
    const manifestPath = path.join(bmadDir, '_config', 'manifest.yaml')

    if (fs.existsSync(moduleDir)) {
      throw new ConflictError(`Module "${name}" already exists`)
    }

    // Create module directory structure
    const subdirs = ['agents', 'skills', 'workflows']
    for (const sub of subdirs) {
      fs.mkdirSync(path.join(moduleDir, sub), { recursive: true })
    }

    // Create module config.yaml
    const version = body.version?.trim() || '1.0.0'
    const configContent = [
      `# ${name} Module Configuration`,
      `# Created by BMAD Studio`,
      `# Date: ${new Date().toISOString()}`,
      '',
      `project_name: ${name}`,
    ].join('\n')
    fs.writeFileSync(path.join(moduleDir, 'config.yaml'), configContent, 'utf-8')

    // Update manifest
    if (fs.existsSync(manifestPath)) {
      const manifest = readManifest(manifestPath)
      const now = new Date().toISOString()
      manifest.modules.push({
        name,
        version,
        installDate: now,
        lastUpdated: now,
        source: 'custom',
        npmPackage: null,
        repoUrl: null,
      })
      writeManifest(manifestPath, manifest)
    }

    // Rebuild index
    app.fileStore.rebuild()

    reply.status(201)
    return { ok: true, name, path: moduleDir }
  })

  app.delete('/api/modules/:name', async (request) => {
    if (!('fileStore' in app)) {
      throw new ValidationError('No project detected')
    }

    const { name } = request.params as { name: string }
    const bmadDir = path.join(app.fileStore.projectRoot, '_bmad')
    const moduleDir = path.join(bmadDir, name)
    const manifestPath = path.join(bmadDir, '_config', 'manifest.yaml')

    // Check manifest for source
    if (fs.existsSync(manifestPath)) {
      const manifest = readManifest(manifestPath)
      const entry = manifest.modules.find((m) => m.name === name)

      if (!entry) {
        throw new NotFoundError(`Module "${name}" not found in manifest`)
      }

      if (entry.source === 'built-in') {
        throw new ValidationError(`Cannot remove built-in module "${name}"`)
      }

      // Remove from manifest
      manifest.modules = manifest.modules.filter((m) => m.name !== name)
      writeManifest(manifestPath, manifest)
    }

    // Delete module directory
    if (fs.existsSync(moduleDir)) {
      fs.rmSync(moduleDir, { recursive: true, force: true })
    }

    // Rebuild index
    app.fileStore.rebuild()

    return { ok: true, name }
  })

  // Story 12.1 + 12.2: Add/upload entities to a module
  app.post('/api/modules/:name/entities', async (request, reply) => {
    if (!('fileStore' in app)) {
      throw new ValidationError('No project detected')
    }

    const { name } = request.params as { name: string }
    const body = request.body as {
      type?: string
      name?: string
      content?: string
    }

    const entityType = body.type
    const entityName = body.name?.trim()
    const entityContent = body.content

    if (!entityType || !['agent', 'skill', 'workflow'].includes(entityType)) {
      throw new ValidationError('Entity type must be one of: agent, skill, workflow')
    }
    if (!entityName) {
      throw new ValidationError('Entity name is required')
    }

    const bmadDir = path.join(app.fileStore.projectRoot, '_bmad')
    const moduleDir = path.join(bmadDir, name)

    if (!fs.existsSync(moduleDir)) {
      throw new NotFoundError(`Module "${name}" not found`)
    }

    let filePath: string

    if (entityType === 'skill') {
      // Skills get their own directory with a SKILL.md file (matches index-builder convention)
      const sanitized = entityName.replace(/\.md$/i, '')
      const skillDir = path.join(moduleDir, 'skills', sanitized)
      fs.mkdirSync(skillDir, { recursive: true })
      filePath = path.join(skillDir, 'SKILL.md')

      if (fs.existsSync(filePath)) {
        throw new ConflictError(`Skill "${sanitized}" already exists in module "${name}"`)
      }

      const content = entityContent ?? [
        '---',
        `name: ${sanitized}`,
        'category: custom',
        'description: ""',
        '---',
        '',
        `# ${sanitized}`,
        '',
        '<!-- Add skill instructions here -->',
        '',
      ].join('\n')

      fs.writeFileSync(filePath, content, 'utf-8')
    } else if (entityType === 'workflow') {
      // Workflows get their own directory with a workflow.md file
      const sanitized = entityName.replace(/\.md$/i, '')
      const wfDir = path.join(moduleDir, 'workflows', sanitized)
      fs.mkdirSync(wfDir, { recursive: true })
      filePath = path.join(wfDir, 'workflow.md')

      if (fs.existsSync(filePath)) {
        throw new ConflictError(`Workflow "${sanitized}" already exists in module "${name}"`)
      }

      const content = entityContent ?? [
        '---',
        `name: ${sanitized}`,
        'description: ""',
        '---',
        '',
        `# ${sanitized} Workflow`,
        '',
        '## Step 1: Start',
        '',
        '<!-- Add workflow steps here -->',
        '',
      ].join('\n')

      fs.writeFileSync(filePath, content, 'utf-8')
    } else {
      // Agent: .md file in agents/ directory
      const sanitized = entityName.replace(/\.md$/i, '')
      const agentDir = path.join(moduleDir, 'agents')
      fs.mkdirSync(agentDir, { recursive: true })
      filePath = path.join(agentDir, `${sanitized}.md`)

      if (fs.existsSync(filePath)) {
        throw new ConflictError(`Agent "${sanitized}" already exists in module "${name}"`)
      }

      const content = entityContent ?? [
        '---',
        `name: ${sanitized}`,
        'title: ""',
        'description: ""',
        '---',
        '',
        `# ${sanitized}`,
        '',
        '<!-- Add agent definition here -->',
        '',
      ].join('\n')

      fs.writeFileSync(filePath, content, 'utf-8')
    }

    // Rebuild index
    app.fileStore.rebuild()

    reply.status(201)
    return { ok: true, type: entityType, name: entityName, path: filePath }
  })

  // Story 12.3: Export module manifest
  app.post('/api/modules/:name/export', async (request) => {
    if (!('fileStore' in app)) {
      throw new ValidationError('No project detected')
    }

    const { name } = request.params as { name: string }
    const bmadDir = path.join(app.fileStore.projectRoot, '_bmad')
    const manifestPath = path.join(bmadDir, '_config', 'manifest.yaml')

    if (!fs.existsSync(manifestPath)) {
      throw new NotFoundError('No manifest found')
    }

    const manifest = readManifest(manifestPath)
    const entry = manifest.modules.find((m) => m.name === name)
    if (!entry) {
      throw new NotFoundError(`Module "${name}" not found in manifest`)
    }

    const moduleDir = path.join(bmadDir, name)
    if (!fs.existsSync(moduleDir)) {
      throw new NotFoundError(`Module directory "${name}" not found`)
    }

    const index = app.fileStore.getIndex()
    const agentCount = index.agents.filter((a) => a.module === name).length
    const skillCount = index.skills.filter((s) => s.module === name).length
    const workflowCount = index.workflows.filter((w) => w.module === name).length

    // List entity names
    const agentNames = index.agents.filter((a) => a.module === name).map((a) => a.name)
    const skillNames = index.skills.filter((s) => s.module === name).map((s) => s.name)
    const workflowNames = index.workflows.filter((w) => w.module === name).map((w) => w.name)

    const exportManifest = {
      module: name,
      version: entry.version,
      source: entry.source,
      exportDate: new Date().toISOString(),
      entities: {
        agents: { count: agentCount, names: agentNames },
        skills: { count: skillCount, names: skillNames },
        workflows: { count: workflowCount, names: workflowNames },
      },
      totalEntities: agentCount + skillCount + workflowCount,
      note: 'This is a module manifest preview. Full file bundling/archiving is a future enhancement.',
    }

    return exportManifest
  })

  // Update module metadata (version, description)
  app.put<{ Params: { name: string } }>('/api/modules/:name', async (request) => {
    if (!('fileStore' in app)) {
      throw new ValidationError('No project detected')
    }

    const { name } = request.params as { name: string }
    const body = request.body as { version?: string; description?: string }

    const bmadDir = path.join(app.fileStore.projectRoot, '_bmad')
    const moduleDir = path.join(bmadDir, name)
    const configPath = path.join(moduleDir, 'config.yaml')

    if (!fs.existsSync(configPath)) {
      throw new NotFoundError(`Module "${name}" config not found`)
    }

    const configContent = fs.readFileSync(configPath, 'utf-8')
    const config = yaml.load(configContent) as Record<string, unknown>

    if (body.version !== undefined) config.version = body.version
    if (body.description !== undefined) config.description = body.description

    const updated = yaml.dump(config, { lineWidth: -1 })
    fs.writeFileSync(configPath, updated, 'utf-8')

    // Also update manifest.yaml
    const manifestPath = path.join(bmadDir, '_config', 'manifest.yaml')
    if (fs.existsSync(manifestPath)) {
      const manifest = readManifest(manifestPath)
      const mod = manifest.modules.find((m) => m.name === name)
      if (mod) {
        if (body.version !== undefined) mod.version = body.version
        mod.lastUpdated = new Date().toISOString().split('T')[0]
        writeManifest(manifestPath, manifest)
      }
    }

    app.fileStore.rebuild()
    return { ok: true, name }
  })

  app.get('/api/modules', async () => {
    if (!('fileStore' in app)) {
      return []
    }

    const bmadDir = path.join(app.fileStore.projectRoot, '_bmad')
    const manifestPath = path.join(bmadDir, '_config', 'manifest.yaml')

    if (!fs.existsSync(manifestPath)) {
      return []
    }

    const manifest = readManifest(manifestPath)
    const index = app.fileStore.getIndex()

    return manifest.modules.map((m) => {
      const moduleAgents = index.agents.filter((a) => a.module === m.name)
      const moduleSkills = index.skills.filter((s) => s.module === m.name)
      const moduleWorkflows = index.workflows.filter((w) => w.module === m.name)
      const moduleTeams = index.teams.filter((t) => t.module === m.name)
      return {
        ...m,
        agentCount: moduleAgents.length,
        skillCount: moduleSkills.length,
        workflowCount: moduleWorkflows.length,
        teamCount: moduleTeams.length,
        agents: moduleAgents.map((a) => ({ id: a.id, name: a.name, title: a.title })),
        skills: moduleSkills.map((s) => ({ id: s.id, name: s.name })),
        workflows: moduleWorkflows.map((w) => ({ id: w.id, name: w.name })),
        teams: moduleTeams.map((t) => ({ id: t.id, name: t.name })),
      }
    })
  })
}
