#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const serverEntry = join(root, 'packages', 'server', 'dist', 'index.js')

if (!existsSync(serverEntry)) {
  console.error('BMAD Studio has not been built yet.')
  console.error('Run `npm run build` from the project root first.')
  process.exit(1)
}

const args = process.argv.slice(2)

const child = spawn('node', [serverEntry, ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
})

child.on('close', (code) => process.exit(code ?? 0))
