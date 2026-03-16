import yaml from 'js-yaml'

export type ParsedConfig = {
  [key: string]: unknown
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string; filePath: string }

export function interpolateVariables(value: unknown, variables: Record<string, string>): unknown {
  if (typeof value === 'string') {
    let result = value
    for (const [key, replacement] of Object.entries(variables)) {
      result = result.replaceAll(`{${key}}`, replacement)
    }
    return result
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateVariables(item, variables))
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = interpolateVariables(v, variables)
    }
    return result
  }
  return value
}

export function parseConfig(
  filePath: string,
  content: string,
  projectRoot: string,
): ParseResult<ParsedConfig> {
  try {
    const raw = yaml.load(content)
    if (raw === null || typeof raw !== 'object') {
      return { ok: false, error: 'Config file is empty or not an object', filePath }
    }

    const variables: Record<string, string> = {
      'project-root': projectRoot,
    }

    const data = interpolateVariables(raw, variables) as ParsedConfig
    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `YAML parse error: ${message}`, filePath }
  }
}
