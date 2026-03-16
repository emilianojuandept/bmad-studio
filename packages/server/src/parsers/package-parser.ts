import yaml from 'js-yaml'

import type { Package } from '@bmad-studio/shared'

import type { ParseResult } from './config-parser.js'

export function parsePackage(filePath: string, content: string): ParseResult<Package> {
  try {
    const raw = yaml.load(content) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'Package file is empty or not an object', filePath }
    }

    const pkg: Package = {
      id: (raw.name as string) || '',
      name: (raw.name as string) || '',
      description: (raw.description as string) || '',
      version: (raw.version as string) || '0.0.0',
      platform: raw.platform as string | undefined,
      agents: (raw.agents as string[]) || [],
      skills: (raw.skills as string[]) || [],
      workflows: (raw.workflows as string[]) || [],
      templates: (raw.templates as string[]) || [],
      connections: raw.connections as string[] | undefined,
      contextTemplate: raw.context_template as string | undefined,
      filePath,
    }

    return { ok: true, data: pkg }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Package parse error: ${message}`, filePath }
  }
}
