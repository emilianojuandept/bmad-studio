import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { buildIndex } from './index-builder.js'

describe('index-builder', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'index-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty index when _bmad/ does not exist', () => {
    const index = buildIndex(tmpDir)
    expect(index.agents).toHaveLength(0)
    expect(index.skills).toHaveLength(0)
    expect(index.workflows).toHaveLength(0)
    expect(index.configs).toHaveLength(0)
    expect(index.errors).toHaveLength(0)
  })

  it('parses config files from modules', () => {
    const moduleDir = path.join(tmpDir, '_bmad', 'bmm')
    fs.mkdirSync(moduleDir, { recursive: true })
    fs.writeFileSync(
      path.join(moduleDir, 'config.yaml'),
      `project_name: test\noutput_folder: "{project-root}/output"\n`,
    )

    const index = buildIndex(tmpDir)
    expect(index.configs).toHaveLength(1)
    expect(index.configs[0].project_name).toBe('test')
    expect(index.configs[0].output_folder).toBe(`${tmpDir}/output`)
  })

  it('parses skill files', () => {
    const skillDir = path.join(tmpDir, '_bmad', 'core', 'skills', 'test-skill')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: test-skill\ndescription: A test\n---\nContent here.\n`,
    )

    const index = buildIndex(tmpDir)
    expect(index.skills).toHaveLength(1)
    expect(index.skills[0].name).toBe('test-skill')
    expect(index.skills[0].module).toBe('core')
  })

  it('parses IDE configs', () => {
    const ideDir = path.join(tmpDir, '_bmad', '_config', 'ides')
    fs.mkdirSync(ideDir, { recursive: true })
    fs.writeFileSync(
      path.join(ideDir, 'claude-code.yaml'),
      `ide: claude-code\nconfigured_date: 2026-01-01\n`,
    )

    const index = buildIndex(tmpDir)
    expect(index.ideConfigs).toHaveLength(1)
    expect(index.ideConfigs[0].ide).toBe('claude-code')
  })

  it('collects parse errors without crashing', () => {
    const moduleDir = path.join(tmpDir, '_bmad', 'broken')
    fs.mkdirSync(moduleDir, { recursive: true })
    fs.writeFileSync(path.join(moduleDir, 'config.yaml'), 'bad: yaml: [invalid')

    const index = buildIndex(tmpDir)
    expect(index.errors.length).toBeGreaterThan(0)
    expect(index.errors[0].error).toContain('YAML parse error')
  })
})
