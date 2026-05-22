/**
 * E46 Story 46.1 — Drift detector: SHA-256 scan vs `files-manifest.csv`.
 *
 * Reads `_bmad/_config/files-manifest.csv` and compares the expected hash in
 * each row to the actual SHA-256 of the corresponding file on disk.
 * Returns a list of `DriftedFile` records for files that differ.
 *
 * - Files listed in the manifest but absent on disk are treated as drifted.
 * - Files NOT listed in the manifest are ignored.
 * - `files-manifest.csv` absent → returns `[]` (drift detection disabled).
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import Papa from 'papaparse'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriftedFile = {
  /** Path relative to `_bmad/` as stored in the manifest. */
  relativePath: string
  /** Absolute path on disk. */
  absolutePath: string
  /** SHA-256 hex from the manifest. */
  expectedHash: string
  /** SHA-256 hex of the file as found on disk, or `null` if missing. */
  actualHash: string | null
}

// ---------------------------------------------------------------------------
// Internal CSV row shape
// ---------------------------------------------------------------------------

type FilesManifestRow = {
  type: string
  name: string
  module: string
  path: string
  hash: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BMAD_DIR = '_bmad'
const CONFIG_DIR = path.join(BMAD_DIR, '_config')
const FILES_MANIFEST_CSV = 'files-manifest.csv'

function filesManifestPath(projectRoot: string): string {
  return path.join(projectRoot, CONFIG_DIR, FILES_MANIFEST_CSV)
}

function hashFile(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath)
    return crypto.createHash('sha256').update(content).digest('hex')
  } catch {
    return null
  }
}

function parseFilesManifest(projectRoot: string): FilesManifestRow[] | null {
  const csvPath = filesManifestPath(projectRoot)
  if (!fs.existsSync(csvPath)) return null

  const raw = fs.readFileSync(csvPath, 'utf-8')
  const result = Papa.parse<FilesManifestRow>(raw, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => v,
  })
  if (result.errors.length > 0 || !result.data.length) return null
  return result.data
}

// ---------------------------------------------------------------------------
// BB1 fork: keep `files-manifest.csv` in sync with Studio's own writes
// ---------------------------------------------------------------------------

/**
 * BB1 fork: when Studio itself modifies a file that's tracked by
 * `files-manifest.csv` (e.g. `_config/manifest.yaml` after a module is created),
 * recompute that file's SHA-256 and update its row in the manifest CSV. Without
 * this, the drift detector keeps flagging the file as drifted forever, even
 * though the change came from Studio's own action.
 *
 * Implementation note: we deliberately do NOT round-trip the CSV through
 * Papa.parse + Papa.unparse. That re-serialization changes whitespace and
 * trailing-newline conventions in subtle ways that the upstream parser
 * (with `skipEmptyLines: true`) rejects as malformed. Instead, we do a
 * byte-preserving line-level regex replacement on the hash field of the
 * matching row, leaving every other byte of the file identical.
 *
 * `relPath` is the path relative to `_bmad/` (e.g. `_config/manifest.yaml`).
 * Returns true if the row was found and updated, false otherwise.
 */
export function syncFilesManifestRow(projectRoot: string, relPath: string): boolean {
  const csvPath = filesManifestPath(projectRoot)
  if (!fs.existsSync(csvPath)) return false

  const fileAbsolute = path.join(projectRoot, BMAD_DIR, relPath)
  const newHash = hashFile(fileAbsolute)
  if (!newHash) return false

  const raw = fs.readFileSync(csvPath, 'utf-8')

  // Find the row whose `path` column equals relPath, then rewrite the hash
  // column (last quoted field on the line) without disturbing anything else.
  // Each row format: "type","name","module","path","hash"
  const escapedPath = relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rowRegex = new RegExp(
    `^("[^"]*","[^"]*","[^"]*","${escapedPath}",")[0-9a-f]+(")$`,
    'm',
  )

  if (!rowRegex.test(raw)) return false

  const updated = raw.replace(rowRegex, `$1${newHash}$2`)
  if (updated === raw) return false // hash already up-to-date

  fs.writeFileSync(csvPath, updated, 'utf-8')
  return true
}

// ---------------------------------------------------------------------------
// BB1 fork: IDE-target fallback (BMAD v6.7 layout)
// ---------------------------------------------------------------------------

/**
 * BB1 fork patch: BMAD v6.7 installer deploys skill source files only to
 * `.claude/skills/<skill-name>/...`, not to `_bmad/<module>/<phase>/<skill-name>/...`
 * as the manifest expects. The drift detector therefore reports ~200+ false
 * positives on a vanilla install.
 *
 * For each manifest path (e.g. `bmm/4-implementation/bmad-create-story/SKILL.md`),
 * walk the segments and try to find a matching dir under `.claude/skills/`.
 * Skill names like `bmad-create-story` are top-level dirs there, and the suffix
 * (anything after the skill-name segment) preserves nested files like
 * `templates/template.md`.
 *
 * Returns the alternative absolute path if a matching skill dir exists in
 * `.claude/skills/`, or `null` if no fallback is plausible.
 */
function findIdeAlternativePath(relPath: string, projectRoot: string): string | null {
  const segments = relPath.split('/')
  const claudeSkillsRoot = path.join(projectRoot, '.claude', 'skills')
  if (!fs.existsSync(claudeSkillsRoot)) return null
  for (let i = 0; i < segments.length - 1; i++) {
    const candidateSkillDir = path.join(claudeSkillsRoot, segments[i])
    if (fs.existsSync(candidateSkillDir) && fs.statSync(candidateSkillDir).isDirectory()) {
      const suffix = segments.slice(i + 1).join('/')
      return path.join(candidateSkillDir, suffix)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a drift scan for a v6.5 project root.
 *
 * @returns `null` when `files-manifest.csv` is absent (detection disabled).
 * @returns Array of `DriftedFile` records (may be empty if no drift).
 */
export function scanDrift(projectRoot: string): DriftedFile[] | null {
  const rows = parseFilesManifest(projectRoot)
  if (rows === null) return null

  const drifted: DriftedFile[] = []

  for (const row of rows) {
    const { path: relPath, hash: expectedHash } = row
    if (!relPath || !expectedHash) continue

    // paths in the manifest are relative to _bmad/ e.g. "bmm/skill.md" or "_config/manifest.yaml"
    const absolutePath = path.join(projectRoot, BMAD_DIR, relPath)
    let actualHash = hashFile(absolutePath)

    // BB1 fork: if the file isn't where the manifest expects, look at the IDE
    // deploy target (`.claude/skills/<skill-name>/...`). On BMAD v6.7 the
    // installer puts source files there, not under `_bmad/<mod>/...`, so the
    // manifest's expected hash should be compared against the IDE copy.
    if (actualHash !== expectedHash) {
      const altPath = findIdeAlternativePath(relPath, projectRoot)
      if (altPath) {
        const altHash = hashFile(altPath)
        if (altHash === expectedHash) {
          continue // file present at IDE location with matching hash — not drifted
        }
      }
    }

    if (actualHash !== expectedHash) {
      drifted.push({ relativePath: relPath, absolutePath, expectedHash, actualHash })
    }
  }

  return drifted
}
