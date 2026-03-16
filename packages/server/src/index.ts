import fs from 'node:fs'

import { createApp } from './app.js'
import { detectProject } from './core/project-detector.js'

const DEFAULT_PORT = 4040
const MAX_PORT_RETRIES = 10

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

  const app = await createApp({
    logger: verbose ? { level: 'debug' } : true,
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
