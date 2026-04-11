import fs from 'node:fs'
import path from 'node:path'

import type { StudioSettings } from '@bmad-studio/shared'
import { createApp } from './app.js'
import { detectProject } from './core/project-detector.js'

const DEFAULT_PORT = 4040
const MAX_PORT_RETRIES = 10

/**
 * Read the settings file from the studio directory.
 * Returns null if the file doesn't exist or can't be parsed.
 */
function readSettingsFile(studioDir: string | null): StudioSettings | null {
  if (!studioDir) return null
  const settingsPath = path.join(studioDir, 'settings.json')
  if (!fs.existsSync(settingsPath)) return null
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as StudioSettings
  } catch {
    return null
  }
}

/**
 * Build Fastify logger options. When file logging is enabled in settings,
 * configures pino to write to both stdout and .bmad-studio/logs/studio.log.
 */
function buildLoggerOptions(
  settings: StudioSettings | null,
  studioDir: string | null,
  verbose: boolean,
) {
  const fileLogging = settings?.logging?.enabled && studioDir
  const level = verbose ? 'debug' : (settings?.logging?.level ?? 'info')

  if (!fileLogging) {
    // Default: stdout only (Fastify default behaviour)
    return verbose ? { level: 'debug' } : true
  }

  const logsDir = path.join(studioDir!, 'logs')
  const logFile = path.join(logsDir, 'studio.log')

  console.log(`File logging enabled — writing to ${logFile}`)

  return {
    level,
    transport: {
      targets: [
        { target: 'pino/file', level, options: { destination: 1 } }, // stdout (fd 1)
        { target: 'pino/file', level, options: { destination: logFile, mkdir: true } },
      ],
    },
  }
}

function parseArgs(args: string[]) {
  let port = DEFAULT_PORT
  let dir: string | undefined
  let verbose = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') {
      if (!args[i + 1]) {
        console.error('Error: --port requires a value')
        process.exit(1)
      }
      const parsed = parseInt(args[i + 1], 10)
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
        console.error(`Error: invalid port "${args[i + 1]}" (must be 1-65535)`)
        process.exit(1)
      }
      port = parsed
      i++
    } else if (args[i] === '--dir') {
      if (!args[i + 1]) {
        console.error('Error: --dir requires a value')
        process.exit(1)
      }
      dir = args[i + 1]
      i++
    } else if (args[i] === '--verbose') {
      verbose = true
    }
  }

  return { port, dir, verbose }
}

async function main() {
  const { port, dir, verbose } = parseArgs(process.argv.slice(2))

  const startDir = dir ?? process.cwd()
  if (dir && !fs.existsSync(dir)) {
    console.error(`Error: directory "${dir}" does not exist`)
    process.exit(1)
  }

  // Detect BMAD project
  const project = detectProject(startDir)

  if (project) {
    console.log(`BMAD project detected: ${project.projectRoot}`)
    console.log(`  Version: ${project.bmadVersion ?? 'unknown'}`)
    console.log(`  Modules: ${project.modules.map((m) => m.name).join(', ')}`)
    if (!project.versionSupported) {
      console.warn(
        `  Warning: BMAD version ${project.bmadVersion} may not be fully supported. Supported: v6.x`,
      )
    }
  } else {
    console.warn('No BMAD project found. Run from project root or use --dir /path')
    console.warn('Starting in setup mode...')
  }

  const studioDir = project ? path.join(project.projectRoot, '.bmad-studio') : null
  const settings = readSettingsFile(studioDir)
  const loggerOptions = buildLoggerOptions(settings, studioDir, verbose)

  const app = await createApp({
    logger: loggerOptions as import('fastify').FastifyServerOptions['logger'],
    project,
  })

  // Listen with port auto-increment on EADDRINUSE
  let actualPort = port
  for (let attempt = 0; attempt < MAX_PORT_RETRIES; attempt++) {
    try {
      await app.listen({ port: actualPort, host: '127.0.0.1' })
      if (actualPort !== port) {
        console.log(`Port ${port} was in use, using ${actualPort} instead`)
      }
      return
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_RETRIES - 1) {
        actualPort++
        continue
      }
      app.log.error(err)
      process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
