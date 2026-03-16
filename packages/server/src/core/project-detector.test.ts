import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { detectProject } from './project-detector.js'

describe('project-detector', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('detects project with _bmad/ and module config', () => {
    const bmadDir = path.join(tmpDir, '_bmad', 'core')
    fs.mkdirSync(bmadDir, { recursive: true })
    fs.writeFileSync(path.join(bmadDir, 'config.yaml'), 'user_name: Test\n')

    const result = detectProject(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.projectRoot).toBe(tmpDir)
  })

  it('reads manifest for version and modules', () => {
    const bmadDir = path.join(tmpDir, '_bmad')
    const coreDir = path.join(bmadDir, 'core')
    const configDir = path.join(bmadDir, '_config')
    fs.mkdirSync(coreDir, { recursive: true })
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(path.join(coreDir, 'config.yaml'), 'user_name: Test\n')
    fs.writeFileSync(
      path.join(configDir, 'manifest.yaml'),
      `installation:\n  version: 6.2.0\nmodules:\n  - name: core\n    version: 6.2.0\n    source: built-in\nides:\n  - claude-code\n`,
    )

    const result = detectProject(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.bmadVersion).toBe('6.2.0')
    expect(result!.versionSupported).toBe(true)
    expect(result!.modules).toHaveLength(1)
    expect(result!.modules[0].name).toBe('core')
    expect(result!.ideDirectories).toEqual(['claude-code'])
  })

  it('scans upward from subdirectory', () => {
    const bmadDir = path.join(tmpDir, '_bmad', 'core')
    fs.mkdirSync(bmadDir, { recursive: true })
    fs.writeFileSync(path.join(bmadDir, 'config.yaml'), 'user_name: Test\n')

    const subDir = path.join(tmpDir, 'deep', 'nested', 'dir')
    fs.mkdirSync(subDir, { recursive: true })

    const result = detectProject(subDir)
    expect(result).not.toBeNull()
    expect(result!.projectRoot).toBe(tmpDir)
  })

  it('returns null when no _bmad/ found', () => {
    const result = detectProject(tmpDir)
    expect(result).toBeNull()
  })

  it('returns null when _bmad/ exists but no module with config', () => {
    const bmadDir = path.join(tmpDir, '_bmad')
    fs.mkdirSync(bmadDir, { recursive: true })
    // _bmad/ exists but no module subdirectory with config.yaml

    const result = detectProject(tmpDir)
    expect(result).toBeNull()
  })

  it('warns about unsupported version', () => {
    const bmadDir = path.join(tmpDir, '_bmad')
    const coreDir = path.join(bmadDir, 'core')
    const configDir = path.join(bmadDir, '_config')
    fs.mkdirSync(coreDir, { recursive: true })
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(path.join(coreDir, 'config.yaml'), 'user_name: Test\n')
    fs.writeFileSync(
      path.join(configDir, 'manifest.yaml'),
      `installation:\n  version: 5.0.0\nmodules:\n  - name: core\n    version: 5.0.0\n    source: built-in\n`,
    )

    const result = detectProject(tmpDir)
    expect(result).not.toBeNull()
    expect(result!.bmadVersion).toBe('5.0.0')
    expect(result!.versionSupported).toBe(false)
  })
})
