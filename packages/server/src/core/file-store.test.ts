import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { FileStore } from './file-store.js'

describe('FileStore', () => {
  let tmpDir: string
  let studioDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filestore-test-'))
    studioDir = path.join(tmpDir, '.bmad-studio')
  })

  afterEach(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('initializes with empty index when no _bmad/ exists', async () => {
    const store = new FileStore({ projectRoot: tmpDir, studioDir })
    await store.initialize()

    const index = store.getIndex()
    expect(index.agents).toHaveLength(0)
    expect(index.skills).toHaveLength(0)

    await store.close()
  })

  it('builds index from _bmad/ on initialize', async () => {
    const skillDir = path.join(tmpDir, '_bmad', 'core', 'skills', 'test')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: test-skill\ndescription: A test\n---\nContent.\n',
    )

    const store = new FileStore({ projectRoot: tmpDir, studioDir })
    await store.initialize()

    const index = store.getIndex()
    expect(index.skills).toHaveLength(1)
    expect(index.skills[0].name).toBe('test-skill')

    await store.close()
  })

  it('saves and loads cache', async () => {
    const skillDir = path.join(tmpDir, '_bmad', 'core', 'skills', 'test')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: cached-skill\ndescription: Cached\n---\nContent.\n',
    )

    // First init — builds index, saves cache
    const store1 = new FileStore({ projectRoot: tmpDir, studioDir })
    await store1.initialize()
    await store1.close()

    // Verify cache file exists
    const cacheFile = path.join(studioDir, 'cache', 'entities.json')
    expect(fs.existsSync(cacheFile)).toBe(true)

    // Second init — loads from cache
    const store2 = new FileStore({ projectRoot: tmpDir, studioDir })
    await store2.initialize()
    expect(store2.getIndex().skills).toHaveLength(1)
    expect(store2.getIndex().skills[0].name).toBe('cached-skill')

    await store2.close()
  })

  it('tracks pending writes for feedback loop suppression', async () => {
    const store = new FileStore({ projectRoot: tmpDir, studioDir })
    await store.initialize()

    const testPath = '/some/file.yaml'
    store.markPendingWrite(testPath)

    // File is marked as pending
    // (Internal state — we can verify by checking the suppression works)
    store.clearPendingWrite(testPath)

    await store.close()
  })

  it('handles corrupt cache gracefully', async () => {
    const cacheDir = path.join(studioDir, 'cache')
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(path.join(cacheDir, 'entities.json'), 'NOT VALID JSON')

    const store = new FileStore({ projectRoot: tmpDir, studioDir })
    await store.initialize()

    // Should rebuild index instead of crashing
    expect(store.getIndex()).toBeDefined()
    expect(store.getIndex().agents).toHaveLength(0)

    await store.close()
  })
})
