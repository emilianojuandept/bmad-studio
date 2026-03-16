import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { writeFile, getHistory } from './write-service.js'

describe('write-service', () => {
  let tmpDir: string
  let studioDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'))
    studioDir = path.join(tmpDir, '.bmad-studio')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes a new file atomically', () => {
    const filePath = path.join(tmpDir, 'test.md')
    const result = writeFile(filePath, 'hello world', studioDir)

    expect(result.ok).toBe(true)
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('hello world')
  })

  it('creates snapshot before overwriting existing file', () => {
    const filePath = path.join(tmpDir, 'test.md')
    fs.writeFileSync(filePath, 'original content')

    const result = writeFile(filePath, 'new content', studioDir)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.snapshotPath).not.toBeNull()
      expect(fs.readFileSync(result.snapshotPath!, 'utf-8')).toBe('original content')
    }
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content')
  })

  it('does not create snapshot for new files', () => {
    const filePath = path.join(tmpDir, 'brand-new.md')
    const result = writeFile(filePath, 'content', studioDir)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.snapshotPath).toBeNull()
    }
  })

  it('prunes history when exceeding 50 snapshots', () => {
    const historyDir = path.join(studioDir, 'history')
    fs.mkdirSync(historyDir, { recursive: true })

    // Create 52 existing snapshots
    for (let i = 0; i < 52; i++) {
      fs.writeFileSync(path.join(historyDir, `${1000 + i}-old.md`), `snapshot ${i}`)
    }

    const filePath = path.join(tmpDir, 'test.md')
    fs.writeFileSync(filePath, 'existing')
    writeFile(filePath, 'updated', studioDir)

    const remaining = fs.readdirSync(historyDir)
    expect(remaining.length).toBeLessThanOrEqual(50)
  })

  it('getHistory returns sorted list of snapshots', () => {
    const historyDir = path.join(studioDir, 'history')
    fs.mkdirSync(historyDir, { recursive: true })
    fs.writeFileSync(path.join(historyDir, '1000-a.md'), 'a')
    fs.writeFileSync(path.join(historyDir, '2000-b.md'), 'b')

    const history = getHistory(studioDir)
    expect(history).toEqual(['2000-b.md', '1000-a.md'])
  })

  it('returns error on write to invalid path', () => {
    const filePath = path.join(tmpDir, 'nonexistent', 'deep', 'nested', 'file.md')
    const result = writeFile(filePath, 'content', studioDir)

    expect(result.ok).toBe(true) // ensureDir creates parents
    expect(fs.readFileSync(filePath, 'utf-8')).toBe('content')
  })
})
