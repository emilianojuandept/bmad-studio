import yaml from 'js-yaml'

import type { ParseResult } from './config-parser.js'

export type IdeConfig = {
  ide: string
  configuredDate: string | null
  lastUpdated: string | null
  configuration: Record<string, unknown>
}

function toDateString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return null
}

export function parseIdeConfig(filePath: string, content: string): ParseResult<IdeConfig> {
  try {
    const raw = yaml.load(content) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'IDE config file is empty or not an object', filePath }
    }

    const config: IdeConfig = {
      ide: (raw.ide as string) || '',
      configuredDate: toDateString(raw.configured_date),
      lastUpdated: toDateString(raw.last_updated),
      configuration: (raw.configuration as Record<string, unknown>) || {},
    }

    return { ok: true, data: config }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `IDE config parse error: ${message}`, filePath }
  }
}
