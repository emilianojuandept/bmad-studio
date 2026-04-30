import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { loadModules, loadSkillIndex, loadBmadHelp } from './manifest-loader.js'
import { ManifestMissingError, ManifestParseError } from '../core/errors.js'

const CONFIG_REL = path.join('_bmad', '_config')

function repoRoot(importMetaUrl: string): string {
  let dir = path.dirname(new URL(importMetaUrl).pathname)
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json')
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
          workspaces?: unknown
          name?: string
        }
        if (pkg.workspaces || pkg.name === 'bmad-studio') return dir
      } catch {
        // continue
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return process.cwd()
}

const REPO_ROOT = repoRoot(import.meta.url)
const FIXTURE_BMAD = path.join(REPO_ROOT, 'docs', '_bmad_v6.5')
const FIXTURE_AVAILABLE = fs.existsSync(path.join(FIXTURE_BMAD, '_config', 'manifest.yaml'))

/** Wrap the v6.5 fixture in a fake project root: tmpDir/_bmad -> docs/_bmad_v6.5/. */
function linkFixture(tmpDir: string): void {
  const dest = path.join(tmpDir, '_bmad')
  try {
    fs.symlinkSync(FIXTURE_BMAD, dest)
  } catch {
    fs.cpSync(FIXTURE_BMAD, dest, { recursive: true })
  }
}

function writeConfigFile(tmpDir: string, name: string, content: string): void {
  fs.mkdirSync(path.join(tmpDir, CONFIG_REL), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, CONFIG_REL, name), content)
}

describe('v65/manifest-loader', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v65-manifest-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('loadModules', () => {
    it.skipIf(!FIXTURE_AVAILABLE)(
      'parses the v6.5 reference fixture into ModuleManifestFile (AC #1)',
      () => {
        linkFixture(tmpDir)

        const manifest = loadModules(tmpDir)

        expect(manifest.installation.version).toBe('6.5.0')
        expect(manifest.installation.installDate).toBeTruthy()
        expect(manifest.installation.lastUpdated).toBeTruthy()

        const moduleNames = manifest.modules.map((m) => m.name).sort()
        expect(moduleNames).toEqual(['bmm', 'core'])

        const core = manifest.modules.find((m) => m.name === 'core')
        expect(core).toBeDefined()
        expect(core?.version).toBe('6.5.0')
        expect(core?.source).toBe('built-in')

        expect(manifest.ides).toEqual(['claude-code'])
      },
    )

    it('throws ManifestMissingError when manifest.yaml is absent (AC #6)', () => {
      // tmpDir has no _bmad/_config/manifest.yaml
      expect(() => loadModules(tmpDir)).toThrow(ManifestMissingError)
      expect(() => loadModules(tmpDir)).toThrow(/manifest\.yaml/)
    })

    it('throws ManifestParseError on malformed YAML (AC #5)', () => {
      writeConfigFile(tmpDir, 'manifest.yaml', 'not: : valid: yaml: :\n  - [')

      expect(() => loadModules(tmpDir)).toThrow(ManifestParseError)
      try {
        loadModules(tmpDir)
      } catch (err) {
        expect(err).toBeInstanceOf(ManifestParseError)
        expect((err as ManifestParseError).code).toBe('MANIFEST_PARSE_ERROR')
        expect((err as ManifestParseError).statusCode).toBe(422)
      }
    })

    it('throws ManifestParseError when YAML parses but shape is wrong (AC #5)', () => {
      // Valid YAML, but no `installation` and no `modules` array
      writeConfigFile(tmpDir, 'manifest.yaml', 'someOtherKey: 42\n')

      expect(() => loadModules(tmpDir)).toThrow(ManifestParseError)
    })
  })

  describe('loadSkillIndex', () => {
    it.skipIf(!FIXTURE_AVAILABLE)(
      'parses skill-manifest.csv against the v6.5 fixture (AC #2)',
      () => {
        linkFixture(tmpDir)

        const skills = loadSkillIndex(tmpDir)

        expect(skills.length).toBeGreaterThan(0)
        // Every row must have all five string fields.
        for (const skill of skills) {
          expect(typeof skill.canonicalId).toBe('string')
          expect(typeof skill.name).toBe('string')
          expect(typeof skill.description).toBe('string')
          expect(typeof skill.module).toBe('string')
          expect(typeof skill.path).toBe('string')
        }

        const elicit = skills.find((s) => s.canonicalId === 'bmad-advanced-elicitation')
        expect(elicit).toBeDefined()
        expect(elicit?.module).toBe('core')
        expect(elicit?.path).toBe('_bmad/core/bmad-advanced-elicitation/SKILL.md')
      },
    )

    it.skipIf(!FIXTURE_AVAILABLE)(
      'preserves embedded commas in quoted descriptions per RFC 4180 (AC #3)',
      () => {
        linkFixture(tmpDir)

        const skills = loadSkillIndex(tmpDir)
        const elicit = skills.find((s) => s.canonicalId === 'bmad-advanced-elicitation')

        expect(elicit).toBeDefined()
        expect(elicit?.description).toContain('reconsider, refine')
      },
    )

    it('throws ManifestMissingError when skill-manifest.csv is absent (AC #6)', () => {
      expect(() => loadSkillIndex(tmpDir)).toThrow(ManifestMissingError)
      expect(() => loadSkillIndex(tmpDir)).toThrow(/skill-manifest\.csv/)
    })

    it('throws ManifestParseError on malformed CSV (AC #5)', () => {
      // A row with an unterminated quote — papaparse reports a parse error.
      writeConfigFile(
        tmpDir,
        'skill-manifest.csv',
        'canonicalId,name,description,module,path\n"unterminated,row,here\n',
      )

      expect(() => loadSkillIndex(tmpDir)).toThrow(ManifestParseError)
    })
  })

  describe('loadBmadHelp', () => {
    it.skipIf(!FIXTURE_AVAILABLE)(
      'parses bmad-help.csv with kebab-case → camelCase normalisation (AC #4)',
      () => {
        linkFixture(tmpDir)

        const rows = loadBmadHelp(tmpDir)
        expect(rows.length).toBeGreaterThan(0)

        // Spot-check that camelCase fields populate (kebab-case columns mapped).
        const firstWithAgent = rows.find((r) => r.agentName.length > 0)
        expect(firstWithAgent).toBeDefined()

        const firstWithOutputLoc = rows.find((r) => r.outputLocation.length > 0)
        expect(firstWithOutputLoc).toBeDefined()

        // Every row must expose the camelCase property keys (not kebab-case).
        const sample = rows[0]
        expect(sample).toHaveProperty('workflowFile')
        expect(sample).toHaveProperty('agentName')
        expect(sample).toHaveProperty('agentCommand')
        expect(sample).toHaveProperty('agentDisplayName')
        expect(sample).toHaveProperty('agentTitle')
        expect(sample).toHaveProperty('outputLocation')
        // And NOT the kebab-case keys.
        expect(Object.keys(sample)).not.toContain('agent-name')
        expect(Object.keys(sample)).not.toContain('workflow-file')
      },
    )

    it('returns [] when bmad-help.csv is absent (AC #6 graceful path)', () => {
      // tmpDir has no _bmad/_config/bmad-help.csv — graceful empty array.
      expect(loadBmadHelp(tmpDir)).toEqual([])
    })

    it('throws ManifestParseError when bmad-help.csv exists but is malformed (AC #5)', () => {
      writeConfigFile(
        tmpDir,
        'bmad-help.csv',
        'module,phase,name\n"unterminated, row\n',
      )

      expect(() => loadBmadHelp(tmpDir)).toThrow(ManifestParseError)
    })
  })

  describe('performance (loose CI bound)', () => {
    it.skipIf(!FIXTURE_AVAILABLE)(
      'all three loaders complete <200 ms each against the fixture (target <50 ms — AC #7)',
      () => {
        linkFixture(tmpDir)

        for (const loader of [loadModules, loadSkillIndex, loadBmadHelp]) {
          const start = performance.now()
          loader(tmpDir)
          const elapsed = performance.now() - start
          expect(elapsed).toBeLessThan(200)
        }
      },
    )
  })
})
