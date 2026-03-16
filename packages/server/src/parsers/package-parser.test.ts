import { describe, it, expect } from 'vitest'

import { parsePackage } from './package-parser.js'

describe('package-parser', () => {
  it('parses valid package YAML', () => {
    const content = `
name: test-package
description: A test package
version: 1.0.0
agents:
  - agents/analyst.md
skills:
  - skills/research.md
workflows:
  - workflows/create-prd/
templates:
  - templates/prd-template.md
`
    const result = parsePackage('package.yaml', content)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('test-package')
      expect(result.data.version).toBe('1.0.0')
      expect(result.data.agents).toEqual(['agents/analyst.md'])
      expect(result.data.skills).toEqual(['skills/research.md'])
      expect(result.data.workflows).toEqual(['workflows/create-prd/'])
      expect(result.data.templates).toEqual(['templates/prd-template.md'])
    }
  })

  it('returns error for empty file', () => {
    const result = parsePackage('empty.yaml', '')
    expect(result.ok).toBe(false)
  })
})
