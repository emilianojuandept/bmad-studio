import { describe, it, expect } from 'vitest'

import { parseConfig, interpolateVariables } from './config-parser.js'

describe('config-parser', () => {
  it('parses valid YAML config', () => {
    const content = `
project_name: test
output_folder: "{project-root}/_bmad-output"
user_name: Jonathan
`
    const result = parseConfig('config.yaml', content, '/home/user/project')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.project_name).toBe('test')
      expect(result.data.user_name).toBe('Jonathan')
    }
  })

  it('resolves {project-root} variables', () => {
    const content = `
planning_artifacts: "{project-root}/_bmad-output/planning"
output_folder: "{project-root}/_bmad-output"
`
    const result = parseConfig('config.yaml', content, '/app')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.planning_artifacts).toBe('/app/_bmad-output/planning')
      expect(result.data.output_folder).toBe('/app/_bmad-output')
    }
  })

  it('returns error for malformed YAML', () => {
    const content = `
bad: yaml: [invalid
: : :
`
    const result = parseConfig('bad.yaml', content, '/app')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('YAML parse error')
      expect(result.filePath).toBe('bad.yaml')
    }
  })

  it('returns error for empty file', () => {
    const result = parseConfig('empty.yaml', '', '/app')
    expect(result.ok).toBe(false)
  })

  it('interpolates variables in nested objects', () => {
    const result = interpolateVariables(
      { nested: { path: '{project-root}/sub' } },
      { 'project-root': '/root' },
    )
    expect(result).toEqual({ nested: { path: '/root/sub' } })
  })

  it('interpolates variables in arrays', () => {
    const result = interpolateVariables(['{project-root}/a', '{project-root}/b'], {
      'project-root': '/root',
    })
    expect(result).toEqual(['/root/a', '/root/b'])
  })
})
