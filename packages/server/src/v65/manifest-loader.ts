/**
 * Canonical reader for BMAD v6.5 manifest files under `_bmad/_config/`.
 *
 * Implements ADR-1 (Manifest-as-Index Discovery Strategy) from
 * `_bmad-output/planning-artifacts/architecture-v65-migration.md`.
 *
 * Three readers:
 *   - `loadModules` — `_bmad/_config/manifest.yaml` (required on v6.5)
 *   - `loadSkillIndex` — `_bmad/_config/skill-manifest.csv` (required on v6.5)
 *   - `loadBmadHelp` — `_bmad/_config/bmad-help.csv` (optional; returns `[]` if absent)
 *
 * All three throw `ManifestParseError` (422) when a present file is malformed,
 * and `loadModules`/`loadSkillIndex` throw `ManifestMissingError` (422) when
 * their required file is absent.
 */

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import Papa from 'papaparse'

import type {
  BmadHelpEntry,
  ModuleManifestEntry,
  ModuleManifestFile,
  SkillManifestEntry,
} from '@bmad-studio/shared'

import { ManifestMissingError, ManifestParseError } from '../core/errors.js'

const CONFIG_DIR = ['_bmad', '_config'] as const

const MANIFEST_YAML = 'manifest.yaml'
const SKILL_MANIFEST_CSV = 'skill-manifest.csv'
const BMAD_HELP_CSV = 'bmad-help.csv'

function configPath(projectRoot: string, file: string): string {
  return path.join(projectRoot, ...CONFIG_DIR, file)
}

function readRequired(filePath: string, fileLabel: string): string {
  if (!fs.existsSync(filePath)) {
    throw new ManifestMissingError(
      `Required v6.5 manifest file is missing: ${fileLabel} at ${filePath}`,
      { expectedPath: filePath, file: fileLabel },
    )
  }
  return fs.readFileSync(filePath, 'utf-8')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Read and parse `_bmad/_config/manifest.yaml`. Returns the typed
 * `ModuleManifestFile` from `@bmad-studio/shared`.
 *
 * @throws {ManifestMissingError} when the file is absent.
 * @throws {ManifestParseError} when YAML is malformed or the parsed shape
 *   doesn't satisfy `ModuleManifestFile` (missing `installation` object or
 *   `modules` array).
 */
export function loadModules(projectRoot: string): ModuleManifestFile {
  const filePath = configPath(projectRoot, MANIFEST_YAML)
  const raw = readRequired(filePath, MANIFEST_YAML)

  let parsed: unknown
  try {
    parsed = yaml.load(raw)
  } catch (err) {
    throw new ManifestParseError(
      `Failed to parse ${MANIFEST_YAML}: ${(err as Error).message}`,
      { filePath, cause: (err as Error).message },
    )
  }

  if (!isPlainObject(parsed)) {
    throw new ManifestParseError(
      `${MANIFEST_YAML} did not parse to an object`,
      { filePath, parsedType: typeof parsed },
    )
  }

  const installation = parsed.installation
  const modules = parsed.modules
  if (!isPlainObject(installation)) {
    throw new ManifestParseError(
      `${MANIFEST_YAML} is missing required \`installation\` object`,
      { filePath },
    )
  }
  if (!Array.isArray(modules)) {
    throw new ManifestParseError(
      `${MANIFEST_YAML} is missing required \`modules\` array`,
      { filePath },
    )
  }

  return {
    installation: installation as ModuleManifestFile['installation'],
    modules: modules as ModuleManifestEntry[],
    ...(Array.isArray(parsed.ides) ? { ides: parsed.ides as string[] } : {}),
  }
}

type CsvParseSuccess<T> = { data: T[] }

function parseCsvOrThrow<T extends Record<string, string>>(
  raw: string,
  filePath: string,
  fileLabel: string,
): CsvParseSuccess<T> {
  const result = Papa.parse<T>(raw, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value, // identity — preserve embedded commas/whitespace as-is
  })

  if (result.errors.length > 0) {
    const first = result.errors[0]
    throw new ManifestParseError(
      `Failed to parse ${fileLabel}: ${first.message} (row ${first.row ?? '?'})`,
      { filePath, errors: result.errors },
    )
  }

  return { data: result.data }
}

/**
 * Read and parse `_bmad/_config/skill-manifest.csv`. Returns one
 * `SkillManifestEntry` per CSV row.
 *
 * The fixture's header is already camelCase (`canonicalId`, `name`, …) so no
 * key remapping is needed.
 *
 * @throws {ManifestMissingError} when the file is absent.
 * @throws {ManifestParseError} when the CSV is malformed.
 */
export function loadSkillIndex(projectRoot: string): SkillManifestEntry[] {
  const filePath = configPath(projectRoot, SKILL_MANIFEST_CSV)
  const raw = readRequired(filePath, SKILL_MANIFEST_CSV)
  const { data } = parseCsvOrThrow<Record<string, string>>(raw, filePath, SKILL_MANIFEST_CSV)

  return data.map((row) => ({
    canonicalId: row.canonicalId ?? '',
    name: row.name ?? '',
    description: row.description ?? '',
    module: row.module ?? '',
    path: row.path ?? '',
  }))
}

/**
 * Mapping from `bmad-help.csv` kebab-case column names to camelCase TS
 * field names. Columns already in camelCase pass through unchanged.
 *
 * Keep in sync with the table in
 * `_bmad-output/implementation-artifacts/31-2-manifest-reader.md` § Naming Conventions.
 */
const HELP_HEADER_MAP: Readonly<Record<string, keyof BmadHelpEntry>> = {
  module: 'module',
  phase: 'phase',
  name: 'name',
  code: 'code',
  sequence: 'sequence',
  'workflow-file': 'workflowFile',
  command: 'command',
  required: 'required',
  'agent-name': 'agentName',
  'agent-command': 'agentCommand',
  'agent-display-name': 'agentDisplayName',
  'agent-title': 'agentTitle',
  options: 'options',
  description: 'description',
  'output-location': 'outputLocation',
  outputs: 'outputs',
}

function emptyHelpEntry(): BmadHelpEntry {
  return {
    module: '',
    phase: '',
    name: '',
    code: '',
    sequence: '',
    workflowFile: '',
    command: '',
    required: '',
    agentName: '',
    agentCommand: '',
    agentDisplayName: '',
    agentTitle: '',
    options: '',
    description: '',
    outputLocation: '',
    outputs: '',
  }
}

/**
 * Read and parse `_bmad/_config/bmad-help.csv` if present.
 *
 * Maps kebab-case CSV columns (e.g. `workflow-file`, `agent-name`) to
 * camelCase TypeScript fields per `HELP_HEADER_MAP`.
 *
 * Returns `[]` when the file is absent — `bmad-help.csv` is optional on
 * v6.5 (graceful path; see Story 31.2 Decision Required: land vs defer).
 *
 * @throws {ManifestParseError} when an existing file fails to parse.
 */
export function loadBmadHelp(projectRoot: string): BmadHelpEntry[] {
  const filePath = configPath(projectRoot, BMAD_HELP_CSV)
  if (!fs.existsSync(filePath)) {
    return []
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data } = parseCsvOrThrow<Record<string, string>>(raw, filePath, BMAD_HELP_CSV)

  return data.map((row) => {
    const entry = emptyHelpEntry()
    for (const [csvKey, tsKey] of Object.entries(HELP_HEADER_MAP)) {
      const value = row[csvKey]
      if (typeof value === 'string') {
        entry[tsKey] = value
      }
    }
    return entry
  })
}
