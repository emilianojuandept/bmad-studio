import { describe, it, expect } from 'vitest'

import { parseIdeConfig } from './ide-config-parser.js'

describe('ide-config-parser', () => {
  it('parses valid IDE config', () => {
    const content = `
ide: claude-code
configured_date: 2026-03-17T01:03:21.264Z
last_updated: 2026-03-17T01:03:21.264Z
configuration:
  _noConfigNeeded: true
`
    const result = parseIdeConfig('claude-code.yaml', content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.ide).toBe('claude-code')
      expect(result.data.configuredDate).toBe('2026-03-17T01:03:21.264Z')
      expect(result.data.configuration._noConfigNeeded).toBe(true)
    }
  })

  it('returns error for empty file', () => {
    const result = parseIdeConfig('empty.yaml', '')
    expect(result.ok).toBe(false)
  })

  it('handles malformed YAML', () => {
    const result = parseIdeConfig('bad.yaml', 'bad: yaml: [invalid')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('IDE config parse error')
    }
  })
})
